using Microsoft.AspNetCore.Http;
using Shared;

namespace Vitneboksen_func.Controllers;

public static class ForceUpdateSessionStatus
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
        if (containerClient == null || sessionKey == null)
        {
            return Results.NotFound("Not found");
        }
        firebaseService.SetCompletedVideosCount(sessionKey, containerClient.GetBlobs());
        firebaseService.SetCompletedVideos(sessionKey, containerClient.GetBlobs());
        
        var storageUsage = Helpers.GetSessionStorageUsage(blobService, sessionKey);
        firebaseService.SetSessionStorageUsage(sessionKey, storageUsage);

        var unprocessedContainer = Helpers.GetUnprocessedContainer(blobService);
        firebaseService.SetToBeProcessedCount(
            sessionKey,
            unprocessedContainer.GetBlobs());

        // Resetting the status also cancels any in-flight final video request:
        // the worker drops queued messages whose status is no longer 'started'.
        if (containerClient.GetBlobs().Any(b => b.Name == Constants.FinalVideoFileName))
        {
            firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.completed);
        }
        else
        {
            firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);
        }

        firebaseService.SetIsSessionRecording(sessionKey, false);
        firebaseService.SetFailedVideoIds(sessionKey, Helpers.GetFailedVideosInSession(blobService, sessionKey));
        firebaseService.SetMaxSessionStorageUsage(sessionKey);

        return Results.NoContent();
    }
}

