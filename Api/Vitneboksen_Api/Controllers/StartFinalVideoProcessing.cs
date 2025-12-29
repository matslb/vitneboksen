using Azure.Storage.Queues;
using Newtonsoft.Json;
using Shared;
using Shared.Models;

namespace Vitneboksen_Api.Controllers;

public static class StartFinalVideoProcessing
{
    public static async Task<IResult> Run(HttpRequest req, string constring, FirebaseService firebaseService)
    {
        var sessionKey = req.Query["sessionKey"].ToString();

        if (sessionKey == null)
        {
            return Results.BadRequest();
        }

        // Create queue client
        var queueClient = new QueueClient(constring, "final-video-processing-requests");
        
        // Ensure queue exists
        await queueClient.CreateIfNotExistsAsync();

        // Create message with sessionKey and optional requestId
        var message = new
        {
            sessionKey = sessionKey,
            requestId = Guid.NewGuid().ToString()
        };

        var messageJson = JsonConvert.SerializeObject(message);
        var messageBytes = System.Text.Encoding.UTF8.GetBytes(messageJson);
        var base64Message = Convert.ToBase64String(messageBytes);

        // Enqueue message
        await queueClient.SendMessageAsync(base64Message);

        // Update Firebase status
        firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.started);

        return Results.Ok();
    }
}
