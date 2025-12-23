using Shared;

namespace Vitneboksen_Api.Controllers;

public static class DeleteVideo
{
    public static async Task<IResult> Run(HttpRequest req, string fileName, string constring, FirebaseService firebaseService)
    {
        var blobService = new Azure.Storage.Blobs.BlobServiceClient(constring);

        var sessionKey = req.Query["sessionKey"].ToString();

        if (sessionKey == null)
        {
            return Results.BadRequest();
        }

        var containerClient = Helpers.GetContainerBySessionKey(blobService, sessionKey);
        if (containerClient == null)
        {
            return Results.NotFound("Not found");
        }

        var blobs = containerClient.GetBlobs().Where(b => b.Name.Contains(fileName) || b.Name.Equals(Constants.FinalVideoFileName));

        foreach (var blob in blobs)
        {
            containerClient.DeleteBlobIfExists(blob.Name);
        }

        firebaseService.SetCompletedVideosCount(sessionKey, containerClient.GetBlobs());
        firebaseService.SetCompletedVideos(sessionKey, containerClient.GetBlobs());
        var sessionUsage = Helpers.GetSessionStorageUsage(blobService, sessionKey);
        firebaseService.SetSessionStorageUsage(sessionKey,sessionUsage);
        firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);

        return Results.Ok();
    }
}

