using System.Net;
using az305_api.Dtos;
using az305_api.Services;

namespace az305_api.Functions;

/// <summary>
/// 回答の正誤をチェックするAzure Function
/// </summary>
public sealed class CheckAnswerFunction
{
    private readonly CheckAnswerService _checkAnswerService;
    private readonly JwtTokenService _jwt;
    private readonly CorsHelper _corsHelper;

    public CheckAnswerFunction(
        CheckAnswerService checkAnswerService,
        JwtTokenService jwt,
        CorsHelper corsHelper)
    {
        _checkAnswerService = checkAnswerService;
        _jwt = jwt;
        _corsHelper = corsHelper;
    }

    [Function("CheckAnswer")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "check")]
        HttpRequestData req)
    {
        if (_corsHelper.IsPreflightRequest(req))
            return _corsHelper.CreateCorsPreflightResponse(req);

        try
        {
            var token = _corsHelper.GetCookieValue(req, "access_token");
            if (string.IsNullOrEmpty(token))
                return await _corsHelper.UnauthorizedResponseAsync(req);

            var userId = _jwt.ValidateAndGetUserId(token);
            if (string.IsNullOrEmpty(userId))
                return await _corsHelper.UnauthorizedResponseAsync(req);

            var body = await req.ReadFromJsonAsync<CheckRequest>();
            if (body == null)
                return await _corsHelper.BadRequestResponseAsync(req);

            var result = await _checkAnswerService.ExecuteAsync(userId, body);
            if (!result.IsSuccess)
            {
                if (result.ErrorCode == "QuestionNotFound")
                    return await _corsHelper.NotFoundResponseAsync(req);

                if (result.ErrorCode == "InvalidChoice")
                    return await _corsHelper.BadRequestResponseAsync(req, result.ErrorMessage ?? "Invalid choice");

                return await _corsHelper.InternalServerErrorResponseAsync(req);
            }

            var ok = req.CreateResponse(HttpStatusCode.OK);
            _corsHelper.AddHeaders(req, ok);
            await ok.WriteAsJsonAsync(result.Response);
            return ok;
        }
        catch (Exception ex)
        {
            Console.WriteLine("=== CHECK ANSWER ERROR ===");
            Console.WriteLine(ex.ToString());
            return await _corsHelper.InternalServerErrorResponseAsync(req);
        }
    }
}
