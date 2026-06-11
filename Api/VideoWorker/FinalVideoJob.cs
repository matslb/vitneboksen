using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Shared;
using Shared.Models;
using static Shared.FirebaseService;

namespace VideoWorker;

/// <summary>
/// Concatenates all encoded session clips into final.mp4 with intro (session name
/// overlay), timestamped transitions and outro. Ported from
/// FfmpegFunction/ProcessFinalVideo.cs.
/// </summary>
public class FinalVideoJob(BlobServiceClient blobService, FirebaseService firebaseService, ILogger logger) : IQueueJob
{
    public string QueueName => Constants.FinalVideoQueueName;

    public TimeSpan VisibilityTimeout => TimeSpan.FromMinutes(45);

    public int MaxDequeueCount => 2;

    public async Task ProcessAsync(string messageBody, CancellationToken cancellationToken)
    {
        var message = JsonConvert.DeserializeObject<FinalVideoRequestMessage>(messageBody)
            ?? throw new Exception($"Could not deserialize final video message: {messageBody}");
        var sessionKey = message.sessionKey;

        // The request is only valid while the session is in 'started'. Anything else
        // means it was cancelled/reset (e.g. via force-update) — drop the message.
        var status = firebaseService.GetFinalVideoProcessingStatus(sessionKey);
        if (status != FinalVideoProcessingStatus.started)
        {
            logger.LogInformation("Session {sessionKey} has status {status}, dropping final video request", sessionKey, status);
            return;
        }

        var containerClient = Helpers.GetContainerBySessionKey(blobService, sessionKey);
        if (containerClient == null)
        {
            logger.LogError("Session container not found for {sessionKey}, dropping final video request", sessionKey);
            return;
        }

        var tempPath = Path.Combine(Path.GetTempPath(), $"vitne-{Guid.NewGuid()}");
        Directory.CreateDirectory(tempPath);

        try
        {
            var tempRoot = Path.GetPathRoot(tempPath);
            var freeBytes = new DriveInfo(tempRoot!).AvailableFreeSpace;
            logger.LogInformation("Storing temp files at {tempPath}. Free space: {freeMB} MB", tempPath, freeBytes / (1024 * 1024));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Unable to determine available free space for temp path {tempPath}", tempPath);
        }

        try
        {
            await DownloadResources(blobService, tempPath);
            logger.LogInformation("Resources downloaded successfully");

            var sessionName = firebaseService.GetSessionName(sessionKey);
            logger.LogInformation("Session name fetched from Firebase");

            var blobs = containerClient.GetBlobs().Where(blob => blob.Name.EndsWith(".mp4") && blob.Name != Constants.FinalVideoFileName);
            var transitions = await CreateTransitionsFromBlobs(blobs.ToList(), tempPath);

            var introSourcePath = Path.Combine(tempPath, Constants.IntroFileName);
            var introDestinationPath = Path.Combine(tempPath, "intro-processed.mp4");

            await Helpers.ExecuteFFmpegCommand(FfmpegCommandBuilder.WithText(
                sourceVideoPath: introSourcePath,
                subtitles: sessionName,
                outputVideoPath: introDestinationPath,
                fontSize: 80,
                TextPlacement.Centered,
                startTime: 3.6,
                endTime: 6));

            var outroSourcePath = Path.Combine(tempPath, Constants.OutroFileName);
            var outroDestinationPath = Path.Combine(tempPath, "outro-processed.mp4");

            await Helpers.ExecuteFFmpegCommand(FfmpegCommandBuilder.WithText(
                 sourceVideoPath: outroSourcePath,
                 subtitles: string.Empty,
                 outputVideoPath: outroDestinationPath,
                 fontSize: 80,
                 TextPlacement.Centered
                 ),
                 cancellationToken: cancellationToken);

            logger.LogInformation("Intro and outro processed successfully");

            var fileListPath = Path.Combine(tempPath, "fileList.txt");
            using (var fileListWriter = new StreamWriter(fileListPath))
            {
                fileListWriter.WriteLine($"file '{introDestinationPath}'");
                foreach (var blobItem in blobs)
                {
                    if (transitions.TryGetValue(blobItem.Name, out var transitionFileName))
                    {
                        fileListWriter.WriteLine($"file '{transitionFileName}'");
                    }
                    await AddBlobToFileList(fileListWriter, containerClient, blobItem.Name, tempPath);
                }
                fileListWriter.WriteLine($"file '{outroDestinationPath}'");
            }

            logger.LogInformation("File list created successfully");

            var concatFilePath = Path.Combine(tempPath, Constants.FinalVideoFileName);
            var concatFfmpegCommand = FfmpegCommandBuilder.ConcatVideos(fileListPath, concatFilePath);
            var result = await Helpers.ExecuteFFmpegCommand(concatFfmpegCommand, timeoutInSeconds: 600, cancellationToken: cancellationToken);

            if (!result.Success)
            {
                throw new Exception("Could not concatenate videos", result.Exception);
            }

            logger.LogInformation("Final video processed");

            var finalVideoBlob = containerClient.GetBlobClient(Constants.FinalVideoFileName);
            await finalVideoBlob.DeleteIfExistsAsync();
            using (var file = File.OpenRead(concatFilePath))
            {
                await containerClient.UploadBlobAsync(Constants.FinalVideoFileName, file, cancellationToken);
            }

            firebaseService.SetFinalVideoProcessingStatus(sessionKey, FinalVideoProcessingStatus.completed);
            logger.LogInformation("Firebase status updated");
        }
        finally
        {
            Directory.Delete(tempPath, true);
        }
    }

