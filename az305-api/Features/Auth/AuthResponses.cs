using System.Text.Json.Serialization;

namespace az305_api.Dtos.Auth;

public sealed record ErrorResponse(
	[property: JsonPropertyName("error")] string Error);

public sealed record ValidationErrorResponse(
	[property: JsonPropertyName("error")] string Error,
	[property: JsonPropertyName("errors")] IReadOnlyList<string?> Errors);

public sealed record UserSummaryResponse(string Id, string Username, string Email);

public sealed record LoginResponse(
	[property: JsonPropertyName("user")] UserSummaryResponse User);

public sealed record RegisterResponse(string Id, string Username, string Email);

public sealed record RefreshResponse(
	[property: JsonPropertyName("message")] string Message);

public sealed record MeResponse(
	[property: JsonPropertyName("userId")] string UserId,
	[property: JsonPropertyName("userName")] string? UserName);
