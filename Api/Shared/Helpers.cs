using Azure.Storage.Blobs;
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

        public static BlobContainerClient GetUnprocessedContainer(BlobServiceClient blobService) => blobService.GetBlobContainerClient(Constants.UnprocessedContainer);

        public static BlobContainerClient? GetContainerBySharedKey(BlobServiceClient blobService, string sharedKey)
        {

            var containers = blobService.GetBlobContainers();
            var container = containers.FirstOrDefault(c => c.Name.EndsWith(sharedKey));

            if (container == null)
            {
                return null;
            }

            return blobService.GetBlobContainerClient(container.Name);
        }

        public static async Task UploadJsonToStorage(BlobClient blobClient, object objectToSave)
        {
            var serializedObject = JsonConvert.SerializeObject(objectToSave);
            await blobClient.UploadAsync(BinaryData.FromString(serializedObject), overwrite: true);
        }

        public static async Task<T?> GetBlobFromStorage<T>(BlobContainerClient containerClient, string fileName)
        {
            var blobClient = containerClient.GetBlobClient(fileName);
            if (blobClient.Exists())
            {
                var blob = await blobClient.DownloadContentAsync();
                var json = blob?.Value?.Content?.ToString();
                if (json != null)
                    return JsonConvert.DeserializeObject<T>(json);
            }
            return default;
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