using Azure;
using Azure.Storage.Blobs;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Shared;
using System;
using System.Globalization;
using System.Threading.Tasks;

namespace FfmpegFunction;

public class DeleteOldSessions
{
    private readonly ILogger _logger;
    private readonly IConfiguration _configuration;
    private readonly FirebaseService _firebaseService;
    public DeleteOldSessions(ILoggerFactory loggerFactory, IConfiguration configuration)
    {
        _logger = loggerFactory.CreateLogger<DeleteOldSessions>();
        _configuration = configuration;
        _firebaseService = new FirebaseService(new FireSharp.Config.FirebaseConfig
        {
            AuthSecret = Environment.GetEnvironmentVariable("FireSharp__AuthSecret"),
            BasePath = Environment.GetEnvironmentVariable("FireSharp__BasePath"),
        });
    }

    [Function("DeleteOldSessions")]
    public async Task Run([TimerTrigger("1 1 * * *")] TimerInfo myTimer)
    {
        string connectionString = _configuration.GetConnectionString("AzureWebJobsStorage");

        var blobServiceClient = new BlobServiceClient(connectionString);
        var now = DateTimeOffset.UtcNow;

        await foreach (var container in blobServiceClient.GetBlobContainersAsync())
        {
            try
            {
                var containerClient = blobServiceClient.GetBlobContainerClient(container.Name);
                var props = await containerClient.GetPropertiesAsync();

                if (!props.Value.Metadata.TryGetValue("created", out string createdStr))
                {
                    _logger.LogInformation($"Container {container.Name} has no 'created' metadata. Skipping.");
                    continue;
                }

                if (!DateTimeOffset.TryParse(createdStr, CultureInfo.InvariantCulture, out var createdDate))
                {
                    _logger.LogWarning($"Invalid 'created' date on container {container.Name}. Skipping.");
                    continue;
                }

                if (now - createdDate > TimeSpan.FromDays(7))
                {
                    await containerClient.DeleteIfExistsAsync();
                    _logger.LogInformation($"Deleted container: {container.Name} in Azure");

                    var sessionKey = container.Name.Split("-")[0];
                    _firebaseService.DeleteSession(sessionKey);
                    _logger.LogInformation($"Deleted vitneboks in Firebase: {sessionKey}.");

                }
            }
            catch (RequestFailedException ex)
            {
                _logger.LogError($"Error processing container {container.Name}: {ex.Message}");
            }
        }

    }
}