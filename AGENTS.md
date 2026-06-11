# AGENTS.md

Guidance for AI coding agents working in this repository. Agent-agnostic — applies to any
assistant. Keep this file up to date when structure, commands, or conventions change.

## What this project is

**Vitneboksen** ("the witness box") is a video-greeting service used at parties. Guests step
into a booth, are presented with questions, and record short video answers. Each answer is
uploaded, encoded into a standardized clip (with the question rendered as on-screen text), and
when the party ends all the clips are concatenated into a single film with an intro, outro, and
transitions between segments.

Live at <https://vitneboksen.no>. UI text and many domain terms are in **Norwegian**.

## High-level architecture

```
                        ┌─────────────────────────┐
  Guest browser ──────▶ │ AppV2 (React/Vite SPA)  │
                        └────────────┬────────────┘
                                     │ HTTPS (upload, session mgmt)
                                     ▼
                        ┌─────────────────────────┐        ┌──────────────────────────┐
                        │ Vitneboksen_Api         │───────▶│ Firebase Realtime DB      │
                        │ (ASP.NET Core 8 Web API)│        │ (session metadata/status) │
                        └────────────┬────────────┘        └──────────────────────────┘
                                     │ writes raw clip + queue message
                                     ▼
              ┌───────────────────── Azure Storage ─────────────────────┐
              │  unprocessed → (encode) → {session} → (concat) → final.mp4│
              │  queues: video-encoding-requests, final-video-requests   │
              └────────────┬───────────────────────────┬────────────────┘
                           │ KEDA queue scaler          │ KEDA queue scaler
                           ▼                            ▼
                    ┌──────────────────────────────────────────┐
                    │ VideoWorker (Azure Container Apps Jobs)   │
                    │  JOB_MODE=encode     → encode single clip │
                    │  JOB_MODE=finalvideo → concat full film   │
                    │  (scale-to-zero, parallel executions)     │
                    └──────────────────────────────────────────┘
```

The end-to-end video pipeline:

1. **Upload** — SPA posts a recording to `POST /upload-testimony/v2` on `Vitneboksen_Api`. The raw
   file lands in the `unprocessed` blob container, the question/subtitle text is stored alongside
   it, an encode message is enqueued on `video-encoding-requests`, and Firebase is updated with
   the session's clip count.
2. **Encode** — The queue message triggers a `vitneboksen-encode-job` execution (Container Apps).
   FFmpeg normalizes the clip to 1920×1080 / 30fps / H.264 + AAC, burns in the subtitle text,
   normalizes loudness, and moves the result into the session's container. After repeated failures
   the clip goes to the `failed` container.
3. **Concatenate** — When the host ends the party, a message on `final-video-requests` triggers a
   `vitneboksen-finalvideo-job` execution. It overlays text on the intro (session name) and
   transitions (timestamp), then concatenates `intro + clips + transitions + outro` into
   `final.mp4` in the session container. Failure sets Firebase status `failed` (UI shows retry).

## Repository layout

```
/
├── Api/                         # .NET solution — Vitneboksen.sln
│   ├── Vitneboksen_Api/         # ASP.NET Core 8 Web API (uploads, sessions, downloads). Runs on Linux App Service.
│   ├── VideoWorker/             # Containerized video processor (encode + final concat). Runs as Container Apps Jobs.
│   ├── Vitneboksen_func/        # Azure Functions — HTTP endpoints (alternate surface) + DeleteOldSessions timer.
│   ├── Shared/                  # Shared library: Constants, FirebaseService, Helpers, FfmpegCommandBuilder, QueueHelpers, Models.
│   └── FfmpegFunction/          # LEGACY — old Windows Functions video pipeline, replaced by VideoWorker. Delete after prod cutover.
├── AppV2/vitneboksen/           # Frontend: React 19 + TypeScript + Vite + Tailwind v4. Deployed to Firebase Hosting.
├── infrastructure/             # Azure infra as code (Bicep): ACA environment + jobs + queues. See its README.
├── intro.mp4 / outro.mp4 / transition.mp4   # Video assets uploaded to the `intro` storage container.
└── README.md / LICENSE          # CC BY-NC 4.0.
```

## Tech stack

- **Backend:** .NET 8 (`net8.0`), ASP.NET Core 8, Azure Functions Worker v4 (isolated,
  `dotnet-isolated`), plain console app for the worker. Nullable reference types and implicit usings enabled.
