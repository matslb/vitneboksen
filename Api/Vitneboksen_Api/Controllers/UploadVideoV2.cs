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

        var sessionKey = req.Query["sessionKey"].ToString();
        if (sessionKey == null)
        {
            return Results.BadRequest();
        }
        var containerClient = Helpers.GetContainerBySessionKey(blobService, sessionKey);

        if (containerClient == null)
        {
            return Results.BadRequest();
        }

        if (Helpers.IsSessionFull(containerClient.GetBlobs()))
        {
            return Results.BadRequest("Video upload limit reached");
        }

        var videoFile = req.Form.Files.FirstOrDefault(f => f.Name == "video");
        string? subText = null;

        if (req.Form.TryGetValue("sub", out StringValues sub))
            subText = sub.ToString();
        var uploadedExtension = Path.GetExtension(videoFile.FileName)?.TrimStart('.').ToLowerInvariant();

        if (videoFile == null || (videoType == Constants.VideoTypes.Testimonial && subText == null) || string.IsNullOrWhiteSpace(uploadedExtension) )
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
            sessionKey: sessionKey,
            fileType: uploadedExtension  
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

        firebaseService.SetToBeProcessedCount(sessionKey,unprocessedContainer.GetBlobs());
        firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);
        firebaseService.SetFailedVideoIds(sessionKey, Helpers.GetFailedVideosInSession(blobService, sessionKey));

        return Results.Created();
    }

}
