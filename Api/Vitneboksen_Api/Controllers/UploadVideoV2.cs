using Azure.Storage.Blobs;
using Microsoft.Extensions.Primitives;
using Shared;
using Shared.Models;

namespace Vitneboksen_Api.Controllers;

public static class UploadVideoV2
{
    public static async Task<IResult> Run(HttpRequest req, string videoType, string constring, FirebaseService firebaseService)
    {
        var blobService = new BlobServiceClient(constring);

        var uid = req.Query["uid"].ToString();
        var sessionKey = req.Query["sessionKey"].ToString();
        if (uid == null || sessionKey == null)
        {
            return Results.BadRequest();
        }
        var containerClient = Helpers.GetContainerBySessionKey(blobService, sessionKey);

        if (containerClient == null)
        {
            containerClient = blobService.GetBlobContainerClient($"{sessionKey}-{uid.ToLowerInvariant()}");
            await containerClient.CreateAsync();
            containerClient.SetMetadata(new Dictionary<string, string> { { "created", DateTime.Now.ToString() } });
            firebaseService.SetDeletionFromDate(sessionKey, DateTime.Now);
        }

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

        var videoMetadata = new UnEncodedFileMetaData(
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

        firebaseService.SetToBeProcessedCount(sessionKey, unprocessedContainer.GetBlobs().Count(blob => blob.Name.Contains(".webm") && blob.Name.Contains(sessionKey)));
        firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);

        return Results.Created();
    }

}
