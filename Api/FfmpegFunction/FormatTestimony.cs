using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Shared;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
namespace FfmpegFunction
{
    public class FormatTestimony
    {
        private readonly ILogger _logger;
        private readonly IConfiguration _configuration;
        public FormatTestimony(ILoggerFactory loggerFactory, IConfiguration configuration)
        {
            _logger = loggerFactory.CreateLogger<FormatTestimony>();
            _configuration = configuration;
        }

        [Function("FormatTestimony")]
        public async Task Run([BlobTrigger("unprocessed/{blobName}", Connection = "AzureWebJobsStorage")] byte[] blobContent, FunctionContext context, string blobName)
        {
            if (blobName.EndsWith(".srt"))
                return;

            using var blobContentStream = new MemoryStream(blobContent);

            var connectionString = _configuration.GetConnectionString("AzureWebJobsStorage");

            var blobService = new Azure.Storage.Blobs.BlobServiceClient(connectionString);
            var sessionKeyPair = Helpers.GetSessionKeyPairFromUnprocessedFileName(blobName);
            var blobNameBase = blobName.Split('.').First();
            var videoType = blobNameBase.Split("|").Last();

            var sessionKey = sessionKeyPair.Split("-").First();

            var unprocessedContainer = Helpers.GetUnprocessedContainer(blobService);
            if (unprocessedContainer == null)
            {
                throw new Exception("No container found");
            }

            var subfileBlobclient = unprocessedContainer.GetBlobClient($"{blobNameBase}.srt");
            var videofileBlobClient = unprocessedContainer.GetBlobClient(blobName);
            var tempFolder = $"{sessionKey}-{Guid.NewGuid()}";
            var tempPath = Path.Combine(Path.GetTempPath(), tempFolder);
            Directory.CreateDirectory(tempPath);
            var videoFilePath = Path.Combine(tempPath, "file.mp4");
            var subFilePath = Path.Combine(tempPath, "file.srt");

            using (var fileStream = new FileStream(videoFilePath, FileMode.Create))
            {
                await blobContentStream.CopyToAsync(fileStream);
            }

            await subfileBlobclient.DownloadToAsync(subFilePath);
            var sessionContainer = Helpers.GetContainerBySessionKey(blobService, sessionKey);
            try
            {
                string outputFilePath = Path.Combine(tempPath, $"{DateTime.Now.ToFileTimeUtc()}-{videoType}.mp4");

                string ffmpegCmd;

                if (videoType == Constants.VideoTypes.Testimonial)
                {
                    ffmpegCmd = $"-i \"{videoFilePath}\" -filter:a \"volume=3\" -vf \"scale=-1:1080,pad=1920:1080:(1920-iw)/2:(1080-ih)/2,subtitles='{subFilePath.Replace("\\", "\\\\").Replace(":", "\\:")}'\" -r 30 -c:v libx264 -c:a aac -ar 48000  \"{outputFilePath}\"";
                }
                else
                {
                    ffmpegCmd = $"-i \"{videoFilePath}\" -filter:a \"volume=3\" -vf \"scale=-1:720,pad=1280:720:(1280-iw)/2:(720-ih)/2\" -r 30 -c:v libx264 -c:a aac -ar 48000 \"{outputFilePath}\"";
                }
                await Helpers.ExecuteFFmpegCommand(ffmpegCmd);

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

                await videofileBlobClient.DeleteAsync();
                await subfileBlobclient.DeleteAsync();

                var blob = sessionContainer.GetBlobClient(Constants.ConcatinatedVideoFileName);
                if (blob.Exists())
                {
                    await blob.DeleteAsync();
                }
            }
            finally
            {
                Directory.Delete(tempPath, true);
            }

            return;
        }

    }
}
