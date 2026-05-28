using System.Net;
using az305_api.Dtos.Auth;
using az305_api.Services.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace az305_api.Functions.Auth;

public sealed class RegisterFunction
{
    private readonly AuthService _auth;

    public RegisterFunction(AuthService auth)
    {
        _auth = auth;
    }

    [Function("Register")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "auth/register")]
        HttpRequestData req)
    {
        if (req.Method == "OPTIONS")
        {
            var preflight = req.CreateResponse(HttpStatusCode.NoContent);
            CorsHelper.AddCorsHeaders(req, preflight);
            return preflight;
        }

        try
        {
            var (body, errorResponse) = await AuthRequestHelper.ReadAndValidateAsync<RegisterRequest>(req);
            if (errorResponse is not null)
                return errorResponse;

            var registerResult = await _auth.RegisterWithResultAsync(body!.Username, body.Email, body.Password);

            if (!registerResult.IsSuccess)
            {
                var conflict = req.CreateResponse(HttpStatusCode.Conflict);
                CorsHelper.AddCorsHeaders(req, conflict);
                await conflict.WriteAsJsonAsync(new ErrorResponse("User already exists"));
                return conflict;
            }

            var res = req.CreateResponse(HttpStatusCode.Created);
            CorsHelper.AddCorsHeaders(req, res);
            await res.WriteAsJsonAsync(new RegisterResponse(
                registerResult.UserId!,
                registerResult.Username!,
                registerResult.Email!));
            return res;
        }
        catch (Exception ex)
        {
            Console.WriteLine("=== Register ERROR ===");
            Console.WriteLine(ex);

            var err = req.CreateResponse(HttpStatusCode.InternalServerError);
            CorsHelper.AddCorsHeaders(req, err);
            await err.WriteAsJsonAsync(new ErrorResponse("Internal Server Error"));
            return err;
        }
    }
}