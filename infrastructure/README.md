# Vitneboksen infrastructure

Provisions the video-processing backend: two Azure Container Apps **jobs** (scale-to-zero,
queue-triggered via KEDA) that run the `VideoWorker` container image, plus the storage queues
they consume.

## Architecture

```
upload endpoint ──▶ queue: video-encoding-requests ──▶ vitneboksen-encode-job      (1 vCPU/2Gi, max 5 parallel)
"generate" click ─▶ queue: final-video-requests ─────▶ vitneboksen-finalvideo-job  (2 vCPU/4Gi, max 2 parallel)
```

Both jobs run the same image (`Api/VideoWorker`, built by `.github/workflows/build-videoworker.yml`);
the `JOB_MODE` env var selects encode vs final-video behavior. Each job execution drains its queue
and exits, so executions scale with queue depth and cost nothing when idle.

Resources created by `main.bicep`:

| Resource | Name | Purpose |
| --- | --- | --- |
| Storage queues | `video-encoding-requests`, `final-video-requests` | Work queues (on the existing storage account) |
| Log Analytics | `log-vitneboksen` | Job logs (30-day retention) |
| Container Apps environment | `cae-vitneboksen` | Consumption environment, scale-to-zero |
| Container Apps job | `vitneboksen-encode-job` | Per-clip encoding |
| Container Apps job | `vitneboksen-finalvideo-job` | Final video concatenation |

The jobs authenticate to storage with the account connection string (stored as a Container Apps
secret, also used by the KEDA queue scaler) and to Firebase with the auth secret.

## Prerequisites

- Azure CLI (`az login`, subscription selected)
- An existing storage account holding the blob containers and queues
- The `video-worker` image pushed to GHCR and set to **public** visibility
  (GitHub → Packages → video-worker → Package settings → Change visibility)
- Contributor on the target resource group

## Deploy

1. Copy parameters and fill in real values (this file is git-ignored — never commit it):

   ```bash
   cp parameters.json.example parameters.json
   ```

2. Deploy:

   ```bash
   az deployment group create \
     --resource-group <your-resource-group> \
     --template-file main.bicep \
     --parameters @parameters.json
   ```

No manual post-deployment steps are required (unlike the previous Logic App + ACI design,
which this replaces).

## Verify

```bash
# Jobs exist and are idle
az containerapp job list -g <rg> -o table

# Drop a test message on a queue and watch an execution start
az storage message put --account-name <account> -q final-video-requests \
  --content '{"v":1,"sessionKey":"<test-session-key>"}' --auth-mode key
az containerapp job execution list -g <rg> --name vitneboksen-finalvideo-job -o table

# Logs
az containerapp job logs show -g <rg> --name vitneboksen-finalvideo-job --container video-worker
```

## Updating the worker image

CI (`build-videoworker.yml`) builds, pushes, and points both jobs at the new image on every
change to `Api/VideoWorker/**` or `Api/Shared/**` on `master`. To do it manually:

```bash
az containerapp job update -g <rg> -n vitneboksen-encode-job --image ghcr.io/matslb/vitneboksen/video-worker:<tag>
az containerapp job update -g <rg> -n vitneboksen-finalvideo-job --image ghcr.io/matslb/vitneboksen/video-worker:<tag>
```
