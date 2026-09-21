using System.Net;
using az305_api.Dtos.Auth;
using az305_api.Functions;
using az305_api.Services.Auth;
using az305_api.Services.Data;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace az305_api.Feature.Auth;

public sealed class RefreshFunction
{
    private readonly JwtTokenService       _jwt;
    private readonly RefreshTokenRepository _tokens;
    private readonly UserRepository        _users;

    public RefreshFunction(
        JwtTokenService        jwt,
        RefreshTokenRepository tokens,
        UserRepository         users)
    {
        _jwt    = jwt;
        _tokens = tokens;
        _users  = users;
    }


    [Function("Refresh")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "auth/refresh")]
        HttpRequestData req)
    {
        // CORSプリフライトリクエストは共通ヘルパーで応答する
        if (CorsHelper.isPreflightRequest(req))
            return CorsHelper.CreatePreflightResponse(req);

        var refreshToken = CorsHelper.ExtractCookieValue(req, "refresh_token");
        if (string.IsNullOrEmpty(refreshToken))
        {
            return await CorsHelper.CreateUnauthorizedResponseAsync(req, "Refresh token not found");
        }

        // リフレッシュトークンを検証
        var userId = await _tokens.ValidateAsync(refreshToken);
        if (userId == null)
        {
            return await CorsHelper.CreateUnauthorizedResponseAsync(req, "Invalid or expired refresh token");
        }

        // DB からユーザー名を取得（JWT に正確なユーザー名を含めるため）
        var user = await _users.FindByIdAsync(userId);
        var userName = user?.Username ?? userId;

        var newAccessToken = _jwt.Generate(userId, userName);
        var newRefreshToken = _jwt.GenerateRefreshToken();
        var expiresAt = DateTime.UtcNow.AddDays(AppConstants.RefreshTokenDays);

        await _tokens.DeleteAsync(refreshToken);
        await _tokens.SaveAsync(userId, newRefreshToken, expiresAt);

        var ok = req.CreateResponse(HttpStatusCode.OK);
        CorsHelper.AddAuthCookies(ok, newAccessToken, newRefreshToken);
        CorsHelper.AddCorsHeaders(req, ok);

        // キャッシュを無効化
        ok.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate");
        ok.Headers.Add("Pragma", "no-cache");

        await ok.WriteAsJsonAsync(new RefreshResponse("Token refreshed successfully"));

        return ok;
    }
}
