using System.Net;
using az305_api.Dtos.Auth;
using az305_api.Feature.Auth;
using az305_api.Functions;
using az305_api.Services.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace az305_api.Feature.Auth.Login;

public sealed class LoginFunction
{
    private readonly AuthService _auth;

    public LoginFunction(AuthService auth)
    {
        _auth = auth;
    }

    [Function("Login")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", "options")]
        HttpRequestData req)
    {
        // CORSのプリフライトリクエストは共通ヘルパーで応答する
        if (CorsHelper.isPreflightRequest(req))
            return CorsHelper.CreatePreflightResponse(req);

        // 1. リクエスト本文を読み取り、DTO とバリデーションを実行
        var (body, errorResponse) = await AuthRequestHelper.ReadAndValidateAsync<LoginRequest>(req);
        if (errorResponse is not null)
            return errorResponse;

        // 2. 認証サービスでログイン処理を実行
        var loginResult = await _auth.LoginWithResultAsync(body!.LoginId, body.Password);
        if (!loginResult.IsSuccess)
        {
            // 3. 認証失敗時は 401 を返す
            return await CorsHelper.CreateUnauthorizedResponseAsync(req, "ログインIDまたはパスワードが正しくありません");
        }

        // 4. 成功時は JWT を Cookie に設定し、正常応答を返す
        var ok = req.CreateResponse(HttpStatusCode.OK);
        CorsHelper.AddAuthCookies(ok, loginResult.AccessToken!, loginResult.RefreshToken!);
        CorsHelper.AddCorsHeaders(req, ok);

        // キャッシュを無効化
        ok.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate");
        ok.Headers.Add("Pragma", "no-cache");

        var payload = new LoginResponse(
            new UserSummaryResponse(
                loginResult.UserId!,
                loginResult.Username!,
                loginResult.Email!));
        await ok.WriteAsJsonAsync(payload);

        return ok;
    }
}