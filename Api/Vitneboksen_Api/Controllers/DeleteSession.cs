using Shared;

namespace Vitneboksen_Api.Controllers;

public static class DeleteSession
{
    public static async Task<IResult> Run(HttpRequest req, string constring, FirebaseService firebaseService)
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

        await containerClient.DeleteAsync();
        return Results.Ok("Deleted");
    }
}

