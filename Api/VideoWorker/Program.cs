using Azure.Storage.Blobs;
using FireSharp.Config;
using Microsoft.Extensions.Logging;
using Shared;
using VideoWorker;

using var loggerFactory = LoggerFactory.Create(builder => builder.AddSimpleConsole(options =>
{
    options.SingleLine = true;
    options.TimestampFormat = "HH:mm:ss ";
}));
var logger = loggerFactory.CreateLogger("VideoWorker");

var jobMode = Environment.GetEnvironmentVariable("JOB_MODE");
var connectionString = Environment.GetEnvironmentVariable("StorageConnectionString");
var firebaseAuthSecret = Environment.GetEnvironmentVariable("FireSharp__AuthSecret");
var firebaseBasePath = Environment.GetEnvironmentVariable("FireSharp__BasePath");

if (string.IsNullOrEmpty(jobMode) || string.IsNullOrEmpty(connectionString) ||
    string.IsNullOrEmpty(firebaseAuthSecret) || string.IsNullOrEmpty(firebaseBasePath))
{
    logger.LogError("Required environment variables: JOB_MODE (encode|finalvideo), StorageConnectionString, FireSharp__AuthSecret, FireSharp__BasePath");
    return 1;
}

var blobService = new BlobServiceClient(connectionString);
var firebaseService = new FirebaseService(new FirebaseConfig
{
    AuthSecret = firebaseAuthSecret,
    BasePath = firebaseBasePath,
});

IQueueJob job = jobMode switch
{
    "encode" => new EncodeJob(blobService, firebaseService, logger),
    "finalvideo" => new FinalVideoJob(blobService, firebaseService, logger),
    _ => throw new ArgumentException($"Unknown JOB_MODE '{jobMode}', expected 'encode' or 'finalvideo'"),
};

logger.LogInformation("Starting {jobMode} worker, draining queue {queueName}", jobMode, job.QueueName);

var queueClient = QueueHelpers.GetQueueClient(connectionString, job.QueueName);
var processedCount = 0;

while (true)
{
    var response = await queueClient.ReceiveMessageAsync(job.VisibilityTimeout);
    var message = response.Value;
    if (message == null)
    {
        logger.LogInformation("Queue empty, exiting after {count} message(s)", processedCount);
        break;
    }

    var messageBody = message.Body.ToString();

    if (message.DequeueCount > job.MaxDequeueCount)
    {
        logger.LogError("Message exceeded {max} attempts, running failure path: {body}", job.MaxDequeueCount, messageBody);
        try
        {
            await job.HandlePoisonAsync(messageBody);
        }
        catch (Exception e)
        {
            logger.LogError(e, "Failure path itself failed for message: {body}", messageBody);
        }
        await queueClient.DeleteMessageAsync(message.MessageId, message.PopReceipt);
        continue;
    }

    try
    {
        await job.ProcessAsync(messageBody, CancellationToken.None);
        await queueClient.DeleteMessageAsync(message.MessageId, message.PopReceipt);
        processedCount++;
    }
    catch (Exception e)
    {
        // Leave the message in the queue; it reappears after the visibility
        // timeout and is retried until MaxDequeueCount is exceeded.
        logger.LogError(e, "Processing failed (attempt {attempt}/{max}): {body}", message.DequeueCount, job.MaxDequeueCount, messageBody);
    }
}

return 0;
