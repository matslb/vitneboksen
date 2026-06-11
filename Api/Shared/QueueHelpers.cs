using Azure.Storage.Queues;
using Newtonsoft.Json;

namespace Shared;

public static class QueueHelpers
{
    public static QueueClient GetQueueClient(string connectionString, string queueName)
    {
        var queueClient = new QueueClient(connectionString, queueName, new QueueClientOptions
        {
            MessageEncoding = QueueMessageEncoding.None
        });
        queueClient.CreateIfNotExists();
        return queueClient;
    }

    public static async Task EnqueueJsonAsync(string connectionString, string queueName, object message)
    {
        var queueClient = GetQueueClient(connectionString, queueName);
        await queueClient.SendMessageAsync(JsonConvert.SerializeObject(message));
    }
}
