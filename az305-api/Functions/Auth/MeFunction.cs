using System.Net;
using az305_api.Dtos.Auth;
using az305_api.Services.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace az305_api.Functions.Auth;

public sealed class MeFunction
{
    private readonly JwtTokenService _jwt;

    public MeFunction(JwtTokenService jwt)
    {
        _jwt = jwt;
    }

    [Function("Me")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "options")]
        HttpRequestData req)
    {
        if (req.Method == "OPTIONS")
        {
            var preflight = req.CreateResponse(HttpStatusCode.NoContent);
            CorsHelper.AddCorsHeaders(req, preflight);
            return preflight;
        }

        var token = CorsHelper.ExtractCookieValue(req, "access_token");
        if (string.IsNullOrEmpty(token))
            return await CorsHelper.CreateUnauthorizedResponseAsync(req, "Access token not found");

        var userId = _jwt.ValidateAndGetUserId(token);
        var userName = _jwt.ValidateAndGetUserName(token);
        if (string.IsNullOrEmpty(userId))
            return await CorsHelper.CreateUnauthorizedResponseAsync(req, "Invalid or expired access token");

        var ok = req.CreateResponse(HttpStatusCode.OK);
        CorsHelper.AddCorsHeaders(req, ok);

    // キャッシュを無効化
        ok.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate");
        ok.Headers.Add("Pragma", "no-cache");

        await ok.WriteAsJsonAsync(new MeResponse(userId, userName));
        return ok;
    }
}