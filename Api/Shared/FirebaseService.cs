using Azure;
using Azure.Storage.Blobs.Models;
using FireSharp;
using FireSharp.Config;
using Shared.Models;
using System.Linq;

namespace Shared;

public class FirebaseService(FirebaseConfig firebaseConfig)
{
    private readonly FirebaseClient firebaseClient = new(firebaseConfig);

    public void SetToBeProcessedCount(string sessionKey, Pageable<BlobItem> blobItems)
    {
        var uid = GetUidFromSessionKey(sessionKey);
        var count = blobItems.Count(blob =>
            blob.Name.Contains(sessionKey) &&
            (blob.Name.EndsWith(".webm", StringComparison.OrdinalIgnoreCase) ||
             blob.Name.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase)));
        firebaseClient.Set($"{uid}/vitnebokser/{sessionKey}/videosToBeProcessed", count);
    }

    public void SetMaxSessionStorageUsage(string sessionKey)
    {
        var uid = GetUidFromSessionKey(sessionKey);
        firebaseClient.Set($"{uid}/vitnebokser/{sessionKey}/maxStorage", Constants.MaxStoragePerSession);
        firebaseClient.Set($"publicVitnebokser/{sessionKey}/maxStorage", Constants.MaxStoragePerSession);
    }

    public void SetFinalVideoProcessingStatus(string sessionKey, FinalVideoProcessingStatus status)
    {
        var uid = GetUidFromSessionKey(sessionKey);
        firebaseClient.Set($"{uid}/vitnebokser/{sessionKey}/finalVideoProcessingStatus", status);
        firebaseClient.Set($"publicVitnebokser/{sessionKey}/finalVideoProcessingStatus", status);
    }

    public void SetIsSessionRecording(string sessionKey, bool isRecording)
    {
        firebaseClient.Set($"activeSessions/{sessionKey}", isRecording);
    }

    public string GetSessionName(string sessionKey)
    {
        var uid = GetUidFromSessionKey(sessionKey);
        var firebaseResponse = firebaseClient.Get($"{uid}/vitnebokser/{sessionKey}/title");
        return firebaseResponse.ResultAs<string>();
    }

    public string GetUidFromSessionKey(string sessionKey)
    {
        var firebaseResponse = firebaseClient.Get($"publicVitnebokser/{sessionKey}/uid");
        return firebaseResponse.ResultAs<string>();
    }

    public void DeleteSession(string sessionKey)
    {
        var uid = GetUidFromSessionKey(sessionKey);
        firebaseClient.Delete($"{uid}/vitnebokser/{sessionKey}");
        firebaseClient.Delete($"publicVitnebokser/{sessionKey}");
        firebaseClient.Delete($"activeSessions/{sessionKey}");

    }

    public void SetDeletionFromDate(string sessionKey, DateTimeOffset date)
    {
        var uid = GetUidFromSessionKey(sessionKey);
        firebaseClient.Set($"{uid}/vitnebokser/{sessionKey}/deletionFromDate", date.ToUniversalTime());
    }

    public bool AuthourizeUser(string sessionKey, string userToken, string? uid = null)
    {
        if (uid == null)
            uid = GetUidFromSessionKey(sessionKey);
        var storedToken = firebaseClient.Get($"userTokens/{uid}").ResultAs<string>();
        return userToken.Equals(storedToken);
    }

    public void SetCompletedVideosCount(string sessionKey, Pageable<BlobItem> blobItems)
    {
        var uid = GetUidFromSessionKey(sessionKey);
        var count = blobItems.Count(blob => blob.Name.Contains(".mp4") && blob.Name != Constants.FinalVideoFileName);
        firebaseClient.Set($"{uid}/vitnebokser/{sessionKey}/completedVideos", count);
    }

    public void SetCompletedVideos(string sessionKey, Pageable<BlobItem> blobItems)
    {
        var uid = GetUidFromSessionKey(sessionKey);

        var videoNames = blobItems.Where(blob => blob.Name.Contains(".mp4") && blob.Name != Constants.FinalVideoFileName).Select(b => b.Name.Split(".").First());
        firebaseClient.Set($"{uid}/vitnebokser/{sessionKey}/completedVideoIds", videoNames);
    }

    public void SetFailedVideoIds(string sessionKey, List<BlobItem> blobItems)
    {
        var uid = GetUidFromSessionKey(sessionKey);
        firebaseClient.Set($"{uid}/vitnebokser/{sessionKey}/failedVideoIds", blobItems.Select(b => UnEncodedFileMetaData.GetVideoFileMetaDataFromFileName(b.Name).CreatedOnString));
    }

    public void SetSessionStorageUsage(string sessionKey, int storageUsage)
    {
        var uid = GetUidFromSessionKey(sessionKey);
        firebaseClient.Set($"{uid}/vitnebokser/{sessionKey}/sessionStorageUsage", storageUsage);
    }

    public enum FinalVideoProcessingStatus
    {
        notStarted = 0,
        started = 1,
        completed = 2
    }
}
