using System.Net;
using az305_api.Dtos;
using az305_api.Services.Auth;
using az305_api.Services.Data;
using az305_api.Functions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace az305_api.Functions.Check;

/// <summary>
/// 回答の正誤をチェックするAzure Function
/// </summary>
public sealed class CheckAnswerFunction
{
    private readonly QuestionRepository _questions;
    private readonly SessionRepository  _sessions;
    private readonly JwtTokenService    _jwt;
    private readonly CorsHelper        _corsHelper;

    public CheckAnswerFunction(
        QuestionRepository questions,
        SessionRepository  sessions,
        JwtTokenService    jwt,
        CorsHelper        corsHelper)
    {
        _questions = questions;
        _sessions  = sessions;
        _jwt       = jwt;
        _corsHelper = corsHelper;
    }

    /// <summary>
    /// HTTPリクエストを処理するメソッド
    /// </summary>
    /// <param name="req">受け取るHTTPリクエスト</param>
    /// <returns>HTTPレスポンスデータ</returns>
    [Function("CheckAnswer")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(
            AuthorizationLevel.Anonymous,
            "post", "options",
            Route = "check")]
        HttpRequestData req)
    {
        // CORSプリフライトリクエストへの処理
        if (_corsHelper.IsPreflightRequest(req))
            return _corsHelper.CreateCorsPreflightResponse(req);

        try
        {
            // Cookieからアクセストークンを取得
            var token = _corsHelper.GetCookieValue(req, "access_token");

            if (string.IsNullOrEmpty(token))
                return await _corsHelper.UnauthorizedResponseAsync(req);

            // アクセストークンを検証し、ユーザーIDを取得
            var userId = _jwt.ValidateAndGetUserId(token);

            if (string.IsNullOrEmpty(userId))
                return await _corsHelper.UnauthorizedResponseAsync(req);

            // リクエストボディを読み込む
            var body = await req.ReadFromJsonAsync<CheckRequest>();

            if (body == null)
                return await BadRequest(req,"Invalid body");

            // 回答の正誤をチェック
            var result = await _questions.CheckAnswerAsync(body.QuestionId, body.Selected);

            if (result == null)
                return await _corsHelper.NotFoundResponseAsync(req);

            // 選択肢のIDを取得
            var choiceId = await _questions.GetChoiceIdAsync(body.QuestionId, body.Selected);

            // 問題IDや選択肢が無効な場合は400 Bad Requestを返し、エラー内容をJSONに書き込む
            if (choiceId == null)
                return await BadRequest(req, "Invalid choice");

            // セッションの回答を保存
            // 認証済みユーザーID、セッションID、問題ID、選択肢ID、正誤結果、回答時間
            await _sessions.InsertSessionAnswerAsync(
                userId,
                body.SessionId,
                body.QuestionId,
                choiceId,
                result.IsCorrect,
                body.TimeSeconds
            );

            // ユーザーの進捗状況を更新
            // 認証済みユーザーID、問題ID、正誤結果
            await _questions.UpdateUserProgressAsync(
                userId,
                body.QuestionId,
                result.IsCorrect
            );

            // OKレスポンスを作成
            var ok = req.CreateResponse(HttpStatusCode.OK);

            // CORSヘッダーを追加
            _corsHelper.AddHeaders(req, ok);

            // 正誤結果をJSONとしてレスポンスに書き込む
            await ok.WriteAsJsonAsync(result);
            return ok;
        }
        catch (Exception ex)
        {
            Console.WriteLine("=== CHECK ANSWER ERROR ===");
            Console.WriteLine(ex.ToString());

            var err = req.CreateResponse(HttpStatusCode.InternalServerError);
            _corsHelper.AddHeaders(req, err);
            await err.WriteAsJsonAsync(new { error = "Internal Server Error" });
            return err;
        }
    }


    // 400 Bad Requestレスポンスを返すヘルパーメソッド
    private async Task<HttpResponseData> BadRequest(HttpRequestData req, string message)
    {
        var res = req.CreateResponse(HttpStatusCode.BadRequest);
        _corsHelper.AddHeaders(req, res);
        await res.WriteAsJsonAsync(new { error = message });
        return res;
    }


}
