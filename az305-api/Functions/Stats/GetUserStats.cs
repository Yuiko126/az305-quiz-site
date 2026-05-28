using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using az305_api.Services.Auth;
using az305_api.Services.Data;

namespace az305_api.Functions.Stats;

public class GetUserStats
{
    private readonly QuestionRepository _questions;
    private readonly JwtTokenService    _jwt;

    public GetUserStats(QuestionRepository questions, JwtTokenService jwt)
    {
        _questions = questions;
        _jwt       = jwt;
    }

    [Function("GetUserStats")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "stats")]
        HttpRequestData req)
    {
        var token = CorsHelper.ExtractCookieValue(req, "access_token");
        if (string.IsNullOrEmpty(token))
            return req.CreateResponse(HttpStatusCode.Unauthorized);

        var userId = _jwt.ValidateAndGetUserId(token);
        if (string.IsNullOrEmpty(userId))
            return req.CreateResponse(HttpStatusCode.Unauthorized);

        var stats = await _questions.GetUserCategoryStatsAsync(userId);

        var res = req.CreateResponse(HttpStatusCode.OK);
        await res.WriteAsJsonAsync(stats);
        return res;
    }
}