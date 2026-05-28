using System.Net;
using az305_api.Dtos.Auth;
using az305_api.Services.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace az305_api.Functions.Auth;

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
        // CORSのプリフライトリクエスト
        if (req.Method == "OPTIONS")
        {
            var preflight = req.CreateResponse(HttpStatusCode.NoContent);
            CorsHelper.AddCorsHeaders(req, preflight);
            return preflight;
        }

        var (body, errorResponse) = await AuthRequestHelper.ReadAndValidateAsync<LoginRequest>(req);
        if (errorResponse is not null)
            return errorResponse;

        var loginResult = await _auth.LoginWithResultAsync(body!.LoginId, body.Password);
        if (!loginResult.IsSuccess)
        {
            return await CorsHelper.CreateUnauthorizedResponseAsync(req, "ログインIDまたはパスワードが正しくありません");
        }

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