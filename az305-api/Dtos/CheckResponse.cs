using System.Text.Json.Serialization;

namespace az305_api.Dtos;

public class CheckResponse
{
    [JsonPropertyName("isCorrect")]
    public bool   IsCorrect     { get; set; }
    [JsonPropertyName("correctAnswer")]
    public string CorrectAnswer { get; set; } = "";
    [JsonPropertyName("explanation")]
    public string Explanation   { get; set; } = "";
    [JsonPropertyName("referenceUrl")]
    public string? ReferenceUrl { get; set; }
}
