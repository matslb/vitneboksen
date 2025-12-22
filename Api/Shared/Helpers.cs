using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Newtonsoft.Json;
using System.Diagnostics;
using System.Text;

namespace Shared
{
    public static class Helpers
    {
        public static BlobContainerClient? GetContainerBySessionKey(BlobServiceClient blobService, string sessionKey)
        {

            var containers = blobService.GetBlobContainers();
            var container = containers.FirstOrDefault(c => c.Name.StartsWith(sessionKey));

            if (container == null)
            {
                return null;
            }

            return blobService.GetBlobContainerClient(container.Name);
        }

        public static bool IsSessionFull(Pageable<BlobItem> blobs) => blobs.Count(b => b.Name.EndsWith(".webm") || b.Name.EndsWith(".mp4")) >= Constants.MaxVideosPerSession;

        public static BlobContainerClient GetUnprocessedContainer(BlobServiceClient blobService) => blobService.GetBlobContainerClient(Constants.UnprocessedContainer);

        public static BlobContainerClient GetFailedContainer(BlobServiceClient blobService) => blobService.GetBlobContainerClient(Constants.FailedContainer);

        // Returns all blobs in the 'failed' container that belong to a specific session
        public static List<BlobItem> GetFailedVideosInSession(BlobServiceClient blobService, string sessionKey)
        {
            var failedContainer = GetFailedContainer(blobService);
            return failedContainer.GetBlobs().Where(b => b.Name.Contains($"&{sessionKey}") && (b.Name.EndsWith("webm") || b.Name.EndsWith("mp4"))).ToList();
        }

        public static async Task UploadJsonToStorage(BlobClient blobClient, object objectToSave)
        {
            var serializedObject = JsonConvert.SerializeObject(objectToSave);
            await blobClient.UploadAsync(BinaryData.FromString(serializedObject), overwrite: true);
        }

        public static async Task<FFmpegResult> ExecuteFFmpegCommand(string arguments, int timeoutInSeconds = 60, CancellationToken cancellationToken = default)
        {
            string environment = Environment.GetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT")!;

            var ffmpegFileName = Path.Combine(environment == "Development" ? Environment.CurrentDirectory : "C:\\home\\site\\wwwroot",
                IsRunningOnWindows() ? "ffmpeg.exe" : "ffmpeg");

            var ffmpegStartInfo = new ProcessStartInfo
            {
                FileName = ffmpegFileName,
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = ffmpegStartInfo };

            var outputBuilder = new StringBuilder();
            var errorBuilder = new StringBuilder();

            process.OutputDataReceived += (sender, e) =>
            {
                if (!string.IsNullOrEmpty(e.Data)) outputBuilder.AppendLine(e.Data);
            };

            process.ErrorDataReceived += (sender, e) =>
            {
                if (!string.IsNullOrEmpty(e.Data)) errorBuilder.AppendLine(e.Data);
            };

            var timeout = TimeSpan.FromSeconds(timeoutInSeconds);
            try
            {
                process.Start();
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();

                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(timeout);

                await process.WaitForExitAsync(cts.Token);

                // Ensure all output/error data has been read & flushed
                process.WaitForExit();

                if (process.ExitCode != 0)
                {
                    return new FFmpegResult(false, new Exception($"FFmpeg exited with code {process.ExitCode}: {errorBuilder}"));
                }

                return new FFmpegResult(true);
            }
            catch (OperationCanceledException oce)
            {
                try
                {
                    if (!process.HasExited)
                        process.Kill(true);
                }
                catch { /* ignored */ }

                return new FFmpegResult(false, oce);
            }
            catch (Exception ex)
            {
                return new FFmpegResult(false, ex);
            }
        }


        public static bool IsRunningOnWindows()
        {
            // Check if the OS is Windows
            return Environment.OSVersion.Platform == PlatformID.Win32NT;
        }
    }
}