using az305_api.Dtos;
using az305_api.Services.Data;

namespace az305_api.Services;

public sealed class CheckAnswerResult
{
    public bool IsSuccess { get; init; }
    public CheckResponse? Response { get; init; }
    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }

    public static CheckAnswerResult Success(CheckResponse response) =>
        new() { IsSuccess = true, Response = response };

    public static CheckAnswerResult QuestionNotFound() =>
        new() { IsSuccess = false, ErrorCode = "QuestionNotFound", ErrorMessage = "Question not found" };

    public static CheckAnswerResult InvalidChoice() =>
        new() { IsSuccess = false, ErrorCode = "InvalidChoice", ErrorMessage = "Invalid choice" };
}

public sealed class CheckAnswerService
{
    private readonly QuestionRepository _questions;
    private readonly SessionRepository _sessions;

    public CheckAnswerService(
        QuestionRepository questions,
        SessionRepository sessions)
    {
        _questions = questions;
        _sessions = sessions;
    }

    /// <summary>
    /// 回答の正誤チェック、回答保存、進捗更新をまとめて処理する
    /// </summary>
    public async Task<CheckAnswerResult> ExecuteAsync(string userId, CheckRequest body)
    {
        var result = await _questions.CheckAnswerAsync(body.QuestionId, body.Selected);
        if (result == null)
            return CheckAnswerResult.QuestionNotFound();

        var choiceId = await _questions.GetChoiceIdAsync(body.QuestionId, body.Selected);
        if (choiceId == null)
            return CheckAnswerResult.InvalidChoice();

        await _sessions.InsertSessionAnswerAsync(
            userId,
            body.SessionId,
            body.QuestionId,
            choiceId,
            result.IsCorrect,
            body.TimeSeconds);

        await _questions.UpdateUserProgressAsync(
            userId,
            body.QuestionId,
            result.IsCorrect);

        return CheckAnswerResult.Success(result);
    }
}