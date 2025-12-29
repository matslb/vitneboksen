using System;
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

public class CreateSessionFunction
{
    private readonly FirebaseService _firebaseService;
    private readonly IConfiguration _configuration;

    public CreateSessionFunction(FirebaseService firebaseService, IConfiguration configuration)
    {
        _firebaseService = firebaseService;
        _configuration = configuration;
    }

    [Function("CreateSession")]
    public async Task<HttpResponseData> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "create-session")] HttpRequestData req)
    {
        var storageConnectionString = _configuration["StorageConnectionString"] ?? 
                                     _configuration.GetConnectionString("AzureWebJobsStorage") ?? "";
        var blobService = new BlobServiceClient(storageConnectionString);

        // Extract query parameters
        var queryParams = RequestHelper.ExtractQueryParameters(req.Url.Query);
        queryParams.TryGetValue("uid", out var uid);
        queryParams.TryGetValue("sessionKey", out var sessionKey);

        if (string.IsNullOrEmpty(uid) || string.IsNullOrEmpty(sessionKey))
        {
            var badRequestResponse = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
            return badRequestResponse;
        }

        // Extract userToken from cookie
        var userTokenFromCookie = RequestHelper.ExtractCookieValue(req, "userToken");

        if (string.IsNullOrWhiteSpace(userTokenFromCookie) || 
            string.IsNullOrWhiteSpace(sessionKey) || 
            !_firebaseService.AuthorizeUser(uid, userTokenFromCookie))
        {
            var unauthorizedResponse = req.CreateResponse(System.Net.HttpStatusCode.Unauthorized);
            return unauthorizedResponse;
        }

        _firebaseService.SetUidSessionLookup(sessionKey, uid);

        var containerClient = Shared.Helpers.GetContainerBySessionKey(blobService, sessionKey);

        if (containerClient == null)
        {
            containerClient = blobService.GetBlobContainerClient($"{sessionKey}-{uid.ToLowerInvariant()}");
            await containerClient.CreateAsync();
            containerClient.SetMetadata(new Dictionary<string, string> { { "created", DateTime.Now.ToString() } });
            _firebaseService.SetDeletionFromDate(sessionKey, DateTime.Now);
            _firebaseService.SetMaxSessionStorageUsage(sessionKey);
        }

        var response = req.CreateResponse(System.Net.HttpStatusCode.Created);
        return response;
    }
}

