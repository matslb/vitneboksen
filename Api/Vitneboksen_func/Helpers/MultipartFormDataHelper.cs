using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Vitneboksen_func.Helpers;

public class MultipartFormDataHelper
{
    public class FormFile
    {
        public string Name { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public Stream Content { get; set; } = null!;
    }

    public class FormField
    {
        public string Name { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
    }

    public static async Task<(List<FormFile> Files, Dictionary<string, string> Fields)> ParseAsync(Stream requestBody, string contentType)
    {
        var files = new List<FormFile>();
        var fields = new Dictionary<string, string>();

        if (!contentType.Contains("multipart/form-data"))
        {
            return (files, fields);
        }

        var boundary = ExtractBoundary(contentType);
        if (string.IsNullOrEmpty(boundary))
        {
            return (files, fields);
        }

        var boundaryBytes = Encoding.UTF8.GetBytes($"--{boundary}");
        var buffer = new byte[8192];
        var data = new List<byte>();
        int bytesRead;

        while ((bytesRead = await requestBody.ReadAsync(buffer, 0, buffer.Length)) > 0)
        {
            data.AddRange(buffer.Take(bytesRead));
        }

        var dataArray = data.ToArray();
        var parts = SplitByBoundary(dataArray, boundaryBytes);

        foreach (var part in parts)
        {
            var (name, fileName, partContentType, content) = ParsePart(part);
            if (!string.IsNullOrEmpty(fileName))
            {
                files.Add(new FormFile
                {
                    Name = name,
                    FileName = fileName,
                    ContentType = partContentType,
                    Content = new MemoryStream(content)
                });
            }
            else if (!string.IsNullOrEmpty(name))
            {
                var value = Encoding.UTF8.GetString(content).Trim();
                fields[name] = value;
            }
        }

        return (files, fields);
    }

    private static string ExtractBoundary(string contentType)
    {
        var boundaryIndex = contentType.IndexOf("boundary=", StringComparison.OrdinalIgnoreCase);
        if (boundaryIndex == -1) return string.Empty;

        var boundary = contentType.Substring(boundaryIndex + 9);
        if (boundary.StartsWith("\""))
        {
            boundary = boundary.Trim('"');
        }
        return boundary.Trim();
    }

    private static List<byte[]> SplitByBoundary(byte[] data, byte[] boundary)
    {
        var parts = new List<byte[]>();
        var startIndex = 0;

        while (startIndex < data.Length)
        {
            var index = FindSequence(data, boundary, startIndex);
            if (index == -1)
            {
                if (startIndex < data.Length)
                {
                    var remaining = new byte[data.Length - startIndex];
                    Array.Copy(data, startIndex, remaining, 0, remaining.Length);
                    if (remaining.Length > 0)
                    {
                        parts.Add(remaining);
                    }
                }
                break;
            }

            if (index > startIndex)
            {
                var part = new byte[index - startIndex];
                Array.Copy(data, startIndex, part, 0, part.Length);
                parts.Add(part);
            }

            startIndex = index + boundary.Length;
            // Skip CRLF after boundary
            if (startIndex < data.Length && data[startIndex] == 13) startIndex++;
            if (startIndex < data.Length && data[startIndex] == 10) startIndex++;
        }

        return parts.Where(p => p.Length > 0 && !IsEndBoundary(p, boundary)).ToList();
    }

    private static bool IsEndBoundary(byte[] part, byte[] boundary)
    {
        if (part.Length < boundary.Length + 2) return false;
        var endMarker = Encoding.UTF8.GetBytes("--");
        return part.Take(2).SequenceEqual(endMarker) && 
               part.Skip(2).Take(boundary.Length).SequenceEqual(boundary);
    }

    private static int FindSequence(byte[] data, byte[] sequence, int startIndex)
    {
        for (int i = startIndex; i <= data.Length - sequence.Length; i++)
        {
            bool match = true;
            for (int j = 0; j < sequence.Length; j++)
            {
                if (data[i + j] != sequence[j])
                {
                    match = false;
                    break;
                }
            }
            if (match) return i;
        }
        return -1;
    }

    private static (string name, string fileName, string contentType, byte[] content) ParsePart(byte[] part)
    {
        var headerEnd = FindSequence(part, Encoding.UTF8.GetBytes("\r\n\r\n"), 0);
        if (headerEnd == -1) return (string.Empty, string.Empty, string.Empty, Array.Empty<byte>());

        var headerBytes = new byte[headerEnd];
        Array.Copy(part, 0, headerBytes, 0, headerEnd);
        var headers = Encoding.UTF8.GetString(headerBytes);

        var contentStart = headerEnd + 4; // Skip \r\n\r\n
        var contentLength = part.Length - contentStart;
        // Remove trailing \r\n if present
        if (contentLength >= 2 && part[part.Length - 2] == 13 && part[part.Length - 1] == 10)
        {
            contentLength -= 2;
        }

        var content = new byte[contentLength];
        Array.Copy(part, contentStart, content, 0, contentLength);

        var name = ExtractHeaderValue(headers, "name=");
        var fileName = ExtractHeaderValue(headers, "filename=");
        var partContentType = ExtractHeaderValue(headers, "Content-Type:");

        return (name, fileName, partContentType, content);
    }

    private static string ExtractHeaderValue(string headers, string key)
    {
        var keyIndex = headers.IndexOf(key, StringComparison.OrdinalIgnoreCase);
        if (keyIndex == -1) return string.Empty;

        var startIndex = keyIndex + key.Length;
        if (key == "name=" || key == "filename=")
        {
            if (startIndex < headers.Length && headers[startIndex] == '"')
            {
                startIndex++;
                var endIndex = headers.IndexOf('"', startIndex);
                if (endIndex != -1)
                {
                    return headers.Substring(startIndex, endIndex - startIndex);
                }
            }
            else
            {
                var endIndex = headers.IndexOfAny(new[] { ';', '\r', '\n' }, startIndex);
                if (endIndex == -1) endIndex = headers.Length;
                return headers.Substring(startIndex, endIndex - startIndex).Trim();
            }
        }
        else if (key == "Content-Type:")
        {
            var endIndex = headers.IndexOfAny(new[] { '\r', '\n' }, startIndex);
            if (endIndex == -1) endIndex = headers.Length;
            return headers.Substring(startIndex, endIndex - startIndex).Trim();
        }

        return string.Empty;
    }
}

