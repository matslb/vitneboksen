using Azure.Storage.Blobs;
using Shared;

namespace Vitneboksen_Api.Controllers;

public static class CreateSession
{
    public static async Task<IResult> Run(HttpRequest req, string constring, FirebaseService firebaseService)
    {
        var blobService = new BlobServiceClient(constring);

        var uid = req.Query["uid"].ToString();
        var sessionKey = req.Query["sessionKey"].ToString();
        var userToken = req.Query["userToken"].ToString();

        if (uid == null || sessionKey == null || userToken == null)
        {
            return Results.BadRequest();
        }

        var authorized = firebaseService.AuthourizeUser(sessionKey, userToken, uid);
        if (!authorized)
            return Results.Unauthorized();

        var containerClient = Helpers.GetContainerBySessionKey(blobService, sessionKey);

        if (containerClient == null)
        {
            containerClient = blobService.GetBlobContainerClient($"{sessionKey}-{uid.ToLowerInvariant()}");
            await containerClient.CreateAsync();
            containerClient.SetMetadata(new Dictionary<string, string> { { "created", DateTime.Now.ToString() } });
            firebaseService.SetDeletionFromDate(sessionKey, DateTime.Now);
            firebaseService.SetMaxSessionStorageUsage(sessionKey);
        }

        return Results.Created();
    }
}
