﻿namespace Shared.Models;

public class UnEncodedFileMetaData(
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
        return $"{Id}&{CreatedOn.ToUnixTimeMilliseconds()}&{VideoType}&{SessionKey}.webm";
    }

    public string GetSubFileName()
    {
        return $"{Id}&{CreatedOn.ToUnixTimeMilliseconds()}&{VideoType}&{SessionKey}.txt";
    }

    public static UnEncodedFileMetaData GetVideoFileMetaDataFromFileName(string fileName)
    {
        var metadata = fileName.Split(".").First().Split("&");
        return new UnEncodedFileMetaData(
                id: Guid.Parse(metadata[0]),
                createdOn: DateTimeOffset.FromUnixTimeMilliseconds(long.Parse(metadata[1])),
                videoType: metadata[2],
                sessionKey: metadata[3]
            );
    }
}
