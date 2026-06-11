using Azure.Storage.Blobs;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Shared;
using Shared.Models;

namespace VideoWorker;

/// <summary>
/// Encodes a single uploaded testimony: standardizes to 1920x1080/30fps H.264+AAC,
/// burns in the subtitle text, generates a GIF preview and moves the result into
/// the session container. Ported from FfmpegFunction/FormatTestimony.cs.
/// </summary>
public class EncodeJob(BlobServiceClient blobService, FirebaseService firebaseService, ILogger logger) : IQueueJob
{
    public string QueueName => Constants.EncodingQueueName;

    public TimeSpan VisibilityTimeout => TimeSpan.FromMinutes(15);

    public int MaxDequeueCount => 3;

    public async Task ProcessAsync(string messageBody, CancellationToken cancellationToken)
    {
        var message = JsonConvert.DeserializeObject<EncodeVideoMessage>(messageBody)
            ?? throw new Exception($"Could not deserialize encode message: {messageBody}");
        var blobName = message.blobName;
        var fileMetaData = UnEncodedFileMetaData.GetVideoFileMetaDataFromFileName(blobName);

        var unprocessedContainer = Helpers.GetUnprocessedContainer(blobService);
        var videofileBlobClient = unprocessedContainer.GetBlobClient(blobName);
        var subfileBlobclient = unprocessedContainer.GetBlobClient(fileMetaData.GetSubFileName());

        if (!await videofileBlobClient.ExistsAsync(cancellationToken))
        {
            logger.LogInformation("Source blob {blobName} no longer exists, dropping message", blobName);
            return;
        }

        var sessionContainer = Helpers.GetContainerBySessionKey(blobService, fileMetaData.SessionKey);
        if (sessionContainer == null)
        {
            logger.LogError("Session container {sessionKey} does not exist. Deleting unprocessed files", fileMetaData.SessionKey);
            await videofileBlobClient.DeleteIfExistsAsync();
            await subfileBlobclient.DeleteIfExistsAsync();
            return;
        }

        var tempPath = Path.Combine(Path.GetTempPath(), $"{fileMetaData.SessionKey}-{fileMetaData.Id}");
        Directory.CreateDirectory(tempPath);

        try
        {
            var videoFilePath = Path.Combine(tempPath, $"file.{fileMetaData.FileType?.ToLowerInvariant() ?? "webm"}");
            await videofileBlobClient.DownloadToAsync(videoFilePath, cancellationToken);
            var subtitleText = await GetSubtitleTextAsync(subfileBlobclient);

            var processedFileMetadata = new EncodedFileMetaData(fileMetaData.CreatedOn);
            var outputFilePath = Path.Combine(tempPath, processedFileMetadata.GetVideoFileName());

            var ffmpegCmd = FfmpegCommandBuilder.WithText(videoFilePath, subtitleText, outputFilePath, fontSize: 50, TextPlacement.Subtitle);
            var startTime = DateTime.Now;
            await Helpers.ExecuteFFmpegCommand(ffmpegCmd, 300, cancellationToken);
            logger.LogInformation("Encoding video took {time}s", (DateTime.Now - startTime).TotalSeconds);

            var fileInfo = new FileInfo(outputFilePath);
            if (fileInfo.Exists && fileInfo.Length > 0)
            {
                using var fileStream = new FileStream(outputFilePath, FileMode.Open);
                await sessionContainer.UploadBlobAsync(Path.GetFileName(outputFilePath), fileStream, cancellationToken);
            }
            else
            {
                throw new Exception("FFmpeg processing failed.");
            }

            await GenerateAndUploadPreviewGif(tempPath, processedFileMetadata, sessionContainer);

            // A new clip invalidates any previously generated final video
            var finalVideoBlob = sessionContainer.GetBlobClient(Constants.FinalVideoFileName);
            await finalVideoBlob.DeleteIfExistsAsync();

            await videofileBlobClient.DeleteIfExistsAsync();
            await subfileBlobclient.DeleteIfExistsAsync();
            UpdateSessionStatus(fileMetaData.SessionKey, unprocessedContainer, sessionContainer);
        }
        finally
        {
            Directory.Delete(tempPath, true);
        }
    }

