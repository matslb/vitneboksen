using Shared;

namespace Vitneboksen_Api.Controllers;

public static class ForceUpdateSessionStatus
{
    public static async Task<IResult> Run(HttpRequest req, string constring, FirebaseService firebaseService)
    {
        var blobService = new Azure.Storage.Blobs.BlobServiceClient(constring);

        var sessionKey = req.Query["sessionKey"].ToString();

        var containerClient = Helpers.GetContainerBySessionKey(blobService, sessionKey);
        if (containerClient == null || sessionKey == null)
        {
            return Results.NotFound("Not found");
        }
        firebaseService.SetCompletedVideosCount(sessionKey, containerClient.GetBlobs().Count(blob => blob.Name.Contains(".mp4") && blob.Name != Constants.FinalVideoFileName));

        var unprocessedContainer = Helpers.GetUnprocessedContainer(blobService);
        firebaseService.SetToBeProcessedCount(sessionKey, unprocessedContainer.GetBlobs().Count(blob => blob.Name.Contains(".webm") && blob.Name.Contains(sessionKey)));

        var finalProcessingContainer = blobService.GetBlobContainerClient(Constants.FinalVideoProcessingContainer);
        var existingFinalProcessingBlob = finalProcessingContainer.GetBlobs().FirstOrDefault(b => b.Name == sessionKey);
        if (existingFinalProcessingBlob != null)
        {
            finalProcessingContainer.DeleteBlobIfExists(existingFinalProcessingBlob.Name);
        }
        if (containerClient.GetBlobs().Any(b => b.Name == Constants.FinalVideoFileName))
        {
            firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.completed);
        }
        else
        {
            firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);
        }

        return Results.NoContent();
    }
}

