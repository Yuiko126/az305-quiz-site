using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Text.Json;
using az305_api.Dtos.Auth;
using Microsoft.Azure.Functions.Worker.Http;

namespace az305_api.Functions.Auth;

public static class AuthRequestHelper
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static async Task<(T? body, HttpResponseData? errorResponse)> ReadAndValidateAsync<T>(HttpRequestData req)
        where T : class
    {
        T? body;
        try
        {
            body = await JsonSerializer.DeserializeAsync<T>(req.Body, JsonOptions);
        }
        catch (JsonException)
        {
            return (null, await CreateBadRequestAsync(req, new ErrorResponse("Invalid body")));
        }

        if (body is null)
            return (null, await CreateBadRequestAsync(req, new ErrorResponse("Invalid body")));

        var validationResults = new List<ValidationResult>();
        var validationContext = new ValidationContext(body);
        if (Validator.TryValidateObject(body, validationContext, validationResults, true))
            return (body, null);

        var errors = validationResults.Select(vr => vr.ErrorMessage).ToList();
        return (null, await CreateBadRequestAsync(req, new ValidationErrorResponse("入力データが正しくありません", errors)));
    }

    private static async Task<HttpResponseData> CreateBadRequestAsync(HttpRequestData req, object payload)
    {
        var bad = req.CreateResponse(HttpStatusCode.BadRequest);
        CorsHelper.AddCorsHeaders(req, bad);
        await bad.WriteAsJsonAsync(payload);
        return bad;
    }
}