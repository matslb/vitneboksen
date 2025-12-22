using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Shared;
using Shared.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using static Shared.FirebaseService;
namespace FfmpegFunction
{
    public class ProcessFinalVideo
    {
        private readonly ILogger _logger;
        private readonly IConfiguration _configuration;
        private readonly FirebaseService _firebaseService;
        public ProcessFinalVideo(ILoggerFactory loggerFactory, IConfiguration configuration)
        {
            _configuration = configuration;
            _logger = loggerFactory.CreateLogger<ProcessFinalVideo>();
            _firebaseService = new FirebaseService(new FireSharp.Config.FirebaseConfig
            {
                AuthSecret = Environment.GetEnvironmentVariable("FireSharp__AuthSecret"),
                BasePath = Environment.GetEnvironmentVariable("FireSharp__BasePath"),
            });
        }

        [Function("ProcessFinalVideo")]
        public async Task Run([BlobTrigger("final-video-processing-requests/{sessionContainerName}", Connection = "AzureWebJobsStorage")] byte[] blobContent,
            string sessionContainerName,
            CancellationToken cancellationToken
            )
        {
            var processingRequest = JsonSerializer.Deserialize<FinalVideoProcessingRequest>(blobContent);
            var sessionKey = processingRequest.sessionKey;

            using var blobContentStream = new MemoryStream(blobContent);

            var connectionString = _configuration.GetConnectionString("AzureWebJobsStorage");

            var blobService = new BlobServiceClient(connectionString);
            var tempPath = Path.Combine(Path.GetTempPath(), $"vitne-{Guid.NewGuid()}");
            Directory.CreateDirectory(tempPath);

            // Log temp path and available free space on the temp drive
            try
            {
                var tempRoot = Path.GetPathRoot(tempPath);
                var freeBytes = new DriveInfo(tempRoot!).AvailableFreeSpace;
                _logger.LogInformation("Storing temp files at {tempPath} (root {tempRoot}). Free space: {freeMB} MB", tempPath, tempRoot, freeBytes / (1024 * 1024));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to determine available free space for temp path {tempPath}", tempPath);
            }

            try
            {

                await DownloadResources(blobService, tempPath);
                _logger.LogInformation("Resources downloaded successfully");
                var containerClient = Helpers.GetContainerBySessionKey(blobService, sessionKey);
                var sessionName = _firebaseService.GetSessionName(sessionKey);
                _logger.LogInformation("Session name fetched from Firebase");

                var blobs = containerClient.GetBlobs().Where(blob => blob.Name.EndsWith(".mp4") && blob.Name != Constants.FinalVideoFileName);
                var transitions = await CreateTransitionsFromBlobs(blobs.ToList(), tempPath);
                //Intro
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

                _logger.LogInformation("Intro and outro successfully");

                // Create a MemoryStream to store the zip file
                using var memoryStream = new MemoryStream();

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

                _logger.LogInformation("File list created successfully");

                var concatFilePath = Path.Combine(tempPath, Constants.FinalVideoFileName);
                var concatFfmpegCommand = FfmpegCommandBuilder.ConcatVideos(fileListPath, concatFilePath);
                var result = await Helpers.ExecuteFFmpegCommand(concatFfmpegCommand, timeoutInSeconds: 240, cancellationToken: cancellationToken);

                if (!result.Success)
                    _logger.LogError("Could not concatenate videos {error}", result.Exception);

                _logger.LogInformation("Final video processed");

                var file = File.OpenRead(concatFilePath);
                await containerClient.UploadBlobAsync(Constants.FinalVideoFileName, file);
                file.Close();

                _firebaseService.SetFinalVideoProcessingStatus(sessionKey: sessionKey, FinalVideoProcessingStatus.completed);
                _logger.LogInformation("Firebase status updated");
            }
            finally
            {
                Directory.Delete(tempPath, true);

                var finalVideoProcessingContainerClient = blobService.GetBlobContainerClient(Constants.FinalVideoProcessingContainer);
                var finalVideoRequestBlob = finalVideoProcessingContainerClient.GetBlobClient(sessionKey);
                finalVideoRequestBlob.DeleteIfExists();
            }
            return;
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

            var outroContainerClient = blobService.GetBlobContainerClient(Constants.ResourceContainer);
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
                // Convert the DateTimeOffset to Norwegian time
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
}
