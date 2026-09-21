using System.Net;
using az305_api.Functions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace az305_api.Feature.User;

public sealed class UserUpdateProfileFunction
{
    private readonly UserService _userService;
    private readonly CorsHelper _cors;

    public UserUpdateProfileFunction(UserService userService, CorsHelper cors)
    {
        _userService = userService;
        _cors = cors;
    }

    [Function("UpdateProfile")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", "options", Route = "user/profile")]
        HttpRequestData req)
    {
        if (_cors.IsPreflightRequest(req))
            return _cors.CreateCorsPreflightResponse(req);

        var request = await req.ReadFromJsonAsync<ProfileUpdateRequest>();
        if (request is null)
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            _cors.AddHeaders(req, bad);
            await bad.WriteAsJsonAsync(new { error = "Invalid body" });
            return bad;
        }

        var updated = await _userService.UpdateProfileAsync(request.UserId, request.Username, request.Email);
        var res = req.CreateResponse(updated ? HttpStatusCode.OK : HttpStatusCode.BadRequest);
        _cors.AddHeaders(req, res);

        await res.WriteAsJsonAsync(new
        {
            success = updated,
            message = updated ? "Profile updated" : "Update failed"
        });

        return res;
    }
}

public sealed record ProfileUpdateRequest(string UserId, string Username, string Email);
