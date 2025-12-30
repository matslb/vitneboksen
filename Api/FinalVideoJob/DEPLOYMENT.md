# FinalVideoJob Azure Deployment Guide

This guide walks you through deploying the FinalVideoJob to Azure using Azure Container Instances (ACI) orchestrated by a Logic App.

## Architecture Overview

- **FinalVideoJob**: A .NET console application that processes final videos
- **Container**: Runs in Azure Container Instances (ACI)
- **Orchestration**: Azure Logic App polls a storage queue and manages ACI containers
- **Authentication**: User-Assigned Managed Identity (UAMI) for blob storage access

## Prerequisites

1. **Azure CLI** installed and logged in:
   ```bash
   az login
   az account set --subscription <your-subscription-id>
   ```

2. **Existing Azure Resources**:
   - Storage Account (for blob storage and queue)
   - Resource Group

3. **GitHub Account** with repository access

4. **.NET 8.0 SDK** installed (for local testing, not required for CI/CD)

## Step 1: Set Up GitHub Actions (Automated Build)

The Docker image is automatically built and pushed to GitHub Container Registry (ghcr.io) when you push code to GitHub.

### 1.1 Verify GitHub Actions Workflow

The workflow file `.github/workflows/build-finalvideo-job.yml` is already configured. It will:
- Trigger on push to `main` branch when `Api/FinalVideoJob/**` or `Api/Shared/**` changes
- Build the .NET application
- Create a Docker image
- Push to `ghcr.io/<your-github-username>/<your-repo-name>/finalvideo-worker:latest`

### 1.2 Push Code to Trigger Build

```bash
git add .
git commit -m "Add FinalVideoJob deployment"
git push origin main
```

### 1.3 Verify Image Build

1. Go to your GitHub repository
2. Click on **Actions** tab
3. Verify the workflow "Build and Push FinalVideoJob Docker Image" runs successfully
4. Go to **Packages** (right sidebar) to see the `finalvideo-worker` package
5. The image will be **private** by default

### 1.4 Manual Build (Optional - for local testing)

If you need to build locally for testing:

```bash
cd Api/FinalVideoJob
chmod +x build-docker.sh
./build-docker.sh latest
# This builds locally but doesn't push anywhere
```

## Step 2: Prepare Infrastructure Deployment

### 2.1 Navigate to infrastructure directory
```bash
cd ../../infrastructure
```

### 2.2 Create parameters file
```bash
cp parameters.json.example parameters.json
```

### 2.3 Edit parameters.json with your values:
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storageAccountName": {
      "value": "yourstorageaccount"  // Your existing storage account name
    },
    "resourceGroupName": {
      "value": "your-resource-group"  // Target resource group
    },
    "acrLoginServer": {
      "value": "ghcr.io"  // GitHub Container Registry
    },
    "containerImageName": {
      "value": "ghcr.io/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/finalvideo-worker:latest"  // Full image path
    },
    "firebaseAuthSecret": {
      "value": "your-firebase-auth-secret"  // Firebase auth secret
    },
    "firebaseBasePath": {
      "value": "https://your-firebase-project.firebaseio.com"  // Firebase base path
    },
    "blobEndpoint": {
      "value": "https://yourstorageaccount.blob.core.windows.net"  // Blob storage endpoint
    },
    "location": {
      "value": "westeurope"  // Azure region
    }
  }
}
```

**Important**: 
- Replace `YOUR_GITHUB_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name
- Get the `blobEndpoint` from your storage account:
  ```bash
  az storage account show --name <your-storage-account> --resource-group <your-resource-group> --query "primaryEndpoints.blob" -o tsv
  ```

## Step 3: Deploy Infrastructure

### 3.1 Deploy Bicep template
```bash
az deployment group create \
  --resource-group <your-resource-group> \
  --template-file main.bicep \
  --parameters @parameters.json
```

This creates:
- Storage Queue: `final-video-processing-requests`
- User-Assigned Managed Identity: `uami-finalvideo-worker`
- Logic App: `la-finalvideo-orchestrator`
- Role assignments for blob storage access

### 3.2 Note the outputs
After deployment, note these values from the output:
- `uamiId`: User-Assigned Managed Identity resource ID
- `uamiClientId`: UAMI client ID
- `logicAppName`: Logic App name

