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
            var fileMetaData = VideoFileMetaData.GetVideoFileMetaDataFromFileName(blobName);

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
                    string outputFilePath = Path.Combine(tempPath, $"{fileMetaData.CreatedOn.UtcDateTime.ToFileTimeUtc()}-{fileMetaData.VideoType}.mp4");

                    var ffmpegCmd = FfmpegCommandBuilder.WithText(videoFilePath, subtitleText, outputFilePath, fontSize: 50, TextPlacement.Subtitle);

                    var commandResult = await Helpers.ExecuteFFmpegCommand(ffmpegCmd, 180, cancellation);

                    var fileInfo = new FileInfo(outputFilePath);
                    if (fileInfo.Exists && fileInfo.Length > 0)
                    {
                        using var fileStream = new FileStream(outputFilePath, FileMode.Open);
                        await sessionContainer.UploadBlobAsync(Path.GetFileName(outputFilePath), fileStream);
                    }
                    else
                    {
                        throw new Exception("FFmpeg processing failed.");
                    }

                    await videofileBlobClient.DeleteIfExistsAsync();
                    await subfileBlobclient.DeleteIfExistsAsync();

                    var blob = sessionContainer.GetBlobClient(Constants.FinalVideoFileName);
                    await blob.DeleteIfExistsAsync();

                    _firebaseService.SetFinalVideoProcessingStatus(fileMetaData.SessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);
                    _firebaseService.SetToBeProcessedCount(fileMetaData.SessionKey, unprocessedContainer.GetBlobs().Count(blob => blob.Name.Contains(".webm") && blob.Name.Contains(fileMetaData.SessionKey)));
                    _firebaseService.SetCompletedVideosCount(fileMetaData.SessionKey, sessionContainer.GetBlobs().Count(blob => blob.Name.Contains(".mp4")));
                }
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Could not process file {fileName}", fileMetaData.GetVideoFileName());
            }
            finally
            {
                Directory.Delete(tempPath, true);
            }

            return;
        }

    }
}
