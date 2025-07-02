using Azure.Storage.Blobs;
using Microsoft.Extensions.Primitives;
using Shared;
using Shared.Models;

namespace Vitneboksen_Api.Controllers;

public static class UploadVideo
{
    public static async Task<IResult> Run(HttpRequest req, string videoType, string constring)
    {
        var blobService = new BlobServiceClient(constring);
        BlobContainerClient containerClient;
        if (videoType == Constants.VideoTypes.Testimonial)
        {
            containerClient = Helpers.GetContainerBySessionKey(blobService, req.Query["sessionKey"]);
        }
        else
        {
            containerClient = Helpers.GetContainerBySharedKey(blobService, req.Query["sharedKey"]);
        }

        var sessionKey = containerClient.Name.Split("-").First();

        if (containerClient.GetBlobs().Count(b => b.Name.Contains("webm")) >= 50)
        {
            return Results.BadRequest("Video upload limit reached");
        }

        var formdata = await req.ReadFormAsync();
        var videoFile = req.Form.Files.FirstOrDefault(f => f.Name == "video");
        string? subText = null;

        if (req.Form.TryGetValue("sub", out StringValues sub))
            subText = sub.ToString();

        if (videoFile == null || (videoType == Constants.VideoTypes.Testimonial && subText == null))
        {
            return Results.BadRequest("No file, stupid.");
        }

        if (containerClient == null)
        {
            return Results.NotFound("Not found");
        }

        var videoMetadata = new VideoFileMetaData(
            id: Guid.NewGuid(),
            createdOn: DateTimeOffset.Now,
            videoType: videoType,
            sessionKey: sessionKey
            );

        var videoFileName = videoMetadata.GetVideoFileName();
        var unprocessedContainer = Helpers.GetUnprocessedContainer(blobService);
        await unprocessedContainer.UploadBlobAsync(videoFileName, videoFile.OpenReadStream());

        if (subText != null)
        {
            var subFileName = videoMetadata.GetSubFileName();
            var subTextBlobClient = unprocessedContainer.GetBlobClient(subFileName);
            await Helpers.UploadJsonToStorage(subTextBlobClient, subText);
        }

        return Results.Created();
    }

}
