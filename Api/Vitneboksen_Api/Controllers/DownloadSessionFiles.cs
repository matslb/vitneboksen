using Shared;
using System.IO.Compression;

namespace Vitneboksen_Api;

public static class DownloadSessionFiles
{
    public static async Task<IResult> Run(HttpRequest req, string constring, FirebaseService firebaseService)
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

        var blobs = containerClient.GetBlobsByHierarchyAsync().ConfigureAwait(false);

        // Create a MemoryStream to store the zip file
        using var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
        {
            await foreach (var blobItem in blobs)
            {
                if (blobItem.Blob.Name == Constants.FinalVideoFileName)
                {
                    continue;
                }

                // Get the blob stream
                var blobClient = containerClient.GetBlobClient(blobItem.Blob.Name);
                var blobStream = await blobClient.OpenReadAsync();

                // Create an entry in the zip file for each blob
                var entry = archive.CreateEntry(blobClient.Name, CompressionLevel.Fastest);

                // Copy the blob content to the zip entry
                using var entryStream = entry.Open();
                await blobStream.CopyToAsync(entryStream);
            }
        }
        // Set the position of the memory stream to the beginning
        memoryStream.Seek(0, SeekOrigin.Begin);

        // Return the zip file as the response
        return Results.File(memoryStream.ToArray(), "application/zip", "vitneboksen.zip");
    }
}
