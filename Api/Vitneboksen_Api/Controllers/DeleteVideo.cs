using Shared;

namespace Vitneboksen_Api.Controllers;

public static class DeleteVideo
{
    public static async Task<IResult> Run(HttpRequest req, string fileName, string constring, FirebaseService firebaseService)
    {
        var blobService = new Azure.Storage.Blobs.BlobServiceClient(constring);

        var sessionKey = req.Query["sessionKey"].ToString();
        var userToken = req.Query["userToken"].ToString();

        if (sessionKey == null || userToken == null)
        {
            return Results.BadRequest();
        }

        var authorized = firebaseService.AuthourizeUser(sessionKey, userToken);
        if (!authorized)
            return Results.Unauthorized();

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
        firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);

        return Results.Ok();
    }
}