    public Task HandlePoisonAsync(string messageBody)
    {
        var message = JsonConvert.DeserializeObject<FinalVideoRequestMessage>(messageBody)
            ?? throw new Exception($"Could not deserialize final video message: {messageBody}");
        firebaseService.SetFinalVideoProcessingStatus(message.sessionKey, FinalVideoProcessingStatus.failed);
        return Task.CompletedTask;
    }

    private static async Task AddBlobToFileList(StreamWriter fileListWriter, BlobContainerClient containerClient, string blobName, string tempPath)
    {
        var blobClient = containerClient.GetBlobClient(blobName);
        var downloadPath = Path.Combine(tempPath, blobName);
        await blobClient.DownloadToAsync(downloadPath);
        fileListWriter.WriteLine($"file '{downloadPath}'");
    }

    private static async Task DownloadResources(BlobServiceClient blobService, string tempPath)
    {
        var introContainerClient = blobService.GetBlobContainerClient(Constants.ResourceContainer);
        var blobClient = introContainerClient.GetBlobClient(Constants.IntroFileName);
        await blobClient.DownloadToAsync(Path.Combine(tempPath, Constants.IntroFileName));

        var transitionBlobClient = introContainerClient.GetBlobClient(Constants.TransitionFileName);
        await transitionBlobClient.DownloadToAsync(Path.Combine(tempPath, Constants.TransitionFileName));

        var outroblobClient = introContainerClient.GetBlobClient(Constants.OutroFileName);
        await outroblobClient.DownloadToAsync(Path.Combine(tempPath, Constants.OutroFileName));
    }

    private static async Task<Dictionary<string, string>> CreateTransitionsFromBlobs(List<BlobItem> blobs, string tempPath)
    {
        var norwegianTimeZone = TimeZoneInfo.FindSystemTimeZoneById(OperatingSystem.IsWindows() ? "Central Europe Standard Time" : "Europe/Oslo");
        var transitions = new Dictionary<string, string>();

        var filteredElements = blobs
            .Where((blob, i) => i - 1 >= 0).ToList();

        foreach (var blob in filteredElements)
        {
            var fileMetadata = EncodedFileMetaData.GetVideoFileMetaDataFromFileName(blob.Name);
            var norwegianTime = TimeZoneInfo.ConvertTime(fileMetadata.CreatedOn, norwegianTimeZone);
            var srtContent = $"kl. {norwegianTime.ToString("HH:mm")}";

            var transitionSourcePath = Path.Combine(tempPath, Constants.TransitionFileName);
            var transitionDestinationPath = Path.Combine(tempPath, $"transition-{blob.Name}");

            await Helpers.ExecuteFFmpegCommand(FfmpegCommandBuilder.WithText(transitionSourcePath, srtContent, transitionDestinationPath, fontSize: 80, TextPlacement.Centered));

            transitions.Add(blob.Name, transitionDestinationPath);
        }

        return transitions;
    }
}