## Step 4: Create GitHub Personal Access Token

To pull the private Docker image from GitHub Container Registry, Azure needs authentication.

### 4.1 Create Personal Access Token

1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token** → **Generate new token (classic)**
3. Give it a descriptive name: `Azure FinalVideoJob Pull`
4. Select expiration (recommended: 90 days or custom)
5. **Select scope**: Check `read:packages` (this allows reading packages from GitHub Container Registry)
6. Click **Generate token**
7. **Copy the token immediately** - you won't be able to see it again!

### 4.2 Store Token Securely

Keep this token safe. You'll need it in Step 5.3 when configuring the Logic App.

## Step 5: Configure Logic App

### 5.1 Open Logic App in Azure Portal
1. Go to Azure Portal → Resource Groups → `<your-resource-group>`
2. Open the Logic App: `la-finalvideo-orchestrator`

### 5.2 Configure API Connections

#### Configure Azure Queues connection:
1. Go to **Logic App** → **API connections**
2. Find `azurequeues` connection
3. Click **Edit API connection**
4. Select your storage account
5. Click **Save**

#### Configure Azure Container Instances connection:
1. Find `azurecontainerinstances` connection
2. Click **Edit API connection**
3. Choose **Use managed identity** (system-assigned)
4. Click **Save**

### 5.3 Import Logic App Workflow

1. In the Logic App, go to **Logic app designer**
2. Click **Code view** (top right)
3. Open `logic-app-workflow.json` from the infrastructure directory
4. Copy the entire JSON content
5. Paste it into the Code view editor
6. **Update the parameters section** with actual values:
   - `acrLoginServer`: `ghcr.io` (not used but kept for compatibility)
   - `containerImageName`: `ghcr.io/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/finalvideo-worker:latest`
   - `githubUsername`: Your GitHub username
   - `githubToken`: The Personal Access Token from Step 4.1 (mark as secure/secret)
   - `storageAccountName`: Your storage account name
   - `resourceGroupName`: Your resource group name
   - `uamiResourceId`: The `uamiId` from Step 3.2 output
   - `blobEndpoint`: Your blob endpoint (e.g., `https://yourstorageaccount.blob.core.windows.net`)
   - `firebaseAuthSecret`: Your Firebase auth secret (as securestring)
   - `firebaseBasePath`: Your Firebase base path
7. Click **Save**

**Note**: The `githubToken` parameter should be marked as a secure string in the Logic App. When editing in Code view, ensure it's defined as `"type": "securestring"` in the parameters section.

### 5.4 Configure Concurrency

1. In Logic App designer, click on the trigger: **"When a message is received in a queue"**
2. Click **...** (three dots) → **Settings**
3. Enable **Concurrency Control**
4. Set **Degree of Parallelism** to `1` (process one job at a time)
5. Click **Save**

### 5.5 Enable the Logic App

1. In the Logic App overview page
2. Click **Enable** (if not already enabled)

## Step 6: Verify Deployment

### 6.1 Check Storage Queue
```bash
az storage queue list \
  --account-name <your-storage-account> \
  --connection-string <your-connection-string> \
  --query "[?name=='final-video-processing-requests']"
```

### 6.2 Check Managed Identity
```bash
az identity show \
  --name uami-finalvideo-worker \
  --resource-group <your-resource-group>
```

### 6.3 Test the deployment

You can test by sending a message to the queue:

```bash
# Get storage connection string
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name <your-storage-account> \
  --resource-group <your-resource-group> \
  --query connectionString -o tsv)

# Create a test message
MESSAGE='{"sessionKey":"test-session-123","requestId":"test-request-456"}'
MESSAGE_BASE64=$(echo -n "$MESSAGE" | base64)

# Send message to queue
az storage message put \
  --queue-name final-video-processing-requests \
  --content "$MESSAGE_BASE64" \
  --connection-string "$STORAGE_CONNECTION_STRING"
```

Then check the Logic App runs in Azure Portal to see if it processes the message.

## Step 7: Monitor and Troubleshoot

### 7.1 Monitor Logic App runs
- Azure Portal → Logic App → **Runs history**
- Check for successful/failed runs
- View run details to see execution steps

### 7.2 Monitor Container Instances
```bash
az container list \
  --resource-group <your-resource-group> \
  --query "[?contains(name, 'finalvideo-job')]"
```

