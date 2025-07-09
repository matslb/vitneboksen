using FireSharp;
using FireSharp.Config;

namespace Shared;

public class FirebaseService(FirebaseConfig firebaseConfig)
{
    private readonly FirebaseClient firebaseClient = new(firebaseConfig);

    public void SetToBeProcessedCount(string sessionKey, int count)
    {
        var uid = GetUidFromSessionKey(sessionKey);
        firebaseClient.Set($"{uid}/vitnebokser/{sessionKey}/videosToBeProcessed", count);
    }

    public void SetCompletedVideosCount(string sessionKey, int count)
    {
        var uid = GetUidFromSessionKey(sessionKey);
        firebaseClient.Set($"{uid}/vitnebokser/{sessionKey}/completedVideos", count);
    }

    public void SetFinalVideoProcessingStatus(string sessionKey, FinalVideoProcessingStatus status)
    {
        var uid = GetUidFromSessionKey(sessionKey);
        firebaseClient.Set($"{uid}/vitnebokser/{sessionKey}/finalVideoProcessingStatus", status);
        firebaseClient.Set($"publicVitnebokser/{sessionKey}/finalVideoProcessingStatus", status);
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
    }

    public void SetDeletionFromDate(string sessionKey, DateTimeOffset date)
    {
        var uid = GetUidFromSessionKey(sessionKey);
        firebaseClient.Set($"{uid}/vitnebokser/{sessionKey}/deletionFromDate", date.ToUniversalTime());
    }

    public enum FinalVideoProcessingStatus
    {
        notStarted = 0,
        started = 1,
        completed = 2
    }
}
