using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using az305_api.Services.Auth;
using az305_api.Services.Data;

namespace az305_api.Functions.Stats;

public class GetDomainStats
{
    private readonly QuestionRepository _questions;
    private readonly JwtTokenService    _jwt;

    public GetDomainStats(QuestionRepository questions, JwtTokenService jwt)
    {
        _questions = questions;
        _jwt       = jwt;
    }

    [Function("GetDomainStats")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "stats/domains")]
        HttpRequestData req)
    {
        // CORSプリフライト対応
        if (req.Method == "OPTIONS")
        {
            var preflight = req.CreateResponse(HttpStatusCode.NoContent);
            CorsHelper.AddCorsHeaders(req, preflight);
            return preflight;
        }

        var token = CorsHelper.ExtractCookieValue(req, "access_token");
        if (string.IsNullOrEmpty(token))
            return await Unauthorized(req);

        var userId = _jwt.ValidateAndGetUserId(token);
        if (userId == null)
            return await Unauthorized(req);

        var stats = await _questions.GetDomainStatsAsync(userId);

        var res = req.CreateResponse(HttpStatusCode.OK);
        CorsHelper.AddCorsHeaders(req, res);
        await res.WriteAsJsonAsync(stats);
        return res;
    }

    // ===== 共通 Unauthorized =====
    private static async Task<HttpResponseData> Unauthorized(HttpRequestData req)
    {
        var res = req.CreateResponse(HttpStatusCode.Unauthorized);
        CorsHelper.AddCorsHeaders(req, res);
        await res.WriteAsJsonAsync(new { error = "Unauthorized" });
        return res;
    }
}