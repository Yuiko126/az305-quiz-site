namespace az305_api.Services.Auth;

public enum AuthFailureReason
{
    None = 0,
    InvalidCredentials,
    InvalidInput,
    DuplicateUser,
    PersistenceConflict
}

public sealed record LoginResult(
    bool IsSuccess,
    string? UserId,
    string? Username,
    string? Email,
    string? AccessToken,
    string? RefreshToken,
    AuthFailureReason FailureReason)
{
    public static LoginResult Success(string userId, string username, string email, string accessToken, string refreshToken)
        => new(true, userId, username, email, accessToken, refreshToken, AuthFailureReason.None);

    public static LoginResult Fail(AuthFailureReason reason)
        => new(false, null, null, null, null, null, reason);
}

public sealed record RegisterResult(
    bool IsSuccess,
    string? UserId,
    string? Username,
    string? Email,
    AuthFailureReason FailureReason)
{
    public static RegisterResult Success(string userId, string username, string email)
        => new(true, userId, username, email, AuthFailureReason.None);

    public static RegisterResult Fail(AuthFailureReason reason)
        => new(false, null, null, null, reason);
}
