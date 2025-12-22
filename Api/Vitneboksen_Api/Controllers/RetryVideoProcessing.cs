using Shared;
using Shared.Models;
namespace Vitneboksen_Api.Controllers;

public class RetryVideoProcessing
{
    public static async Task<IResult> Run(HttpRequest request, string id, string constring, FirebaseService firebaseService)
    {
        var blobService = new Azure.Storage.Blobs.BlobServiceClient(constring);

        var sessionKey = request.Query["sessionKey"].ToString();
        var userToken = request.Query["userToken"].ToString();
        if (string.IsNullOrWhiteSpace(sessionKey) || string.IsNullOrWhiteSpace(userToken))
        {
            return Results.BadRequest();
        }

        var authorized = firebaseService.AuthourizeUser(sessionKey, userToken);
        if (!authorized)
            return Results.Unauthorized();

        // Validate session existence
        var sessionContainer = Helpers.GetContainerBySessionKey(blobService, sessionKey);
        if (sessionContainer == null)
        {
            return Results.NotFound("Session not found");
        }

        var failedBlobs = Helpers.GetFailedVideosInSession(blobService, sessionKey);
        var videoBlobItem = failedBlobs.FirstOrDefault(b => b.Name.Contains(id));
        if (videoBlobItem == null)
        {
            return Results.NotFound();
        }

        var videoMetadata = UnEncodedFileMetaData.GetVideoFileMetaDataFromFileName(videoBlobItem.Name);
        var subFileName = videoMetadata.GetSubFileName();
        var unprocessedContainer = Shared.Helpers.GetUnprocessedContainer(blobService);
        var failedContainer = Helpers.GetFailedContainer(blobService);

        // Copy video
        var sourceVideo = failedContainer.GetBlobClient(videoBlobItem.Name);
        var destVideo = unprocessedContainer.GetBlobClient(videoBlobItem.Name);
        await destVideo.StartCopyFromUriAsync(sourceVideo.Uri);

        var sourceSub = failedContainer.GetBlobClient(subFileName);
        var destSub = unprocessedContainer.GetBlobClient(subFileName);
        await destSub.StartCopyFromUriAsync(sourceSub.Uri);

        await sourceVideo.DeleteIfExistsAsync();
        await sourceSub.DeleteIfExistsAsync();

        failedBlobs.Remove(videoBlobItem);
        firebaseService.SetFailedVideoIds(sessionKey, failedBlobs);
        firebaseService.SetToBeProcessedCount(sessionKey, unprocessedContainer.GetBlobs());
        firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);

        return Results.Accepted();
    }
}
