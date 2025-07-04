namespace Shared.Models;

public class EncodedFileMetaData(
    DateTimeOffset createdOn,
    string videoType
    )
{
    public DateTimeOffset CreatedOn { get; } = createdOn;
    public string VideoType { get; } = videoType;

    public string GetVideoFileName()
    {
        return $"{CreatedOn.ToUnixTimeMilliseconds()}-{VideoType}.mp4";
    }

    public static EncodedFileMetaData GetVideoFileMetaDataFromFileName(string fileName)
    {
        var metadata = fileName.Split(".").First().Split("-");
        return new EncodedFileMetaData(createdOn: DateTimeOffset.FromUnixTimeMilliseconds(long.Parse(metadata[0])), videoType: metadata[1]);
    }
}