    public async Task HandlePoisonAsync(string messageBody)
    {
        var message = JsonConvert.DeserializeObject<EncodeVideoMessage>(messageBody)
            ?? throw new Exception($"Could not deserialize encode message: {messageBody}");
        var blobName = message.blobName;
        var fileMetaData = UnEncodedFileMetaData.GetVideoFileMetaDataFromFileName(blobName);

        var unprocessedContainer = Helpers.GetUnprocessedContainer(blobService);
        var videofileBlobClient = unprocessedContainer.GetBlobClient(blobName);
        var subfileBlobclient = unprocessedContainer.GetBlobClient(fileMetaData.GetSubFileName());

        var failedContainer = Helpers.GetFailedContainer(blobService);
        await failedContainer.CreateIfNotExistsAsync();

        if (await videofileBlobClient.ExistsAsync())
        {
            var failedVideoBlob = failedContainer.GetBlobClient(blobName);
            var videoContent = await videofileBlobClient.DownloadContentAsync();
            await failedVideoBlob.UploadAsync(videoContent.Value.Content, overwrite: true);
        }
        if (await subfileBlobclient.ExistsAsync())
        {
            var failedSubBlob = failedContainer.GetBlobClient(fileMetaData.GetSubFileName());
            var subContent = await subfileBlobclient.DownloadContentAsync();
            await failedSubBlob.UploadAsync(subContent.Value.Content, overwrite: true);
        }
        logger.LogInformation("Failed files for {blobName} moved to '{failed}' container", blobName, Constants.FailedContainer);

        await videofileBlobClient.DeleteIfExistsAsync();
        await subfileBlobclient.DeleteIfExistsAsync();

        firebaseService.SetFailedVideoIds(fileMetaData.SessionKey, Helpers.GetFailedVideosInSession(blobService, fileMetaData.SessionKey));
        var sessionContainer = Helpers.GetContainerBySessionKey(blobService, fileMetaData.SessionKey);
        if (sessionContainer != null)
        {
            UpdateSessionStatus(fileMetaData.SessionKey, unprocessedContainer, sessionContainer);
        }
    }

    private void UpdateSessionStatus(string sessionKey, BlobContainerClient unprocessedContainer, BlobContainerClient sessionContainer)
    {
        var storageUsage = Helpers.GetSessionStorageUsage(blobService, sessionKey);
        firebaseService.SetToBeProcessedCount(sessionKey, unprocessedContainer.GetBlobs());
        firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);
        firebaseService.SetCompletedVideosCount(sessionKey, sessionContainer.GetBlobs());
        firebaseService.SetCompletedVideos(sessionKey, sessionContainer.GetBlobs());
        firebaseService.SetSessionStorageUsage(sessionKey, storageUsage);
    }

    private static async Task<string> GetSubtitleTextAsync(BlobClient subfileBlobclient)
    {
        if (!await subfileBlobclient.ExistsAsync())
        {
            return string.Empty;
        }
        var content = await subfileBlobclient.DownloadContentAsync();
        return JsonConvert.DeserializeObject<string>(content.Value.Content.ToString()) ?? string.Empty;
    }

    private async Task GenerateAndUploadPreviewGif(string tempPath, EncodedFileMetaData fileMeta, BlobContainerClient sessionContainer)
    {
        var videoFilePath = Path.Combine(tempPath, fileMeta.GetVideoFileName());
        var gifFilePath = Path.Combine(tempPath, fileMeta.GetGifFileName());

        var command = FfmpegCommandBuilder.GenerateGifPreview(videoFilePath, gifFilePath);
        var commandResult = await Helpers.ExecuteFFmpegCommand(command, 180);

        if (!commandResult.Success)
        {
            logger.LogError(commandResult.Exception, "Could not create gif");
        }

        var fileInfo = new FileInfo(gifFilePath);
        if (fileInfo.Exists && fileInfo.Length > 0)
        {
            using var fileStream = new FileStream(gifFilePath, FileMode.Open);
            await sessionContainer.UploadBlobAsync(Path.GetFileName(gifFilePath), fileStream);
        }
        else
        {
            throw new Exception("FFmpeg processing failed.");
        }
    }
}
