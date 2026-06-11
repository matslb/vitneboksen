# VideoWorker

Containerized video processor that replaced the `FfmpegFunction` Azure Function app.
One image, two behaviors selected by the `JOB_MODE` env var:

- `encode` — drains `video-encoding-requests`; encodes each uploaded clip (1920×1080/30fps,
  H.264 CRF 23, AAC, loudnorm), burns in the subtitle, generates the GIF preview, and moves
  the result into the session container.
- `finalvideo` — drains `final-video-requests`; builds `final.mp4` from intro (session-name
  overlay), clips with timestamped transitions, and outro.

In Azure each queue triggers a Container Apps job (KEDA `azure-queue` scaler, scale-to-zero);
see `infrastructure/main.bicep`. An execution processes messages until its queue is empty,
then exits. A message that fails is retried after the visibility timeout (15 min encode /
45 min final); when `DequeueCount` exceeds the limit (3 encode / 2 final) the failure path
runs: encode moves the source to the `failed` container and updates `failedVideoIds`;
finalvideo sets the session's Firebase status to `failed` (surfaced in the UI with a retry
button).

Cancel semantics: the finalvideo worker only processes a message if the session's Firebase
status is still `started`. Resetting the status (e.g. via the force-update endpoint) cancels
a pending request.

## Configuration (env vars)

| Variable | Value |
| --- | --- |
| `JOB_MODE` | `encode` or `finalvideo` |
| `StorageConnectionString` | Storage account connection string (`UseDevelopmentStorage=true` for Azurite) |
| `FireSharp__AuthSecret` | Firebase Realtime Database secret |
| `FireSharp__BasePath` | Firebase Realtime Database URL |

## Run locally

Requires a local ffmpeg (`brew install ffmpeg`) — `Shared.Helpers` probes
`/usr/bin`, `/usr/local/bin`, and `/opt/homebrew/bin`.

```bash
# 1. Storage emulator
docker run -d --name azurite -p 10000:10000 -p 10001:10001 mcr.microsoft.com/azure-storage/azurite

# 2. Seed the resource container with intro/outro/transition (repo root has the assets)
#    e.g. with Azure Storage Explorer or az CLI against the Azurite endpoints:
#    container 'intro' ← intro.mp4, outro.mp4, transition.mp4

# 3. Run the API against Azurite and upload a clip / start a final video.
#    The endpoints enqueue messages on the same queues the worker reads.

# 4. Drain a queue once
JOB_MODE=encode \
StorageConnectionString="UseDevelopmentStorage=true" \
FireSharp__AuthSecret=<dev-secret> \
FireSharp__BasePath=<dev-db-url> \
dotnet run --project Api/VideoWorker
```

You can also enqueue messages by hand:

```bash
az storage message put --connection-string "UseDevelopmentStorage=true" \
  -q final-video-requests --content '{"v":1,"sessionKey":"<key>"}'
```

## Container image

```bash
# Build context is Api/ so Shared/ is included
docker build -f Api/VideoWorker/Dockerfile -t video-worker Api
```

CI (`.github/workflows/build-videoworker.yml`) builds and pushes
`ghcr.io/matslb/vitneboksen/video-worker` and points both Container Apps jobs at the new
image on every change to `Api/VideoWorker/**` or `Api/Shared/**` on `master`.

The drawtext filter asks for Arial; the image installs `fonts-liberation`, and fontconfig
substitutes the metric-compatible Liberation Sans (visually verified).

## Production cutover (one-time, in order)

The old pipeline (blob-triggered `FfmpegFunction` on Windows) and this one can't both be
active, or clips would be processed twice. Cutover order:

1. **Deploy infra** — `infrastructure/README.md`. Queues are empty so the jobs stay idle.
2. **Flip GHCR package public** (GitHub → Packages → video-worker → settings), merge so CI
   pushes the image, then smoke-test with a hand-enqueued message for a throwaway session.
3. **Stop the old function app**: `az functionapp stop -g <rg> -n <ffmpeg-function-app>`.
   Uploads continue landing in `unprocessed`; they just wait.
4. **Deploy `Vitneboksen_Api` and `Vitneboksen_func`** (producers now enqueue; the func app
   also takes over the nightly `DeleteOldSessions` timer — verify `AzureWebJobsStorage` is
   configured on it).
5. **Backfill** anything from the stop window:
   ```bash
   # one encode message per leftover clip in 'unprocessed'
   az storage blob list --account-name <acct> -c unprocessed --query "[?ends_with(name,'.webm')||ends_with(name,'.mp4')].name" -o tsv |
   while read b; do az storage message put --account-name <acct> -q video-encoding-requests --content "{\"v\":1,\"blobName\":\"$b\"}"; done

   # one final-video message per leftover request blob, then delete the blob
   az storage blob list --account-name <acct> -c final-video-processing-requests --query "[].name" -o tsv |
   while read k; do
     az storage message put --account-name <acct> -q final-video-requests --content "{\"v\":1,\"sessionKey\":\"$k\"}"
     az storage blob delete --account-name <acct> -c final-video-processing-requests -n "$k"
   done
   ```
6. **Deploy the frontend** (adds the `failed` status branch).
7. **After a quiet week**, delete: the Windows function app, `Api/FfmpegFunction/`,
   `.github/workflows/master_ffmpegfunctionwindows.yml`, the
   `final-video-processing-requests` blob container + its constant, and the `ffmpeg.exe`
   blob in the `ffmpeg` container.

**Prod smoke test**: throwaway session → upload 2–3 clips (incl. one .mp4) → GIFs/counts
appear → generate final video → "Last ned Vitneboksvideo" appears → download and inspect
intro text, "kl. HH:mm" transitions, outro. Check Log Analytics for job logs and confirm
executions return to zero.
