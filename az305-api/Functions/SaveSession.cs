using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using az305_api.Models;
using az305_api.Services.Auth;
using az305_api.Services.Data;

namespace az305_api.Functions;

public class SaveSession
{
    private readonly SessionRepository _sessions;
    private readonly JwtTokenService   _jwt;
    private readonly ILogger<SaveSession> _logger;

    public SaveSession(SessionRepository sessions, JwtTokenService jwt, ILogger<SaveSession> logger)
    {
        _sessions = sessions;
        _jwt      = jwt;
        _logger   = logger;
    }

    [Function("SaveSession")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "SaveSession")]
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

            // ✅ JSON を安全に読み込む
            var dto = await JsonSerializer.DeserializeAsync<SessionDto>(
                req.Body,
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }
            );

            if (dto is null)
            {
                var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
                CorsHelper.AddCorsHeaders(req, badRequest);
                await badRequest.WriteStringAsync("Invalid request body");
                return badRequest;
            }

            // ✅ Cookie から取得した userId を使用
            dto.UserId = userId;

            _logger.LogInformation(
                "SaveSession called: userId={UserId}, correct={Correct}, total={Total}, mode={Mode}, domain={Domain}",
                dto.UserId, dto.Correct, dto.Total, dto.Mode, dto.Domain
            );

            await _sessions.SaveSessionAsync(dto);

            var ok = req.CreateResponse(HttpStatusCode.Created);
            CorsHelper.AddCorsHeaders(req, ok);
            await ok.WriteAsJsonAsync(new { message = "Session saved", success = true });
            return ok;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SaveSession failed");

            var err = req.CreateResponse(HttpStatusCode.InternalServerError);
            CorsHelper.AddCorsHeaders(req, err);
            await err.WriteAsJsonAsync(new { error = "Internal Server Error" });
            return err;
        }
    }
}

