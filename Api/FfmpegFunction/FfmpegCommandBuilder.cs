using System.Globalization;

namespace FfmpegFunction;

public enum TextPlacement
{
    Subtitle,
    Centered
}

public static class FfmpegCommandBuilder
{
    public static string WithText(
        string sourceVideoPath,
        string subtitles,
        string outputVideoPath,
        int fontSize,
        TextPlacement placement,
        double? startTime = null,
        double? endTime = null)
    {
        string escapedSubtitles = EscapeForFfmpeg(subtitles);

        // Set vertical position based on placement mode
        string verticalPosition = placement switch
        {
            TextPlacement.Subtitle => "h-100",        // Near the bottom
            TextPlacement.Centered => "(h-text_h)/2", // Vertically centered
            _ => "h-100"
        };

        // If startTime and endTime are null, the subtitle will be shown for the whole video.
        string enableOption = startTime.HasValue && endTime.HasValue
            ? $"enable='between(t,{startTime.Value.ToString(CultureInfo.InvariantCulture)},{endTime.Value.ToString(CultureInfo.InvariantCulture)})'"
            : ""; // No enable option, text is shown for the whole duration.

        return $"-i \"{sourceVideoPath}\" -filter:a \"volume=3\" -vf \"scale=-1:1080," +
               $"pad=1920:1080:(1920-iw)/2:(1080-ih)/2," +
               $"drawtext=text='{escapedSubtitles}':font='Arial':fontcolor=white:fontsize={fontSize}:" +
               $"x=(w-text_w)/2:y={verticalPosition}:shadowcolor=black:shadowx=4:shadowy=4:{enableOption}\" " +
               $"-r 30 -c:v libx264 -c:a aac -b:a 192k -ar 48000 \"{outputVideoPath}\"";
    }

    public static string WithoutText(string sourceVideoPath, string outputVideoPath)
    {
        return $"-i \"{sourceVideoPath}\" -filter:a \"volume=3\" -vf \"scale=-1:1080," +
              $"pad=1920:1080:(1920-iw)/2:(1080-ih)/2," +
              $"drawtext=text='':font='Arial':fontcolor=white:fontsize=10:" +
              $"x=(w-text_w)/2:y=h-100:shadowcolor=black:shadowx=4:shadowy=4:\" " +
              $"-r 30 -c:v libx264 -c:a aac -ar 48000 \"{outputVideoPath}\"";
    }

    internal static string ConcatVideos(string fileListPath, string outputFilePath)
    {
        return $"-f concat -safe 0 -i {fileListPath} -c:v copy -c:a copy {outputFilePath}";
    }

    internal static string HandheldFormat(string sourceVideoPath, string outputFilePath)
    {
        return $"-i \"{sourceVideoPath}\" -filter:a \"volume=3\" -vf \"scale=-1:720,pad=1280:720:(1280-iw)/2:(720-ih)/2\" -r 30 -c:v libx264 -c:a aac -ar 48000 \"{outputFilePath}\"";
    }

    private static string EscapeForFfmpeg(string text)
    {
        return text
            .Replace("\\", "\\\\")   // Escape backslashes
            .Replace("'", "\\'")      // Escape single quotes
            .Replace(":", "\\:")      // Escape colons (for Windows paths)
            .Replace("\"", "\\\"")    // Escape double quotes
            .Replace("\n", "\\n")     // Handle new lines
            .Replace("%", "%%");      // Escape percent signs
    }
}
