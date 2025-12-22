namespace Shared.Models;

public class UnEncodedFileMetaData(
    Guid id,
    DateTimeOffset createdOn,
    string createdOnString,
    string videoType,
    string sessionKey,
    string fileType
    )
{
    public Guid Id { get; } = id;
    public DateTimeOffset CreatedOn { get; } = createdOn;
    public string CreatedOnString { get; } = createdOnString;
    public string VideoType { get; } = videoType;
    public string SessionKey { get; } = sessionKey;
    public string FileType { get; } = fileType;

    public string GetVideoFileName()
    {
        return $"{Id}&{CreatedOn.ToUnixTimeMilliseconds()}&{VideoType}&{SessionKey}.{FileType}";
    }

    public string GetSubFileName()
    {
        return $"{Id}&{CreatedOn.ToUnixTimeMilliseconds()}&{VideoType}&{SessionKey}.txt";
    }

    public static UnEncodedFileMetaData GetVideoFileMetaDataFromFileName(string fileName)
    {
        var nameParts = fileName.Split('.');
        var baseName = nameParts.First();
        var extension = nameParts.Last().ToLowerInvariant();
        var metadata = baseName.Split("&");
        return new UnEncodedFileMetaData(
                id: Guid.Parse(metadata[0]),
                createdOn: DateTimeOffset.FromUnixTimeMilliseconds(long.Parse(metadata[1])),
                createdOnString: metadata[1],
                videoType: metadata[2],
                sessionKey: metadata[3],
                fileType: extension
            );
    }
}
