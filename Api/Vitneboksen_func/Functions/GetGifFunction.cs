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

public class GetGifFunction
{
    private readonly FirebaseService _firebaseService;
    private readonly IConfiguration _configuration;

    public GetGifFunction(FirebaseService firebaseService, IConfiguration configuration)
    {
        _firebaseService = firebaseService;
        _configuration = configuration;
    }

    [Function("GetGif")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "getgif/{fileName}")] HttpRequestData req,
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

        if (string.IsNullOrEmpty(sessionKey) || string.IsNullOrEmpty(fileName))
        {
            var badRequestResponse = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
            await badRequestResponse.WriteStringAsync("Missing sessionKey, or fileName.");
            return badRequestResponse;
        }

        var containerClient = Shared.Helpers.GetContainerBySessionKey(blobService, sessionKey);
        if (containerClient == null)
        {
            return req.CreateResponse(System.Net.HttpStatusCode.NotFound);
        }

        var gifBlob = containerClient.GetBlobClient($"{fileName}.gif");

        if (!await gifBlob.ExistsAsync())
        {
            return req.CreateResponse(System.Net.HttpStatusCode.NotFound);
        }

        var stream = await gifBlob.OpenReadAsync();
        var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "image/gif");
        response.Headers.Add("Cache-Control", "private, max-age=600");
        response.Headers.Add("Content-Disposition", $"inline; filename=\"{fileName}.gif\"");

        await stream.CopyToAsync(response.Body);
        return response;
    }
}

