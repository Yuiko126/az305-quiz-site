using System.Net;

namespace az305_api.Functions;

public sealed class CorsHelper
{
    // 環境変数から許可するオリジンを取得
    private static readonly HashSet<string> AllowedOrigin = GetAllowedOrigins();

    private static HashSet<string> GetAllowedOrigins()
    {
        // 環境変数から値を取得（ハイフンとアンダースコア両方チェック）
        var originsStr = Environment.GetEnvironmentVariable("ALLOWED-ORIGINS") 
                      ?? Environment.GetEnvironmentVariable("ALLOWED_ORIGINS");

        if (string.IsNullOrEmpty(originsStr))
        {
            // 環境変数がない場合はデフォルト値（開発環境用）
            // 両方のポート番号を許可
            var defaults = new HashSet<string> 
            { 
                "http://localhost:5173",
                "http://localhost:5174"
            };

            Console.WriteLine("[CORS] Using default allowed origins:");
            foreach (var origin in defaults)
            {
                Console.WriteLine($"  - {origin}");
            }

            return defaults;
        }

        // カンマ区切りで複数のオリジンを設定できるようにする
        var origins = originsStr.Split(',')
                         .Select(o => o.Trim())
                         .ToHashSet();

        Console.WriteLine("[CORS] Using allowed origins from env:");
        foreach (var origin in origins)
        {
            Console.WriteLine($"  - {origin}");
        }

        return origins;
    }

    public static void AddCorsHeaders(HttpRequestData req, HttpResponseData res)
    {
        // リクエストの Origin ヘッダーを確認
        if (req.Headers.TryGetValues("Origin", out var origins))
        {
            var origin = origins.First();

            if (AllowedOrigin.Contains(origin))
            {
                res.Headers.Add("Access-Control-Allow-Origin", origin);
                res.Headers.Add("Access-Control-Allow-Credentials", "true");
            }
            else
            {
                Console.WriteLine($"[CORS] Origin NOT ALLOWED: {origin}");
            }
        }
        // Origin ヘッダーがない場合はフォールバックしない（セキュリティ上の理由）

        res.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
        res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    }

    /// <summary>
    /// Cookie ヘッダーから指定したキーの値を抽出します。
    /// </summary>
    public static string? ExtractCookieValue(HttpRequestData req, string cookieName)
    {
        if (!req.Headers.TryGetValues("Cookie", out var cookieHeaders))
            return null;

        return cookieHeaders.First()
            .Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(c => c.Trim())
            .FirstOrDefault(c => c.StartsWith($"{cookieName}="))
            ?[(cookieName.Length + 1)..];
    }

    public static void AddAuthCookies(HttpResponseData res, string accessToken, string refreshToken)
    {
        var accessExpires = DateTime.UtcNow.AddMinutes(AppConstants.AccessTokenMinutes);
        var refreshExpires = DateTime.UtcNow.AddDays(AppConstants.RefreshTokenDays);

        res.Headers.Add("Set-Cookie", new[]
        {
            $"{AppConstants.AccessTokenCookie}={accessToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age={AppConstants.AccessTokenMaxAge}; Expires={accessExpires:R}",
            $"{AppConstants.RefreshTokenCookie}={refreshToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age={AppConstants.RefreshTokenMaxAge}; Expires={refreshExpires:R}"
        });
    }

    public static void ClearAuthCookies(HttpResponseData res)
    {
        res.Headers.Add("Set-Cookie", new[]
        {
            $"{AppConstants.AccessTokenCookie}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
            $"{AppConstants.RefreshTokenCookie}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"
        });
    }

    public static async Task<HttpResponseData> CreateUnauthorizedResponseAsync(HttpRequestData req, string message)
    {
        var res = req.CreateResponse(HttpStatusCode.Unauthorized);
        AddCorsHeaders(req, res);
        await res.WriteAsJsonAsync(new ErrorResponse(message));
        return res;
    }

    public bool IsPreflightRequest(HttpRequestData req)
    {
        return isPreflightRequest(req);
    }

    public HttpResponseData CreateCorsPreflightResponse(HttpRequestData req)
    {
        return CreatePreflightResponse(req);
    }

    public void AddHeaders(HttpRequestData req, HttpResponseData res)
    {
        AddCorsHeaders(req, res);
    }

    public string? GetCookieValue(HttpRequestData req, string cookieName)
    {
        return ExtractCookieValue(req, cookieName);
    }

    /// <summary>
    /// HTTPリクエストがCORSプリフライトリクエストか判定
    /// </summary>
    public static bool isPreflightRequest(HttpRequestData req)
    {
        return string.Equals(req.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// CORSプリフライトリクエストに対するレスポンスを作成
    /// </summary>
    public static HttpResponseData CreatePreflightResponse(HttpRequestData req)
    {
        var res = req.CreateResponse(HttpStatusCode.NoContent);
        AddCorsHeaders(req, res);
        return res;
    }

    /// <summary>
    /// Unauthorizedレスポンスを作成
    /// </summary>
    public async Task<HttpResponseData> UnauthorizedResponseAsync(HttpRequestData req)
    {
        var res = req.CreateResponse(HttpStatusCode.Unauthorized);
        AddHeaders(req, res);
        await res.WriteAsJsonAsync(new { error = "Unauthorized" });
        return res;
    }

    /// <summary>
    ///  Not Foundレスポンスを返すヘルパーメソッド
    /// </summary>
    public async Task<HttpResponseData> NotFoundResponseAsync(HttpRequestData req)
    {
        var res = req.CreateResponse(HttpStatusCode.NotFound);
        AddHeaders(req, res);
        await res.WriteAsJsonAsync(new { error = "Not Found" });
        return res;
    }

    /// <summary>
    ///  400 Bad Requestレスポンスを返すヘルパーメソッド
    /// </summary>
    public async Task<HttpResponseData> BadRequestResponseAsync(HttpRequestData req)
    {
        var res = req.CreateResponse(HttpStatusCode.BadRequest);
        AddHeaders(req, res);
        await res.WriteAsJsonAsync(new { error = message });
        return res;
    } 

    /// <summary>
    ///  Internal Server Errorレスポンスを返すヘルパーメソッド
    /// </summary>
    public async Task<HttpResponseData> InternalServerErrorResponseAsync(HttpRequestData req)
    {
        var res = req.CreateResponse(HttpStatusCode.InternalServerError);
        AddHeaders(req, res);
        await res.WriteAsJsonAsync(new { error = "Internal Server Error" });
        return res;
    }
}
