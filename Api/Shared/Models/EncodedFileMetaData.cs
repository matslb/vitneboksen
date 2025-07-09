namespace Shared.Models;

public class EncodedFileMetaData(
    DateTimeOffset createdOn
    )
{
    public DateTimeOffset CreatedOn { get; } = createdOn;

    public string GetVideoFileName()
    {
        return $"{CreatedOn.ToUnixTimeMilliseconds()}.mp4";
    }
    public string GetGifFileName()
    {
        return $"{CreatedOn.ToUnixTimeMilliseconds()}.gif";
    }
    public static EncodedFileMetaData GetVideoFileMetaDataFromFileName(string fileName)
    {
        var metadata = fileName.Split(".").First();
        return new EncodedFileMetaData(createdOn: DateTimeOffset.FromUnixTimeMilliseconds(long.Parse(metadata)));
    }
}
