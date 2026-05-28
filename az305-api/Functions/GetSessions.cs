using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using az305_api.Services.Auth;
using az305_api.Services.Data;

namespace az305_api.Functions;

public class GetSessions
{
    private readonly SessionRepository _sessions;
    private readonly JwtTokenService   _jwt;
    private readonly ILogger<GetSessions> _logger;

    public GetSessions(SessionRepository sessions, JwtTokenService jwt, ILogger<GetSessions> logger)
    {
        _sessions = sessions;
        _jwt      = jwt;
        _logger   = logger;
    }

    [Function("GetSessions")]
    public async Task<HttpResponseData> GetSession(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "sessions")]
        HttpRequestData req)
    {
        try
        {
            // ✅ CORS preflight対応
            if (req.Method == "OPTIONS")
            {
                var corsResponse = req.CreateResponse(HttpStatusCode.OK);
                CorsHelper.AddCorsHeaders(req, corsResponse);
                return corsResponse;
            }

            HttpResponseData Unauthorized()
            {
                var r = req.CreateResponse(HttpStatusCode.Unauthorized);
                CorsHelper.AddCorsHeaders(req, r);
                return r;
            }

            var token = CorsHelper.ExtractCookieValue(req, "access_token");
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var userId = _jwt.ValidateAndGetUserId(token);
            if (userId is null)
                return Unauthorized();

            var sessions = await _sessions.GetSessionsAsync(userId);

            var res = req.CreateResponse(HttpStatusCode.OK);
            CorsHelper.AddCorsHeaders(req, res);
            await res.WriteAsJsonAsync(sessions);
            return res;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetSessions failed");

            var err = req.CreateResponse(HttpStatusCode.InternalServerError);
            CorsHelper.AddCorsHeaders(req, err);
            await err.WriteAsJsonAsync(new { error = "Internal Server Error" });
            return err;
        }
    }
}