### 7.3 View container logs
```bash
az container logs \
  --name finalvideo-job-<sessionKey> \
  --resource-group <your-resource-group>
```

### 7.4 Common Issues

**Issue**: Container fails to start with authentication error
- Verify GitHub Personal Access Token is correct and has `read:packages` scope
- Check that the token hasn't expired
- Ensure `githubUsername` parameter matches your GitHub username exactly
- Verify the image path in `containerImageName` matches the actual package name
- Check that the package is private (if it's public, you don't need credentials, but the workflow expects them)

**Issue**: Container fails to pull image
- Verify the Docker image exists in GitHub Packages
- Check the image path format: `ghcr.io/username/repo-name/finalvideo-worker:latest`
- Ensure the GitHub PAT has access to the repository/package
- Check Logic App run history for detailed error messages

**Issue**: Container can't access blob storage
- Verify UAMI is assigned to the container group
- Check role assignments on storage account
- Verify `BLOB_ENDPOINT` environment variable

**Issue**: Logic App fails to create container
- Check Logic App has Contributor role on resource group
- Verify API connections are configured correctly
- Check Logic App system-assigned identity permissions
- Review Logic App run history for specific error messages

## How It Works

1. **Code Push**: Developer pushes code to GitHub
2. **GitHub Actions**: Automatically builds .NET app and Docker image, pushes to GitHub Container Registry (private)
3. **Trigger**: API endpoint (`StartFinalVideoProcessing`) sends a message to the storage queue
4. **Logic App**: Polls the queue every 10 seconds
5. **Container Creation**: Logic App creates an ACI container with:
   - The Docker image from GitHub Container Registry (authenticated with PAT)
   - Environment variables (SESSION_KEY, BLOB_ENDPOINT, Firebase config)
   - User-Assigned Managed Identity for blob access
6. **Processing**: Container runs FinalVideoJob, processes the video
7. **Monitoring**: Logic App polls container status every 10 seconds
8. **Cleanup**: After completion (success or failure), Logic App deletes the container

## Environment Variables

The container requires these environment variables:
- `SESSION_KEY`: The session key to process (from queue message)
- `BLOB_ENDPOINT`: Blob storage endpoint (e.g., `https://storageaccount.blob.core.windows.net`)
- `FireSharp__AuthSecret`: Firebase authentication secret
- `FireSharp__BasePath`: Firebase base path URL

## Updating the Deployment

### To update the container image:
1. Make changes to the code in `Api/FinalVideoJob/` or `Api/Shared/`
2. Commit and push to GitHub:
   ```bash
   git add Api/FinalVideoJob/
   git commit -m "Update FinalVideoJob"
   git push origin main
   ```
3. GitHub Actions will automatically build and push the new image
4. The Logic App will automatically use the new image on next run (pulls `latest` tag)

**Note**: If you want to use a specific version instead of `latest`, update the `containerImageName` parameter in the Logic App workflow to use a tag like `ghcr.io/username/repo/finalvideo-worker:v1.2.3`

### To update infrastructure:
1. Modify `main.bicep` or `logic-app-workflow.json`
2. Redeploy:
   ```bash
   az deployment group create \
     --resource-group <your-resource-group> \
     --template-file main.bicep \
     --parameters @parameters.json
   ```

## Cost Considerations

- **ACI**: Pay per second while container is running
- **Logic App**: Consumption plan - pay per execution
- **Storage Queue**: Minimal cost for queue operations
- **Managed Identity**: No additional cost
- **GitHub Container Registry**: Free for private packages (up to 500 MB storage, 1 GB bandwidth/month for free accounts)

The container is deleted after each job, so you only pay for actual processing time.

## Private Registry Authentication

The deployment uses GitHub Container Registry (ghcr.io) with private images. The authentication flow:

1. **GitHub Actions** uses `GITHUB_TOKEN` (automatically provided) to push images
2. **Azure Logic App** uses a Personal Access Token (PAT) stored as a secure parameter to pull images
3. **Azure Container Instances** receives registry credentials from Logic App when creating containers

**Security Best Practices**:
- Rotate the GitHub PAT periodically (recommended: every 90 days)
- Use minimal scope (`read:packages` only) for the PAT
- Never commit the PAT to version control
- Store PAT as secure parameter in Logic App (encrypted at rest)

