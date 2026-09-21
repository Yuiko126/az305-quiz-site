namespace az305_api.Feature.CheckAnswer;

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
    public async Task<CheckAnswerModel> ExecuteAsync(string userId, CheckAnswerModel body)
    {
        // 回答の正誤をチェックする
        var result = await _questions.CheckAnswerAsync(body.QuestionId, body.Selected);

        if (result == null)
            return CheckAnswerModel.QuestionNotFound();

        // 選択肢のIDを取得する
        var choiceId = await _questions.GetChoiceIdAsync(body.QuestionId, body.Selected);

        if (choiceId == null)
            return CheckAnswerModel.InvalidChoice();

        // 回答をセッションに保存
        await _sessions.InsertSessionAnswerAsync(
            userId,
            body.SessionId,
            body.QuestionId,
            choiceId,
            result.IsCorrect,
            body.TimeSeconds);

        // ユーザーの進捗状況を更新
        await _questions.UpdateUserProgressAsync(
            userId,
            body.QuestionId,
            result.IsCorrect);

        // 成功結果を返す
        return CheckAnswerResult.Success(result);
    }
}