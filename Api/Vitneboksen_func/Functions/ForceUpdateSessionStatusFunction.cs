using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Shared;
using Vitneboksen_func.Helpers;

namespace Vitneboksen_func.Functions;

public class ForceUpdateSessionStatusFunction
{
    private readonly FirebaseService _firebaseService;
    private readonly IConfiguration _configuration;

    public ForceUpdateSessionStatusFunction(FirebaseService firebaseService, IConfiguration configuration)
    {
        _firebaseService = firebaseService;
        _configuration = configuration;
    }

    [Function("ForceUpdateSessionStatus")]
    public async Task<HttpResponseData> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "force-update")] HttpRequestData req)
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

        if (string.IsNullOrEmpty(sessionKey))
        {
            return req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
        }

        var containerClient = Shared.Helpers.GetContainerBySessionKey(blobService, sessionKey);
        if (containerClient == null || string.IsNullOrEmpty(sessionKey))
        {
            return req.CreateResponse(System.Net.HttpStatusCode.NotFound);
        }

        _firebaseService.SetCompletedVideosCount(sessionKey, containerClient.GetBlobs());
        _firebaseService.SetCompletedVideos(sessionKey, containerClient.GetBlobs());
        
        var storageUsage = Shared.Helpers.GetSessionStorageUsage(blobService, sessionKey);
        _firebaseService.SetSessionStorageUsage(sessionKey, storageUsage);

        var unprocessedContainer = Shared.Helpers.GetUnprocessedContainer(blobService);
        _firebaseService.SetToBeProcessedCount(sessionKey, unprocessedContainer.GetBlobs());

        var finalProcessingContainer = blobService.GetBlobContainerClient(Constants.FinalVideoProcessingContainer);
        var existingFinalProcessingBlob = finalProcessingContainer.GetBlobs().FirstOrDefault(b => b.Name == sessionKey);
        if (existingFinalProcessingBlob != null)
        {
            finalProcessingContainer.DeleteBlobIfExists(existingFinalProcessingBlob.Name);
        }

        if (containerClient.GetBlobs().Any(b => b.Name == Constants.FinalVideoFileName))
        {
            _firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.completed);
        }
        else
        {
            _firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);
        }

        _firebaseService.SetIsSessionRecording(sessionKey, false);
        _firebaseService.SetFailedVideoIds(sessionKey, Shared.Helpers.GetFailedVideosInSession(blobService, sessionKey));
        _firebaseService.SetMaxSessionStorageUsage(sessionKey);

        return req.CreateResponse(System.Net.HttpStatusCode.NoContent);
    }
}

