using Shared;
using Shared.Models;

namespace Vitneboksen_Api.Controllers;

public static class StartFinalVideoProcessing
{
    public static async Task<IResult> Run(HttpRequest req, string constring, FirebaseService firebaseService)
    {
        var blobService = new Azure.Storage.Blobs.BlobServiceClient(constring);

        string sessionKey = req.Query["sessionKey"]!;

        var containerClient = blobService.GetBlobContainerClient(Constants.FinalVideoProcessingContainer);

        if (containerClient == null)
        {
            return Results.NotFound("Not found");
        }

        var processingRequest = new FinalVideoProcessingRequest(sessionKey);

        var blobClient = containerClient.GetBlobClient(sessionKey);

        await Helpers.UploadJsonToStorage(blobClient, processingRequest);

        firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.started);

        return Results.Ok();
    }
}
