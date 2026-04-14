using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Shared;
using Vitneboksen_func.Controllers;

namespace Vitneboksen_func;

public class VitneboksenFunctions
{
    private readonly FirebaseService _firebaseService;
    private readonly string _storageConnectionString;

    public VitneboksenFunctions(FirebaseService firebaseService, StorageConfig storageConfig)
    {
        _firebaseService = firebaseService;
        _storageConnectionString = storageConfig.ConnectionString;
    }

    private async Task<IResult?> Authorize(HttpContext context)
    {
        var userTokenFromCookie = context.Request.Cookies["userToken"];
        var sessionKey = context.Request.Query["sessionKey"].ToString();

        if (string.IsNullOrWhiteSpace(userTokenFromCookie) || string.IsNullOrWhiteSpace(sessionKey))
        {
            return Results.Content("\r\n         / \\\r\n        |\\_/|\r\n        |---|\r\n        |   |\r\n        |   |\r\n      _ |=-=| _\r\n  _  / \\|   |/ \\\r\n / \\|   |   |   ||\\\r\n|   |   |   |   | \\>\r\n|   |   |   |   |   \\\r\n| -   -   -   - |)   )\r\n|                   /\r\n \\                 /\r\n  \\               /\r\n   \\             /\r\n    \\           /\r\n", "text/plain", statusCode: StatusCodes.Status401Unauthorized);
        }

        var authorized = _firebaseService.AuthourizeUserBySessionKey(sessionKey, userTokenFromCookie);
        if (!authorized)
        {
            return Results.Unauthorized();
        }

        return null;
    }

    [Function("UploadTestimonyV2")]
    public async Task<IResult> UploadTestimonyV2([HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "upload-testimony/v2")] HttpRequest req)
    {
        return await UploadVideoV2.Run(req, videoType: Constants.VideoTypes.Testimonial, constring: _storageConnectionString, firebaseService: _firebaseService);
    }

    [Function("CreateSession")]
    public async Task<IResult> CreateSessionFunction([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "create-session")] HttpRequest req)
    {
        return await CreateSession.Run(req, constring: _storageConnectionString, firebaseService: _firebaseService);
    }

    [Function("ForceUpdate")]
    public async Task<IResult> ForceUpdate([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "force-update")] HttpRequest req)
    {
        var auth = await Authorize(req.HttpContext);
        if (auth != null) return auth;
        return await ForceUpdateSessionStatus.Run(req, constring: _storageConnectionString, firebaseService: _firebaseService);
    }

    [Function("GetGif")]
    public async Task<IResult> GetGifFunction([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "getgif/{fileName}")] HttpRequest req, string fileName)
    {
        var auth = await Authorize(req.HttpContext);
        if (auth != null) return auth;
        return await GetGif.Run(req, req.HttpContext.Response, fileName, _storageConnectionString, _firebaseService);
    }

    [Function("DownloadSessionFiles")]
    public async Task<IResult> DownloadSessionFilesFunction([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "download-session-files")] HttpRequest req)
    {
        var auth = await Authorize(req.HttpContext);
        if (auth != null) return auth;
        return await DownloadSessionFiles.Run(req, _storageConnectionString, _firebaseService);
    }

    [Function("StartFinalVideoProcessing")]
    public async Task<IResult> StartFinalVideoProcessingFunction([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "start-final-video-processing")] HttpRequest req)
    {
        var auth = await Authorize(req.HttpContext);
        if (auth != null) return auth;
        return await StartFinalVideoProcessing.Run(req, _storageConnectionString, _firebaseService);
    }

    [Function("DownloadFinalVideo")]
    public async Task<IResult> DownloadFinalVideoFunction([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "download-final-video")] HttpRequest req)
    {
        var auth = await Authorize(req.HttpContext);
        if (auth != null) return auth;
        return await DownloadFinalVideo.Run(req, _storageConnectionString, _firebaseService);
    }

    [Function("DownloadSingleVideo")]
    public async Task<IResult> DownloadSingleVideoFunction([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "video/{fileName}/download")] HttpRequest req, string fileName)
    {
        var auth = await Authorize(req.HttpContext);
        if (auth != null) return auth;
        return await DownloadSingleVideo.Run(req, fileName, _storageConnectionString, _firebaseService);
    }

    [Function("DeleteSession")]
    public async Task<IResult> DeleteSessionFunction([HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "delete-session")] HttpRequest req)
    {
        var auth = await Authorize(req.HttpContext);
        if (auth != null) return auth;
        return await DeleteSession.Run(req, _storageConnectionString, _firebaseService);
    }

    [Function("DeleteVideo")]
    public async Task<IResult> DeleteVideoFunction([HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "delete-video/{fileName}")] HttpRequest req, string fileName)
    {
        var auth = await Authorize(req.HttpContext);
        if (auth != null) return auth;
        return await DeleteVideo.Run(req, fileName, _storageConnectionString, _firebaseService);
    }

    [Function("RetryVideoProcessing")]
    public async Task<IResult> RetryVideoProcessingFunction([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "retry/{id}")] HttpRequest req, string id)
    {
        var auth = await Authorize(req.HttpContext);
        if (auth != null) return auth;
        return await RetryVideoProcessing.Run(req, id, constring: _storageConnectionString, firebaseService: _firebaseService);
    }

    [Function("WakeUp")]
    public IResult WakeUp([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "wake-up")] HttpRequest req)
    {
        return Results.Ok();
    }
}
