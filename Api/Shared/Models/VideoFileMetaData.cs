namespace Shared.Models;

public class VideoFileMetaData(
    Guid id,
    DateTimeOffset createdOn,
    string videoType,
    string sessionKey
    )
{
    public Guid Id { get; } = id;
    public DateTimeOffset CreatedOn { get; } = createdOn;
    public string VideoType { get; } = videoType;
    public string SessionKey { get; } = sessionKey;

    public string GetVideoFileName()
    {
        return $"{Id}&{CreatedOn.ToUnixTimeSeconds()}&{VideoType}&{SessionKey}.webm";
    }

    public string GetSubFileName()
    {
        return $"{Id}&{CreatedOn.ToUnixTimeSeconds()}&{VideoType}&{SessionKey}.txt";
    }

    public static VideoFileMetaData GetVideoFileMetaDataFromFileName(string fileName)
    {
        var metadata = fileName.Split(".").First().Split("&");
        return new VideoFileMetaData(
                id: Guid.Parse(metadata[0]),
                createdOn: DateTimeOffset.FromUnixTimeMilliseconds(long.Parse(metadata[1])),
                videoType: metadata[2],
                sessionKey: metadata[3]
            );
    }
}
