using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;
using az305_api.Services.Data;
using az305_api.Functions;

namespace az305_api.Functions.Auth;

public class LogoutFunction
{
    private readonly RefreshTokenRepository _tokens;

    public LogoutFunction(RefreshTokenRepository tokens)
    {
        _tokens = tokens;
    }

    [Function("Logout")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "logout")]
        HttpRequestData req)
    {
        // CORSプリフライト対応
        if (req.Method == "OPTIONS")
        {
            var preflight = req.CreateResponse(HttpStatusCode.NoContent);
            CorsHelper.AddCorsHeaders(req, preflight);
            return preflight;
        }

        var refreshToken = CorsHelper.ExtractCookieValue(req, "refresh_token");
        if (!string.IsNullOrEmpty(refreshToken))
        {
            await _tokens.DeleteAsync(refreshToken);
        }

        var response = req.CreateResponse(HttpStatusCode.OK);
        CorsHelper.ClearAuthCookies(response);

        CorsHelper.AddCorsHeaders(req, response);

        return response;
    }
}
