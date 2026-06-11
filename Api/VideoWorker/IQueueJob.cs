namespace VideoWorker;

public interface IQueueJob
{
    string QueueName { get; }

    TimeSpan VisibilityTimeout { get; }

    /// <summary>
    /// Messages dequeued more times than this are considered poison:
    /// the failure path runs and the message is deleted.
    /// </summary>
    int MaxDequeueCount { get; }

    Task ProcessAsync(string messageBody, CancellationToken cancellationToken);

    Task HandlePoisonAsync(string messageBody);
}
