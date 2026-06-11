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

        if (firebaseService.GetFinalVideoProcessingStatus(sessionKey) == FirebaseService.FinalVideoProcessingStatus.started)
        {
            return Results.Ok();
        }

        firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.started);

        await QueueHelpers.EnqueueJsonAsync(constring, Constants.FinalVideoQueueName, new FinalVideoRequestMessage(sessionKey));

        return Results.Ok();
    }
}
