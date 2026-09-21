using System.Net;
using az305_api.Dtos.Auth;
using az305_api.Feature.Auth;
using az305_api.Functions;
using az305_api.Services.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace az305_api.Feature.Auth.Regist;

/// <summary>
/// ユーザー登録のAzure Function
/// </summary>
public sealed class RegisterFunction
{
    private readonly AuthService _auth;
    private readonly CorsHelper _corsHelper;

    public RegisterFunction(
        AuthService auth,
        CorsHelper corsHelper)
    {
        _auth = auth;
        _corsHelper = corsHelper;
    }

    [Function("Register")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "auth/register")]
        HttpRequestData req)
    {
        // CORSプリフライトリクエストはヘッダーだけ返す
        if (_corsHelper.IsPreflightRequest(req))
            return _corsHelper.CreateCorsPreflightResponse(req);

        try
        {
            // 1. リクエスト本文を読み取り、DTO とバリデーションを実行
            var (body, errorResponse) = await AuthRequestHelper.ReadAndValidateAsync<RegisterRequest>(req);
            if (errorResponse is not null)
                return errorResponse;

            // 2. 認証サービスでユーザー登録を実行
            var registerResult = await _auth.RegisterWithResultAsync(body!.Username, body.Email, body.Password);

            // 3. 登録失敗時は重複ユーザーエラーを 409 で返す
            if (!registerResult.IsSuccess)
            {
                var conflict = req.CreateResponse(HttpStatusCode.Conflict);
                _corsHelper.AddHeaders(req, conflict);
                await conflict.WriteAsJsonAsync(new ErrorResponse("User already exists"));
                return conflict;
            }

            // 4. 登録成功時は 201 Created と登録済み情報を返す
            var created = req.CreateResponse(HttpStatusCode.Created);
            _corsHelper.AddHeaders(req, created);
            await created.WriteAsJsonAsync(new RegisterResponse(
                registerResult.UserId!,
                registerResult.Username!,
                registerResult.Email!));
            return created;
        }
        catch (Exception ex)
        {
            // 5. 予期しない例外はログに残し、500 応答を返す
            Console.WriteLine("=== Register ERROR ===");
            Console.WriteLine(ex);

            var error = req.CreateResponse(HttpStatusCode.InternalServerError);
            _corsHelper.AddHeaders(req, error);
            await error.WriteAsJsonAsync(new ErrorResponse("Internal Server Error"));
            return error;
        }
    }
}
