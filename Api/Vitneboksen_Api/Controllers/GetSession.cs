using Shared;

namespace Vitneboksen_Api.Controllers;

public static class GetSession
{
    public static async Task<IResult> Run(HttpRequest req, string constring)
    {
        var blobService = new Azure.Storage.Blobs.BlobServiceClient(constring);

        var sessionKey = req.Query["sessionKey"]!;
        string sharingKey;

        var containerClient = Helpers.GetContainerBySessionKey(blobService, sessionKey!);
        if (containerClient == null)
        {
            sharingKey = Guid.NewGuid().ToString().Substring(0, 8);
            containerClient = blobService.GetBlobContainerClient($"{sessionKey}-{sharingKey}");
            await containerClient.CreateAsync();
        }
        else
        {
            sharingKey = containerClient.Name.Split("-").Last();
        }

        var blobs = containerClient.GetBlobs();
        var testimonials = blobs.Count(b => b.Name.Contains(Constants.VideoTypes.Testimonial));
        var actionshots = blobs.Count(b => b.Name.Contains(Constants.VideoTypes.ActionShot));

        var latestUploadTime = blobs.Where(b => b.Name != Constants.FinalVideoFileName).MaxBy(b => b.Properties.CreatedOn)?.Properties.CreatedOn;
        var blobClient = containerClient.GetBlobClient(Constants.SessionInfoFileName);

        var session = await Helpers.GetBlobFromStorage<Session>(containerClient, Constants.SessionInfoFileName);
        if (session == null)
        {
            session = new Session("Vitneboksen", []);
            await Helpers.UploadJsonToStorage(blobClient, session);
        }

        var finalVideoContainerClient = blobService.GetBlobContainerClient(Constants.FinalVideoProcessingContainer);
        var finalVideoProcessingBlob = finalVideoContainerClient.GetBlobClient(sessionKey);

        return Results.Ok(new SessionStatus(
            SessionName: session.SessionName,
            SessionKey: sessionKey!,
            SharingKey: sharingKey,
            Testimonials: testimonials,
            Actionshots: actionshots,
            FinalVideoCompleted: blobs.Any(b => b.Name == Constants.FinalVideoFileName),
            FinalVideoStarted: finalVideoProcessingBlob.Exists(),
            latestUploadTime,
            session.Questions));
    }
}
