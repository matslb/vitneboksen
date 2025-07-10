using Azure.Storage.Blobs;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Shared;
using Shared.Models;
using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
namespace FfmpegFunction
{
    public class FormatTestimony
    {
        private readonly ILogger _logger;
        private readonly IConfiguration _configuration;
        private readonly FirebaseService _firebaseService;

        public FormatTestimony(ILoggerFactory loggerFactory, IConfiguration configuration)
        {
            _logger = loggerFactory.CreateLogger<FormatTestimony>();
            _configuration = configuration;
            _firebaseService = new FirebaseService(new FireSharp.Config.FirebaseConfig
            {
                AuthSecret = Environment.GetEnvironmentVariable("FireSharp__AuthSecret"),
                BasePath = Environment.GetEnvironmentVariable("FireSharp__BasePath"),
            });
        }

        [Function("FormatTestimony")]
        public async Task Run([BlobTrigger("unprocessed/{blobName}", Connection = "AzureWebJobsStorage")] byte[] blobContent, FunctionContext context, string blobName, CancellationToken cancellation)
        {
            var fileMetaData = UnEncodedFileMetaData.GetVideoFileMetaDataFromFileName(blobName);

            if (!blobName.EndsWith(".webm"))
                return;

            using var blobContentStream = new MemoryStream(blobContent);

            var connectionString = _configuration.GetConnectionString("AzureWebJobsStorage");

            var blobService = new Azure.Storage.Blobs.BlobServiceClient(connectionString);
            var blobNameBase = blobName.Split('.').First();

            var unprocessedContainer = Helpers.GetUnprocessedContainer(blobService);
            if (unprocessedContainer == null)
            {
                throw new Exception("No container found");
            }

            var videofileBlobClient = unprocessedContainer.GetBlobClient(blobName);
            var subfileBlobclient = unprocessedContainer.GetBlobClient(fileMetaData.GetSubFileName());
            var tempFolder = $"{fileMetaData.SessionKey}-{fileMetaData.Id}";

            var tempPath = Path.Combine(Path.GetTempPath(), tempFolder);
            Directory.CreateDirectory(tempPath);
            var videoFilePath = Path.Combine(tempPath, "file.mp4");
            using (var fileStream = new FileStream(videoFilePath, FileMode.Create))
            {
                await blobContentStream.CopyToAsync(fileStream);
            }
            string? subtitleText = string.Empty;
            if (subfileBlobclient.Exists())
                subtitleText = JsonConvert.DeserializeObject<string>((await subfileBlobclient.DownloadContentAsync()).Value.Content.ToString());

            var sessionContainer = Helpers.GetContainerBySessionKey(blobService, fileMetaData.SessionKey);

            try
            {
                if (sessionContainer == null)
                {
                    _logger.LogError("Session container {sessionContainer} does not exist. Deleting unprocessed files", fileMetaData.SessionKey);
                    await videofileBlobClient.DeleteIfExistsAsync();
                    await subfileBlobclient.DeleteIfExistsAsync();
                }
                else
                {
                    var processedFileMetadata = new EncodedFileMetaData(fileMetaData.CreatedOn);
                    string outputFilePath = Path.Combine(tempPath, processedFileMetadata.GetVideoFileName());

                    var ffmpegCmd = FfmpegCommandBuilder.WithText(videoFilePath, subtitleText, outputFilePath, fontSize: 50, TextPlacement.Subtitle);
                    var startTime = DateTime.Now;
                    var commandResult = await Helpers.ExecuteFFmpegCommand(ffmpegCmd, 240, cancellation);
                    var endTime = DateTime.Now;
                    _logger.LogInformation("Encoding video took {time}s", (endTime - startTime).TotalSeconds);

                    var fileInfo = new FileInfo(outputFilePath);
                    _logger.LogInformation(fileInfo.FullName, fileInfo.Length, fileInfo);
                    if (fileInfo.Exists && fileInfo.Length > 0)
                    {
                        using var fileStream = new FileStream(outputFilePath, FileMode.Open);
                        await sessionContainer.UploadBlobAsync(Path.GetFileName(outputFilePath), fileStream);
                    }
                    else
                    {
                        throw new Exception("FFmpeg processing failed.");
                    }

                    await GenerateAndUploadPreviewGif(tempPath, processedFileMetadata, sessionContainer);

                    var blob = sessionContainer.GetBlobClient(Constants.FinalVideoFileName);
                    await blob.DeleteIfExistsAsync();
                }
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Could not process file {fileName}", fileMetaData.GetVideoFileName());
                try
                {
                    // Get or create the "failed" container
                    var failedContainer = blobService.GetBlobContainerClient("failed");
                    await failedContainer.CreateIfNotExistsAsync();

                    // Upload original video
                    blobContentStream.Position = 0; // reset stream
                    var failedVideoBlob = failedContainer.GetBlobClient(blobName);
                    await failedVideoBlob.UploadAsync(blobContentStream, overwrite: true);

                    // Upload subtitle if it exists
                    if (subfileBlobclient.Exists())
                    {
                        var failedSubBlob = failedContainer.GetBlobClient(fileMetaData.GetSubFileName());
                        var subContent = await subfileBlobclient.DownloadContentAsync();
                        using var subStream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(subContent.Value.Content.ToString()));
                        await failedSubBlob.UploadAsync(subStream, overwrite: true);
                    }

                    _logger.LogInformation("Failed files uploaded to 'failed' container.");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to upload files to 'failed' container.");
                }
            }
            finally
            {
                Directory.Delete(tempPath, true);
                await videofileBlobClient.DeleteIfExistsAsync();
                await subfileBlobclient.DeleteIfExistsAsync();

                _firebaseService.SetToBeProcessedCount(fileMetaData.SessionKey, unprocessedContainer.GetBlobs().Count(blob => blob.Name.Contains(".webm") && blob.Name.Contains(fileMetaData.SessionKey)));
                _firebaseService.SetFinalVideoProcessingStatus(fileMetaData.SessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);
                _firebaseService.SetCompletedVideosCount(fileMetaData.SessionKey, sessionContainer.GetBlobs());
                _firebaseService.SetCompletedVideos(fileMetaData.SessionKey, sessionContainer.GetBlobs());
            }

            return;
        }

        private async Task GenerateAndUploadPreviewGif(string tempPath, EncodedFileMetaData fileMeta, BlobContainerClient sessionContainer)
        {
            var videoFilePath = Path.Combine(tempPath, fileMeta.GetVideoFileName());
            var gifFilePath = Path.Combine(tempPath, fileMeta.GetGifFileName());

            var command = FfmpegCommandBuilder.GenerateGifPreview(videoFilePath, gifFilePath);
            var commandResult = await Helpers.ExecuteFFmpegCommand(command, 180);

            if (!commandResult.Success)
            {
                _logger.LogError("Could not create gif", commandResult.Exception);
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
}
