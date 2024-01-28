using Azure.Storage.Blobs;

namespace Vitneboksen_Api.Controllers;

public static class UploadTestemony
{
    public static async Task<IResult> Run(HttpRequest req, BlobServiceClient blobService)
    {
        string? sessionKey = req.Query["sessionKey"];

        var formdata = await req.ReadFormAsync();
        var videoFile = req.Form.Files.FirstOrDefault(f => f.Name == "video");
        var subFile = req.Form.Files.FirstOrDefault(f => f.Name == "sub");
        if (videoFile == null || subFile == null)
        {
            return Results.BadRequest("No file, stupid.");
        }

        var containerClient = Helpers.GetContainerBySessionKey(blobService, sessionKey);
        if (containerClient == null)
        {
            return Results.NotFound("Not found");
        }


        var tempFolder = $"vitne-{Guid.NewGuid()}";
        var tempPath = Path.Combine(Environment.CurrentDirectory, tempFolder);
        Directory.CreateDirectory(tempPath);
        var videoFilePath = Path.Combine(tempPath, "file.mp4");
        var subFilePath = Path.Combine(tempPath, "file.srt");

        using (var fileStream = new FileStream(videoFilePath, FileMode.Create))
        {
            await videoFile.CopyToAsync(fileStream);
        }

        using (var fileStream = new FileStream(subFilePath, FileMode.Create))
        {
            await subFile.CopyToAsync(fileStream);
        }

        try
        {
            var outputFilePath = Path.Combine(tempPath, $"{DateTime.Now.ToFileTimeUtc()}.mp4");

            var ffmpegCmd = OperatingSystem.IsWindows() ?
            $"-i \"{videoFilePath}\" -vf \"subtitles='{subFilePath.Replace("\\", "\\\\").Replace(":", "\\:")}'\" -c:v libx264 -c:a aac \"{outputFilePath}\""
            : $"-i \"{videoFilePath}\" -vf \"subtitles='{subFilePath}'\" -c:v libx264 -c:a aac \"{outputFilePath}\"";

            await Helpers.ExecuteFFmpegCommand(ffmpegCmd);

            var fileInfo = new FileInfo(outputFilePath);
            if (fileInfo.Exists && fileInfo.Length > 0)
            {
                using var fileStream = new FileStream(outputFilePath, FileMode.Open);
                await containerClient.UploadBlobAsync(Path.GetFileName(outputFilePath), fileStream);
            }
            else
            {
                return Results.BadRequest("FFmpeg processing failed.");
            }

            var blob = containerClient.GetBlobClient(Constants.ConcatinatedVideoFileName);
            if (blob.Exists())
            {
                await blob.DeleteAsync();
            }
        }
        catch (Exception)
        {
            throw;
        }
        finally
        {
            Directory.Delete(tempPath, true);
        }

        return Results.Created();
    }

}