- **Frontend:** React 19, TypeScript ~5.8, Vite 7, Tailwind CSS v4, React Router v7, Firebase JS SDK v11.
- **Video:** FFmpeg (invoked as an external process by `VideoWorker`; installed via apt in its Docker image).
- **Cloud:** Azure Blob + Queue Storage, Azure Container Apps Jobs (KEDA queue-triggered,
  scale-to-zero video workers), Azure Functions (HTTP + timer), Firebase Realtime Database
  (session state) and Hosting (SPA). Worker image on GHCR (public).
- **Key NuGet:** `Azure.Storage.Blobs/Queues/Files.Shares`, `FireSharp` + `FirebaseAdmin`,
  `Microsoft.Azure.Functions.Worker.*`, `Swashbuckle.AspNetCore`, `Microsoft.ApplicationInsights.AspNetCore`.

## Build, run, and test

### Backend API (`Vitneboksen_Api`)

```bash
dotnet build   Api/Vitneboksen_Api
dotnet run --project Api/Vitneboksen_Api          # http://localhost:5000  (see Properties/launchSettings.json)
```

### Video worker (`VideoWorker`)

Requires a local FFmpeg (`brew install ffmpeg`) and Azurite for local queues/blobs.
Each run drains its queue and exits — see `Api/VideoWorker/README.md` for the full local flow.

```bash
JOB_MODE=encode StorageConnectionString="UseDevelopmentStorage=true" \
FireSharp__AuthSecret=<dev> FireSharp__BasePath=<dev-url> \
dotnet run --project Api/VideoWorker

# container build (context is Api/ so Shared/ is included)
docker build -f Api/VideoWorker/Dockerfile -t video-worker Api
```

### Frontend (`AppV2/vitneboksen`)

```bash
cd AppV2/vitneboksen
npm ci
npm run dev        # http://localhost:5173 (HTTPS auto-enabled if localhost+2.pem / localhost+2-key.pem exist)
npm run build      # tsc -b && vite build → dist/
npm run lint       # eslint .
```

### Tests

There are **no automated tests** in this repo (no test projects, no test runner). Verify changes by
building (`dotnet build`, `npm run build`), linting the frontend (`npm run lint`), and exercising the
relevant flow manually. If you add tests, document how to run them here.

## Configuration & secrets

**Never commit secrets.** Connection strings, Firebase auth secrets, and `local.settings.json` are
git-ignored. Use .NET user-secrets locally for the API/functions and Azurite for local storage.

Common keys (set via user-secrets, `local.settings.json`, or environment variables):

| Key | Used by | Purpose |
| --- | --- | --- |
| `StorageConnectionString` | API + functions | Azure Storage account (blobs/queues). `UseDevelopmentStorage=true` for Azurite. |
| `AzureWebJobsStorage` | functions | Functions runtime storage (same emulator value locally). |
| `FUNCTIONS_WORKER_RUNTIME` | functions | `dotnet-isolated`. |
| `FireSharp__BasePath` | API + functions | Firebase Realtime DB URL. |
| `FireSharp__AuthSecret` | API + functions | Firebase auth secret (backend access). |
| `Cors__AllowedOrigins__0..n` | API | Allowed CORS origins (`http(s)://localhost:5173` in dev, `https://vitneboksen.no` in prod). |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | API + functions | Telemetry. |
| `VITE_VIDEO_PROCESSOR_URL` | frontend | API base URL the SPA talks to (build-time). |

Set a backend secret locally, e.g.:

```bash
dotnet user-secrets set "StorageConnectionString" "<conn-string>" --project Api/Vitneboksen_Api
```

`appsettings.json` / `appsettings.Development.json` / `appsettings.Production.json` hold non-secret
config (logging, CORS origins). Infrastructure parameters live in `infrastructure/parameters.json`
(see `parameters.json.example` and `infrastructure/README.md`).

### FFmpeg

`VideoWorker` shells out to FFmpeg. In the container it's installed via apt
(`/usr/bin/ffmpeg`); locally `Shared.Helpers` probes `/usr/bin`, `/usr/local/bin`, and
`/opt/homebrew/bin` (`brew install ffmpeg`). Command construction lives in
`Api/Shared/FfmpegCommandBuilder.cs`; process execution in `Api/Shared/Helpers.cs`.

