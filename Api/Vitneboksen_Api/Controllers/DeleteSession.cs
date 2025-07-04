using Shared;

namespace Vitneboksen_Api.Controllers;

public static class DeleteSession
{
    public static async Task<IResult> Run(HttpRequest req, string constring)
    {
        var blobService = new Azure.Storage.Blobs.BlobServiceClient(constring);

        var sessionKey = req.Query["sessionKey"];

        var containerClient = Helpers.GetContainerBySessionKey(blobService, sessionKey);
        if (containerClient == null)
        {
            return Results.NotFound("Not found");
        }

        await containerClient.DeleteAsync();
        return Results.Ok("Deleted");
    }
}

