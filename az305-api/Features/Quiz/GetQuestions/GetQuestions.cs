using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using az305_api.Services.Data;
using System.Net;
using System.Text.Json;

namespace az305_api.Functions;

public class GetQuestions
{
    private readonly ILogger _logger;
    private readonly QuestionRepository _questions;

    public GetQuestions(ILoggerFactory loggerFactory, QuestionRepository questions)
    {
        _logger    = loggerFactory.CreateLogger<GetQuestions>();
        _questions = questions;
    }

    [Function("GetQuestions")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "questions")]
        HttpRequestData req)
    {
        // CORSプリフライトリクエストは共通ヘルパーで応答する
        if (CorsHelper.isPreflightRequest(req))
            return CorsHelper.CreatePreflightResponse(req);

        _logger.LogInformation("GET /api/questions");

        // クエリパラメータ
        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var domain = query["domain"];
        var limitStr = query["limit"];

        var limit = int.TryParse(limitStr, out var l) && l > 0 ? l : 10;

        var questions = await _questions.GetQuestionsAsync(domain, limit);

        var ok = req.CreateResponse(HttpStatusCode.OK);
        ok.Headers.Add("Content-Type", "application/json; charset=utf-8");
        CorsHelper.AddCorsHeaders(req, ok);

        await ok.WriteStringAsync(
            JsonSerializer.Serialize(
                questions,
                new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));

        return ok;
    }
}