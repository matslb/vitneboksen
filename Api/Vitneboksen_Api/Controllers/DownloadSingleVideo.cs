using Shared;

namespace Vitneboksen_Api.Controllers;

public static class DownloadSingleVideo
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

        var sessionName = firebaseService.GetSessionName(sessionKey);
        var blob = containerClient.GetBlobClient($"{fileName}.mp4");
        var blobContent = await blob.DownloadContentAsync();

        return Results.File(blobContent.Value.Content.ToStream(), "video/mp4", $"{fileName}.mp4");
    }
}