using System.Text.Json.Serialization;

namespace Shared;

public record SessionStatus(
string SessionName,
string SessionKey,
string SharingKey,
int Testimonials,
int Actionshots,
bool FinalVideoCompleted,
bool FinalVideoStarted,
DateTimeOffset? LastUpload,
List<Question> Questions);

public record Session(
    string SessionName,
    List<Question> Questions
   );

public record Question(
    [property: JsonPropertyName("text")] string Text,
    [property: JsonPropertyName("countdownTime")] int CountdownTime,
    [property: JsonPropertyName("recordTime")] int RecordTime,
    [property: JsonPropertyName("order")] int Order = 0,
    [property: JsonPropertyName("active")] bool Active = true
    );

