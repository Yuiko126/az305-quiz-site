namespace az305_api;

public static class AppConstants
{
    // Cookie 名
    public const string AccessTokenCookie  = "access_token";
    public const string RefreshTokenCookie = "refresh_token";

    // トークン有効期限
    public const int AccessTokenMinutes  = 15;
    public const int RefreshTokenDays    = 7;
    public const int AccessTokenMaxAge   = AccessTokenMinutes * 60;   // 900 秒
    public const int RefreshTokenMaxAge  = RefreshTokenDays * 24 * 3600; // 604800 秒
}
