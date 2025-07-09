using Azure.Storage.Blobs;
using Shared;

namespace Vitneboksen_Api.Controllers;

public static class GetGif
{
    public static async Task<IResult> Run(HttpRequest req, string fileName, string constring, FirebaseService firebaseService)
    {
        var blobService = new BlobServiceClient(constring);

        var sessionKey = req.Query["sessionKey"].ToString();
        var userToken = req.Query["userToken"].ToString();

        if (string.IsNullOrEmpty(sessionKey) || string.IsNullOrEmpty(userToken) || string.IsNullOrEmpty(fileName))
        {
            return Results.BadRequest("Missing sessionKey, userToken, or fileName.");
        }

        var authorized = firebaseService.AuthourizeUser(sessionKey, userToken);
        if (!authorized)
        {
            return Results.Unauthorized();
        }

        var containerClient = Helpers.GetContainerBySessionKey(blobService, sessionKey);
        if (containerClient == null)
        {
            return Results.NotFound("Session container not found.");
        }

        var gifBlob = containerClient.GetBlobClient($"{fileName}.gif");

        if (!await gifBlob.ExistsAsync())
        {
            return Results.NotFound("GIF not found.");
        }

        var stream = new MemoryStream();
        await gifBlob.DownloadToAsync(stream);
        stream.Position = 0;

        return Results.File(stream, contentType: "image/gif", fileDownloadName: fileName);
    }
}
