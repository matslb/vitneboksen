using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Shared;
using Vitneboksen_func.Helpers;

namespace Vitneboksen_func.Functions;

public class DownloadSessionFilesFunction
{
    private readonly FirebaseService _firebaseService;
    private readonly IConfiguration _configuration;

    public DownloadSessionFilesFunction(FirebaseService firebaseService, IConfiguration configuration)
    {
        _firebaseService = firebaseService;
        _configuration = configuration;
    }

    [Function("DownloadSessionFiles")]
    public async Task<HttpResponseData> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "download-session-files")] HttpRequestData req)
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

        var blobs = containerClient.GetBlobsByHierarchyAsync().ConfigureAwait(false);

        using var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
        {
            await foreach (var blobItem in blobs)
            {
                if (blobItem.Blob.Name == Constants.FinalVideoFileName)
                {
                    continue;
                }

                var blobClient = containerClient.GetBlobClient(blobItem.Blob.Name);
                var blobStream = await blobClient.OpenReadAsync();

                var entry = archive.CreateEntry(blobClient.Name, CompressionLevel.Fastest);

                using var entryStream = entry.Open();
                await blobStream.CopyToAsync(entryStream);
            }
        }

        memoryStream.Seek(0, SeekOrigin.Begin);

        var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/zip");
        response.Headers.Add("Content-Disposition", "attachment; filename=\"vitneboksen.zip\"");
        await memoryStream.CopyToAsync(response.Body);
        return response;
    }
}

