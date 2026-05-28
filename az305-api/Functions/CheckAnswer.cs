using System.Net;
using az305_api.Dtos;
using az305_api.Services.Auth;
using az305_api.Services.Data;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace az305_api.Functions.Check;

public sealed class CheckAnswerFunction
{
    private readonly QuestionRepository _questions;
    private readonly SessionRepository  _sessions;
    private readonly JwtTokenService    _jwt;

    public CheckAnswerFunction(
        QuestionRepository questions,
        SessionRepository  sessions,
        JwtTokenService    jwt)
    {
        _questions = questions;
        _sessions  = sessions;
        _jwt       = jwt;
    }

    [Function("CheckAnswer")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(
            AuthorizationLevel.Anonymous,
            "post", "options",
            Route = "check")]
        HttpRequestData req)
    {
        // ✅ CORS プリフライト
        if (req.Method == "OPTIONS")
        {
            var preflight = req.CreateResponse(HttpStatusCode.NoContent);
            CorsHelper.AddCorsHeaders(req, preflight);
            return preflight;
        }

        try
        {
            var token = CorsHelper.ExtractCookieValue(req, "access_token");
            if (string.IsNullOrEmpty(token))
                return await Unauthorized(req);

            var userId = _jwt.ValidateAndGetUserId(token);
            if (string.IsNullOrEmpty(userId))
                return await Unauthorized(req);

            // ✅ Body
            var body = await req.ReadFromJsonAsync<CheckRequest>();
            if (body == null)
                return await BadRequest(req,"Invalid body");

            var result = await _questions.CheckAnswerAsync(
                body.QuestionId,
                body.Selected
            );

            if (result == null)
                return await NotFound(req);

            var choiceId = await _questions.GetChoiceIdAsync(body.QuestionId, body.Selected);

            if (choiceId == null)
            {
                var res = req.CreateResponse(HttpStatusCode.BadRequest);
                await res.WriteAsJsonAsync(new { error = "Invalid choice" });
                return res;
            }

            await _sessions.InsertSessionAnswerAsync(
                userId,
                body.SessionId,
                body.QuestionId,
                choiceId,
                result.IsCorrect,
                body.TimeSeconds
            );

            await _questions.UpdateUserProgressAsync(
                userId,
                body.QuestionId,
                result.IsCorrect
            );

            var ok = req.CreateResponse(HttpStatusCode.OK);
            CorsHelper.AddCorsHeaders(req, ok);
            await ok.WriteAsJsonAsync(result);
            return ok;
        }

catch (Exception ex)
{
    Console.WriteLine("=== CHECK ANSWER ERROR ===");
    Console.WriteLine(ex.ToString());

    var err = req.CreateResponse(HttpStatusCode.InternalServerError);
    CorsHelper.AddCorsHeaders(req, err);
    await err.WriteAsJsonAsync(new { error = "Internal Server Error" });
    return err;
}

    }

    // ---- 共通レスポンス ----
    private static async Task<HttpResponseData> Unauthorized(HttpRequestData req)
    {
        var res = req.CreateResponse(HttpStatusCode.Unauthorized);
        CorsHelper.AddCorsHeaders(req, res);
        await res.WriteAsJsonAsync(new { error = "Unauthorized" });
        return res;

    }

    private static async Task<HttpResponseData> BadRequest(HttpRequestData req, string message)
    {
        var res = req.CreateResponse(HttpStatusCode.BadRequest);
        CorsHelper.AddCorsHeaders(req, res);
        await res.WriteAsJsonAsync(new { error = message });
        return res;
    }

    private static async Task<HttpResponseData> NotFound(HttpRequestData req)
    {
        var res = req.CreateResponse(HttpStatusCode.NotFound);
        CorsHelper.AddCorsHeaders(req, res);
                await res.WriteAsJsonAsync(new { error = "Not Found" });
        return res;
    }
}