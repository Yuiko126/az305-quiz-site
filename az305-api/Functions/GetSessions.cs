using System.Net;

namespace az305_api.Functions;

public class GetSessions
{
    private readonly SessionRepository _sessions;
    private readonly JwtTokenService   _jwt;
    private readonly ILogger<GetSessions> _logger;
    private readonly CorsHelper _corsHelper;

    public GetSessions(SessionRepository sessions, JwtTokenService jwt, ILogger<GetSessions> logger, CorsHelper corsHelper)
    {
        _sessions = sessions;
        _jwt      = jwt;
        _logger   = logger;
        _corsHelper = corsHelper;
    }

    [Function("GetSessions")]
    public async Task<HttpResponseData> GetSession(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "sessions")]
        HttpRequestData req)
    {
        try
        {
            // ✅ CORS preflight対応
            if (CorsHelper.isPreflightRequest(req))
            {
                return CorsHelper.CreatePreflightResponse(req);
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
