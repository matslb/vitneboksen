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

public class DeleteVideoFunction
{
    private readonly FirebaseService _firebaseService;
    private readonly IConfiguration _configuration;

    public DeleteVideoFunction(FirebaseService firebaseService, IConfiguration configuration)
    {
        _firebaseService = firebaseService;
        _configuration = configuration;
    }

    [Function("DeleteVideo")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "delete-video/{fileName}")] HttpRequestData req,
        string fileName)
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
        if (containerClient == null)
        {
            return req.CreateResponse(System.Net.HttpStatusCode.NotFound);
        }

        var blobs = containerClient.GetBlobs().Where(b => b.Name.Contains(fileName) || b.Name.Equals(Constants.FinalVideoFileName));

        foreach (var blob in blobs)
        {
            containerClient.DeleteBlobIfExists(blob.Name);
        }

        _firebaseService.SetCompletedVideosCount(sessionKey, containerClient.GetBlobs());
        _firebaseService.SetCompletedVideos(sessionKey, containerClient.GetBlobs());
        var sessionUsage = Shared.Helpers.GetSessionStorageUsage(blobService, sessionKey);
        _firebaseService.SetSessionStorageUsage(sessionKey, sessionUsage);
        _firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);

        return req.CreateResponse(System.Net.HttpStatusCode.OK);
    }
}

