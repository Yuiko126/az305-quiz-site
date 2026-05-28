using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using az305_api.Services.Auth;
using az305_api.Services.Data;

namespace az305_api.Functions;

public class StartSession
{
    private readonly SessionRepository _sessions;
    private readonly JwtTokenService   _jwt;
    private readonly ILogger<StartSession> _logger;

    public StartSession(SessionRepository sessions, JwtTokenService jwt, ILogger<StartSession> logger)
    {
        _sessions = sessions;
        _jwt      = jwt;
        _logger   = logger;
    }

    [Function("StartSession")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "sessions")]
        HttpRequestData req)
    {
        try
        {
            var token = CorsHelper.ExtractCookieValue(req, "access_token");
            if (string.IsNullOrEmpty(token))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                CorsHelper.AddCorsHeaders(req, unauthorized);
                await unauthorized.WriteAsJsonAsync(new { error = "Unauthorized" });
                return unauthorized;
            }

            var userId = _jwt.ValidateAndGetUserId(token);
            if (userId is null)
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                CorsHelper.AddCorsHeaders(req, unauthorized);
                await unauthorized.WriteAsJsonAsync(new { error = "Unauthorized" });
                return unauthorized;
            }

            // ✅ セッションIDを生成してデータベースに保存
            var sessionId = Guid.NewGuid().ToString();
            var now = DateTime.UtcNow;

            // exam_sessions テーブルに挿入
            await _sessions.InsertExamSessionAsync(
                sessionId,
                userId,
                score: null,            // 開始時は未完了
                totalQuestions: 0,      // 後で更新
                timeSeconds: null,      // 後で更新
                mode: "normal",         // デフォルト値
                startedAt: now,
                finishedAt: now         // 開始時は同じ値
            );

            _logger.LogInformation("Session started: sessionId={SessionId}, userId={UserId}", sessionId, userId);

            var ok = req.CreateResponse(HttpStatusCode.Created);
            CorsHelper.AddCorsHeaders(req, ok);
            await ok.WriteAsJsonAsync(new { sessionId });
            return ok;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "StartSession failed");

            var err = req.CreateResponse(HttpStatusCode.InternalServerError);
            CorsHelper.AddCorsHeaders(req, err);
            await err.WriteAsJsonAsync(new { error = "Internal Server Error" });
            return err;
        }
    }
}
