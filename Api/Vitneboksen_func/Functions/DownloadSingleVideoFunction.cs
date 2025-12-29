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

public class DownloadSingleVideoFunction
{
    private readonly FirebaseService _firebaseService;
    private readonly IConfiguration _configuration;

    public DownloadSingleVideoFunction(FirebaseService firebaseService, IConfiguration configuration)
    {
        _firebaseService = firebaseService;
        _configuration = configuration;
    }

    [Function("DownloadSingleVideo")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "video/{fileName}/download")] HttpRequestData req,
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

        var sessionName = _firebaseService.GetSessionName(sessionKey);
        var blob = containerClient.GetBlobClient($"{fileName}.mp4");
        var blobContent = await blob.DownloadContentAsync();

        var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "video/mp4");
        response.Headers.Add("Content-Disposition", $"attachment; filename=\"{fileName}.mp4\"");
        await blobContent.Value.Content.ToStream().CopyToAsync(response.Body);
        return response;
    }
}

