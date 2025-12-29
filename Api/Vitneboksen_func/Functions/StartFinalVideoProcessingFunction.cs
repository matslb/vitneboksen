using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using Azure.Storage.Queues;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
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

        var queryParams = RequestHelper.ExtractQueryParameters(req.Url.Query);
        queryParams.TryGetValue("sessionKey", out var sessionKey);

        if (string.IsNullOrEmpty(sessionKey))
        {
            return req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
        }

        // Create queue client
        var queueClient = new QueueClient(storageConnectionString, "final-video-processing-requests");
        
        // Ensure queue exists
        await queueClient.CreateIfNotExistsAsync();

        // Create message with sessionKey and optional requestId
        var message = new
        {
            sessionKey = sessionKey,
            requestId = System.Guid.NewGuid().ToString()
        };

        var messageJson = JsonConvert.SerializeObject(message);
        var messageBytes = System.Text.Encoding.UTF8.GetBytes(messageJson);
        var base64Message = System.Convert.ToBase64String(messageBytes);

        // Enqueue message
        await queueClient.SendMessageAsync(base64Message);

        // Update Firebase status
        _firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.started);

        return req.CreateResponse(System.Net.HttpStatusCode.OK);
    }
}

