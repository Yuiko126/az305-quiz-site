using az305_api.Dtos;

namespace az305_api.Feature.CheckAnswer;

public sealed class CheckAnswerModel
{
    public string SessionId { get; set; } = "";
    public int? TimeSeconds { get; set; }
    public string QuestionId { get; set; } = "";
    public string Selected { get; set; } = ""; // "A" | "B" | "C" | "D"

    public bool IsSuccess { get; init; }
    public CheckResponse? Response { get; init; }
    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }

    public static CheckAnswerModel Success(CheckResponse response) =>
        new() { IsSuccess = true, Response = response };

    public static CheckAnswerModel QuestionNotFound() =>
        new() { IsSuccess = false, ErrorCode = "QuestionNotFound", ErrorMessage = "Question not found" };

    public static CheckAnswerModel InvalidChoice() =>
        new() { IsSuccess = false, ErrorCode = "InvalidChoice", ErrorMessage = "Invalid choice" };
}