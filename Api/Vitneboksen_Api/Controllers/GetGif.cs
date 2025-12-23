using Azure.Storage.Blobs;
using Shared;

namespace Vitneboksen_Api.Controllers;
public static class GetGif
{
    public static async Task<IResult> Run(HttpRequest req, HttpResponse res, string fileName, string constring, FirebaseService firebaseService)
    {
        var blobService = new BlobServiceClient(constring);

        var sessionKey = req.Query["sessionKey"].ToString();
        if (string.IsNullOrEmpty(sessionKey) || string.IsNullOrEmpty(fileName))
        {
            return Results.BadRequest("Missing sessionKey, or fileName.");
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

        var stream = await gifBlob.OpenReadAsync();

        // Here you fully control the response
        res.ContentType = "image/gif";
        res.Headers["Cache-Control"] = "private, max-age=600";
        res.Headers["Content-Disposition"] = $"inline; filename=\"{fileName}.gif\"";

        await stream.CopyToAsync(res.Body);

        return Results.Empty;
    }
}