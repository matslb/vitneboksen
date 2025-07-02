using Azure;
using Azure.Storage.Blobs;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Globalization;
using System.Threading.Tasks;

namespace FfmpegFunction;

public class DeleteOldSessions
{
    private readonly ILogger _logger;
    private readonly IConfiguration _configuration;
    public DeleteOldSessions(ILoggerFactory loggerFactory, IConfiguration configuration)
    {
        _logger = loggerFactory.CreateLogger<DeleteOldSessions>();
        _configuration = configuration;
    }

    [Function("DeleteOldSessions")]
    public async Task Run([TimerTrigger("@daily")] TimerInfo myTimer)
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

                if (now - createdDate > TimeSpan.FromDays(30))
                {
                    await containerClient.DeleteIfExistsAsync();
                    _logger.LogInformation($"Deleted container: {container.Name}");
                }
            }
            catch (RequestFailedException ex)
            {
                _logger.LogError($"Error processing container {container.Name}: {ex.Message}");
            }
        }

    }
}