using System.Net;

namespace az305_api.Feature.CheckAnswer;

/// <summary>
/// 回答の正誤をチェックするAzure Function
/// JSONを受け取り、回答の正誤をチェックし、結果を返す
/// </summary>
public sealed class CheckAnswerFunction
{
    private readonly CheckAnswerService _checkAnswerService;
    private readonly JwtTokenService _jwt;
    private readonly CorsHelper _corsHelper;

    public CheckAnswerFunction(
        CheckAnswerService checkAnswerService,
        JwtTokenService jwt,
        CorsHelper corsHelper)
    {
        _checkAnswerService = checkAnswerService;
        _jwt = jwt;
        _corsHelper = corsHelper;
    }

    [Function("CheckAnswer")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "check")]
        HttpRequestData req)
    {
        // CORSプリフライトリクエストか確認
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

            // ReadFromJsonAsync：HttpContentをJSONデータとして読む
            // HTTPriquestDataのBodyをJSONとして読み込み、CheckAnswerModel型にデシリアライズする
            var body = await req.ReadFromJsonAsync<CheckAnswerModel>();

            if (body == null)
                return await _corsHelper.BadRequestResponseAsync(req);

            // CheckAnswerServiceを呼び出して、回答の正誤をチェック
            var result = await _checkAnswerService.ExecuteAsync(userId, body);
            
            if (!result.IsSuccess)
            {
                if (result.ErrorCode == "QuestionNotFound")
                    return await _corsHelper.NotFoundResponseAsync(req);

                if (result.ErrorCode == "InvalidChoice")
                    return await _corsHelper.BadRequestResponseAsync(req, result.ErrorMessage ?? "Invalid choice");

                return await _corsHelper.InternalServerErrorResponseAsync(req);
            }

            // 正常な結果を返す
            var ok = req.CreateResponse(HttpStatusCode.OK);
            _corsHelper.AddHeaders(req, ok);
            await ok.WriteAsJsonAsync(result.Response);
            return ok;
        }
        catch (Exception ex)
        {
            Console.WriteLine("=== CHECK ANSWER ERROR ===");
            Console.WriteLine(ex.ToString());
            return await _corsHelper.InternalServerErrorResponseAsync(req);
        }
    }
}
