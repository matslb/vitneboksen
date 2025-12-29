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

public class StartFinalVideoProcessingFunction
{
    private readonly FirebaseService _firebaseService;
    private readonly IConfiguration _configuration;

    public StartFinalVideoProcessingFunction(FirebaseService firebaseService, IConfiguration configuration)
    {
        _firebaseService = firebaseService;
        _configuration = configuration;
    }

    [Function("StartFinalVideoProcessing")]
    public async Task<HttpResponseData> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "start-final-video-processing")] HttpRequestData req)
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

        var containerClient = blobService.GetBlobContainerClient(Constants.FinalVideoProcessingContainer);

        if (containerClient == null)
        {
            return req.CreateResponse(System.Net.HttpStatusCode.NotFound);
        }

        var processingRequest = new FinalVideoProcessingRequest(sessionKey);

        var blobClient = containerClient.GetBlobClient(sessionKey);

        await Shared.Helpers.UploadJsonToStorage(blobClient, processingRequest);

        _firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.started);

        return req.CreateResponse(System.Net.HttpStatusCode.OK);
    }
}