## Storage container model

- `intro` — intro/outro/transition source assets.
- `unprocessed` — raw uploads awaiting encoding.
- `{sessionKey}-{uid}` — per-session container holding encoded clips and the resulting `final.mp4`.
- `failed` — clips that failed encoding.

Work is dispatched via storage **queues**: `video-encoding-requests`
(`{"v":1,"blobName":"…"}`) and `final-video-requests` (`{"v":1,"sessionKey":"…"}`), raw JSON
encoding. (`final-video-processing-requests` is the legacy blob container used by the old
Functions pipeline; it disappears with `FfmpegFunction`.)

Container names, the per-session size limit (512 MB), and retention (~14 days) are centralized in
`Api/Shared/Constants.cs`. Encoded clip filenames encode metadata as
`{fileType}&{videoType}&{sessionKey}&{timestamp}`, parsed by
`UnEncodedFileMetaData.GetVideoFileMetaDataFromFileName()`.

## Conventions

- **C#:** nullable + implicit usings on; file-scoped namespaces; top-level statements in `Program.cs`;
  async/await with `CancellationToken` throughout; constructor DI in functions. No `.editorconfig` or
  analyzers — match the style of surrounding code.
- **Auth:** `Vitneboksen_Api` uses cookie-based auth (`userToken`) via custom middleware. Public paths:
  `/upload-testimony/v2`, `/wake-up`, `/create-session`. Other endpoints require the cookie + Firebase
  authorization and session-key validation.
- **Timezone:** timestamps are stored as UTC (`DateTimeOffset`) and rendered in Norwegian local time
  (`kl. HH:mm`) for on-screen overlays.
- **Language:** user-facing strings are Norwegian; keep new UI copy consistent.

## CI/CD

GitHub Actions in `.github/workflows/` deploy on merge to `master`:

- `master_vinteboksenapilinux.yml` — `Vitneboksen_Api` → Azure Web App (Linux).
- `master_vitneboksenfunclinux.yml` — `Vitneboksen_func` → Azure Functions (Linux).
- `build-videoworker.yml` — `VideoWorker` → GHCR image + updates both Container Apps jobs.
- `firebase-hosting-merge.yml` — `AppV2/vitneboksen` → Firebase Hosting.
- `master_ffmpegfunctionwindows.yml` — LEGACY (old Windows function app); removed after cutover.

## Key files to know

| Concern | File |
| --- | --- |
| API startup & endpoint mapping | `Api/Vitneboksen_Api/Program.cs` |
| API local run config (port 5000) | `Api/Vitneboksen_Api/Properties/launchSettings.json` |
| Worker entry + queue drain loop | `Api/VideoWorker/Program.cs` |
| Single-clip encoding | `Api/VideoWorker/EncodeJob.cs` |
| Final concatenation | `Api/VideoWorker/FinalVideoJob.cs` |
| Retention cleanup | `Api/Vitneboksen_func/DeleteOldSessionsFunction.cs` |
| FFmpeg command builder | `Api/Shared/FfmpegCommandBuilder.cs` |
| Storage/process/queue helpers | `Api/Shared/Helpers.cs`, `Api/Shared/QueueHelpers.cs` |
| Constants (containers, queues, limits) | `Api/Shared/Constants.cs` |
| Firebase integration | `Api/Shared/FirebaseService.cs` |
| Frontend API client | `AppV2/vitneboksen/src/vitneboksService.ts` |
| Infra deployment guide | `infrastructure/README.md` |
| Worker local dev + cutover guide | `Api/VideoWorker/README.md` |

## Notes for agents

- Don't commit secrets, `local.settings.json`, `infrastructure/parameters.json`, or `bin/`/`obj/` output.
- The video pipeline is asynchronous and queue-driven — a change in the API's upload path can affect
  what `VideoWorker` later receives; check both sides of the queue/storage boundary, and keep the
  queue message contracts (`Api/Shared/Models/EncodeVideoMessage.cs`, `FinalVideoRequestMessage.cs`)
  backward compatible.
- Shared models/constants live in `Api/Shared` — change them there, not in copies.
- `Api/FfmpegFunction/` is the legacy pipeline kept only until prod cutover completes; don't build
  features on it.
- There are no tests to lean on; build + lint + manual verification is the safety net.
