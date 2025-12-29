using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Shared;
using Shared.Models;
using Vitneboksen_func.Helpers;

namespace Vitneboksen_func.Functions;

public class RetryVideoProcessingFunction
{
    private readonly FirebaseService _firebaseService;
    private readonly IConfiguration _configuration;

    public RetryVideoProcessingFunction(FirebaseService firebaseService, IConfiguration configuration)
    {
        _firebaseService = firebaseService;
        _configuration = configuration;
    }

    [Function("RetryVideoProcessing")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "retry/{id}")] HttpRequestData req,
        string id)
    {
        var (isAuthorized, unauthorizedResponse) = await AuthHelper.IsAuthorizedAsync(req, _firebaseService);
        if (!isAuthorized)
        {
            return unauthorizedResponse!;
        }

        var storageConnectionString = _configuration["StorageConnectionString"] ?? 
                                     _configuration.GetConnectionString("AzureWebJobsStorage") ?? "";
        var blobService = new BlobServiceClient(storageConnectionString);

        var queryParams = RequestHelper.ExtractQueryParameters(req.Url.Query);
        queryParams.TryGetValue("sessionKey", out var sessionKey);

        if (string.IsNullOrWhiteSpace(sessionKey))
        {
            return req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
        }

        var sessionContainer = Shared.Helpers.GetContainerBySessionKey(blobService, sessionKey);
        if (sessionContainer == null)
        {
            var notFoundResponse = req.CreateResponse(System.Net.HttpStatusCode.NotFound);
            await notFoundResponse.WriteStringAsync("Session not found");
            return notFoundResponse;
        }

        var failedBlobs = Shared.Helpers.GetFailedVideosInSession(blobService, sessionKey);
        var videoBlobItem = failedBlobs.FirstOrDefault(b => b.Name.Contains(id));
        if (videoBlobItem == null)
        {
            return req.CreateResponse(System.Net.HttpStatusCode.NotFound);
        }

        var videoMetadata = UnEncodedFileMetaData.GetVideoFileMetaDataFromFileName(videoBlobItem.Name);
        var subFileName = videoMetadata.GetSubFileName();
        var unprocessedContainer = Shared.Helpers.GetUnprocessedContainer(blobService);
        var failedContainer = Shared.Helpers.GetFailedContainer(blobService);

        var sourceVideo = failedContainer.GetBlobClient(videoBlobItem.Name);
        var destVideo = unprocessedContainer.GetBlobClient(videoBlobItem.Name);
        await destVideo.StartCopyFromUriAsync(sourceVideo.Uri);

        var sourceSub = failedContainer.GetBlobClient(subFileName);
        var destSub = unprocessedContainer.GetBlobClient(subFileName);
        await destSub.StartCopyFromUriAsync(sourceSub.Uri);

        await sourceVideo.DeleteIfExistsAsync();
        await sourceSub.DeleteIfExistsAsync();

        failedBlobs.Remove(videoBlobItem);
        _firebaseService.SetFailedVideoIds(sessionKey, failedBlobs);
        _firebaseService.SetToBeProcessedCount(sessionKey, unprocessedContainer.GetBlobs());
        _firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);

        return req.CreateResponse(System.Net.HttpStatusCode.Accepted);
    }
}

