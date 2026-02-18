using Azure;
using Azure.Storage.Blobs;
using FirebaseAdmin.Auth;
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
    private readonly FirebaseAuth _firebaseAuth;

    public DeleteOldSessions(ILoggerFactory loggerFactory, IConfiguration configuration, FirebaseService firebaseService, FirebaseAuth firebaseAuth)
    {
        _logger = loggerFactory.CreateLogger<DeleteOldSessions>();
        _configuration = configuration;
        _firebaseAuth = firebaseAuth;
        _firebaseService = firebaseService;
    }

    [Function("DeleteOldSessions")]
    public async Task Run([TimerTrigger("0 0 * * *")] TimerInfo myTimer)
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

                if (now - createdDate > TimeSpan.FromDays(Constants.DaysBeforeDeletion))
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

    private async Task CleanUpAnonymousUsers()
    {
        var result = FirebaseAuth.DefaultInstance.ListUsersAsync(new ListUsersOptions
        {
            PageSize = 1000,
            PageToken = ""
        });

        var cutoff = DateTimeOffset.UtcNow.AddDays(-7);

        await foreach (var user in result)
        {
            bool isAnonymous = user.ProviderData.Length == 0;
            var created = user.UserMetaData.CreationTimestamp;

            if (isAnonymous && created < cutoff)
            {
                await FirebaseAuth.DefaultInstance.DeleteUserAsync(user.Uid);
            }
        }
    }
}