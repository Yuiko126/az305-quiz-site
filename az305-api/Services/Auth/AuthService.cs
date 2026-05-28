using Microsoft.AspNetCore.Identity;
using az305_api.Models;
using az305_api.Services.Data;
using Microsoft.Data.Sqlite;

namespace az305_api.Services.Auth;

public sealed class AuthService
{
    private readonly UserRepository _users;
    private readonly JwtTokenService _jwt;
    private readonly RefreshTokenRepository _tokens;
    private readonly PasswordHasher<User> _hasher = new();

    public AuthService(UserRepository users, JwtTokenService jwt, RefreshTokenRepository tokens)
    {
        _users  = users;
        _jwt    = jwt;
        _tokens = tokens;
    }

    /// <summary>
    /// リクエストBodyが正しい値で入っていた場合、1.ユーザー検索 2.ハッシュ認証 3.JWTの作成 を行う
    /// </summary>
    /// <param name="loginId"></param>
    /// <param name="password"></param>
    /// <returns></returns>
    public async Task<(User user, string accessToken, string refreshToken)?> LoginAsync(string loginId, string password)
    {
        var result = await LoginWithResultAsync(loginId, password);
        if (!result.IsSuccess)
            return null;

        var user = new User
        {
            Id = result.UserId!,
            Username = result.Username!,
            Email = result.Email!,
            IsActive = 1
        };

        return (user, result.AccessToken!, result.RefreshToken!);
    }

    public async Task<LoginResult> LoginWithResultAsync(string loginId, string password)
    {
        var normalizedLoginId = loginId.Trim();

        var user = await _users.FindByLoginIdAsync(normalizedLoginId);
        if (!CanLogin(user, password))
            return LoginResult.Fail(AuthFailureReason.InvalidCredentials);

        var authenticatedUser = user!;
        var (accessToken, refreshToken) = await IssueTokensAsync(authenticatedUser);

        return LoginResult.Success(
            authenticatedUser.Id,
            authenticatedUser.Username,
            authenticatedUser.Email,
            accessToken,
            refreshToken);
    }


    /// <summary>
    /// ユーザー新規登録
    /// </summary>
    /// <param name="username"></param>
    /// <param name="email"></param>
    /// <param name="password"></param>
    /// <returns></returns>
    public async Task<User?> RegisterAsync(string username, string email, string password)
    {
        var result = await RegisterWithResultAsync(username, email, password);
        if (!result.IsSuccess)
            return null;

        return new User
        {
            Id = result.UserId!,
            Username = result.Username!,
            Email = result.Email!,
            IsActive = 1
        };
    }

    public async Task<RegisterResult> RegisterWithResultAsync(string username, string email, string password)
    {
        var normalizedUsername = username.Trim();
        var normalizedEmail = email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(normalizedUsername) || string.IsNullOrWhiteSpace(normalizedEmail))
            return RegisterResult.Fail(AuthFailureReason.InvalidInput);

        // 同じ email / username が存在するかチェック
        if (await UserAlreadyExistsAsync(normalizedUsername, normalizedEmail))
            return RegisterResult.Fail(AuthFailureReason.DuplicateUser);

        // 存在しなければUserインスタンスを作成し、
        // passwordをソルト・反復回数・アルゴリズム情報付きハッシュ文字列を生成
        var tempUser = new User();
        var hash = _hasher.HashPassword(tempUser, password);

        try
        {
            // ユーザーをDBに登録する
            var created = await _users.InsertAsync(normalizedUsername, normalizedEmail, hash);
            return RegisterResult.Success(created.Id, created.Username, created.Email);
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 19)
        {
            // 登録できない場合は登録失敗の事実のみ返す（画面に表示させるため）
            return RegisterResult.Fail(AuthFailureReason.PersistenceConflict);
        }
    }

    private bool CanLogin(User? user, string password)
    {
        if (user is null || user.IsActive == 0)
            return false;

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        return result != PasswordVerificationResult.Failed;
    }

    private async Task<(string accessToken, string refreshToken)> IssueTokensAsync(User user)
    {
        var accessToken = _jwt.Generate(user.Id, user.Username);

        var refreshToken = _jwt.GenerateRefreshToken();
        var expiresAt = DateTime.UtcNow.AddDays(AppConstants.RefreshTokenDays);
        await _tokens.SaveAsync(user.Id, refreshToken, expiresAt);

        return (accessToken, refreshToken);
    }

    private async Task<bool> UserAlreadyExistsAsync(string username, string email)
    {
        var byEmailTask = _users.FindByEmailAsync(email);
        var byUsernameTask = _users.FindByUsernameAsync(username);
        await Task.WhenAll(byEmailTask, byUsernameTask);

        return byEmailTask.Result is not null || byUsernameTask.Result is not null;
    }
}