using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace az305_api.Services.Auth;

public sealed class JwtTokenService
{
    private readonly string _secret;

    public JwtTokenService(IConfiguration config)
    {
        // Azure Functions では環境変数のコロンがサポートされないため、
        // 両方のキー名をチェックする。
        var jwtSecret = config["JwtSecret"];
        var jwtSecretColon = config["Jwt:Secret"];

        _secret = jwtSecret
            ?? jwtSecretColon
            ?? throw new InvalidOperationException("JWT Secret not configured. Set 'JwtSecret' in local.settings.json");
    }

    /// <summary>
    /// ログイン成功時に Json Web Token を発行する。
    /// </summary>
    public string Generate(string userId, string userName)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512);

        var token = new JwtSecurityToken(
            claims: new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Name, userName)
            },
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string? ValidateAndGetUserId(string token)
    {
        var handler = new JwtSecurityTokenHandler();

        try
        {
            var principal = handler.ValidateToken(
                token,
                new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                },
                out _
            );

            return principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }
        catch
        {
            return null;
        }
    }

    public string? ValidateAndGetUserName(string token)
    {
        var handler = new JwtSecurityTokenHandler();

        try
        {
            var principal = handler.ValidateToken(
                token,
                new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                },
                out _
            );

            return principal.FindFirst(ClaimTypes.Name)?.Value;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// リフレッシュトークンを生成する。
    /// </summary>
    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}
