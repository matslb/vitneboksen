using System;
using System.IO;
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

public class UploadVideoV2Function
{
    private readonly FirebaseService _firebaseService;
    private readonly IConfiguration _configuration;

    public UploadVideoV2Function(FirebaseService firebaseService, IConfiguration configuration)
    {
        _firebaseService = firebaseService;
        _configuration = configuration;
    }

    [Function("UploadVideoV2")]
    public async Task<HttpResponseData> Run([HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "upload-testimony/v2")] HttpRequestData req)
    {
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
            return req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
        }

        if (Shared.Helpers.IsSessionFull(blobService, sessionKey))
        {
            var badRequestResponse = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
            await badRequestResponse.WriteStringAsync("Video upload limit reached");
            return badRequestResponse;
        }

        // Parse multipart form data
        var contentType = req.Headers.GetValues("Content-Type").FirstOrDefault() ?? "";
        var (files, fields) = await MultipartFormDataHelper.ParseAsync(req.Body, contentType);

        var videoFile = files.FirstOrDefault(f => f.Name == "video");
        fields.TryGetValue("sub", out var subText);

        if (videoFile == null)
        {
            var badRequestResponse = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
            await badRequestResponse.WriteStringAsync("No file, stupid.");
            return badRequestResponse;
        }

        var uploadedExtension = Path.GetExtension(videoFile.FileName)?.TrimStart('.').ToLowerInvariant();
        var videoType = Constants.VideoTypes.Testimonial;

        if ((videoType == Constants.VideoTypes.Testimonial && subText == null) || string.IsNullOrWhiteSpace(uploadedExtension))
        {
            var badRequestResponse = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
            await badRequestResponse.WriteStringAsync("No file, stupid.");
            return badRequestResponse;
        }

        var now = DateTimeOffset.Now;
        var videoMetadata = new UnEncodedFileMetaData(
            id: Guid.NewGuid(),
            createdOn: now,
            createdOnString: now.ToString(),
            videoType: videoType,
            sessionKey: sessionKey,
            fileType: uploadedExtension
        );

        var videoFileName = videoMetadata.GetVideoFileName();
        var unprocessedContainer = Shared.Helpers.GetUnprocessedContainer(blobService);
        await unprocessedContainer.UploadBlobAsync(videoFileName, videoFile.Content);

        if (subText != null)
        {
            var subFileName = videoMetadata.GetSubFileName();
            var subTextBlobClient = unprocessedContainer.GetBlobClient(subFileName);
            await Shared.Helpers.UploadJsonToStorage(subTextBlobClient, subText);
        }

        _firebaseService.SetToBeProcessedCount(sessionKey, unprocessedContainer.GetBlobs());
        _firebaseService.SetFinalVideoProcessingStatus(sessionKey, FirebaseService.FinalVideoProcessingStatus.notStarted);
        _firebaseService.SetFailedVideoIds(sessionKey, Shared.Helpers.GetFailedVideosInSession(blobService, sessionKey));
        _firebaseService.SetMaxSessionStorageUsage(sessionKey);

        return req.CreateResponse(System.Net.HttpStatusCode.Created);
    }
}

