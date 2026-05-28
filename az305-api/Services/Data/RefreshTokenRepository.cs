using Microsoft.Data.Sqlite;

namespace az305_api.Services.Data;

/// <summary>
/// リフレッシュトークンの CRUD を担当します。
/// </summary>
public sealed class RefreshTokenRepository
{
    private readonly DbService _db;

    public RefreshTokenRepository(DbService db) => _db = db;

    public async Task SaveAsync(string userId, string token, DateTime expiresAt)
    {
        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
            VALUES ($id, $userId, $token, $expiresAt, $createdAt);
        """;
        cmd.Parameters.AddWithValue("$id",        Guid.NewGuid().ToString());
        cmd.Parameters.AddWithValue("$userId",    userId);
        cmd.Parameters.AddWithValue("$token",     token);
        cmd.Parameters.AddWithValue("$expiresAt", expiresAt.ToString("o"));
        cmd.Parameters.AddWithValue("$createdAt", DateTime.UtcNow.ToString("o"));

        await cmd.ExecuteNonQueryAsync();
    }

    /// <summary>
    /// トークンを検証し、有効な場合はユーザー ID を返します。
    /// 期限切れの場合はトークンを削除し null を返します。
    /// </summary>
    public async Task<string?> ValidateAsync(string token)
    {
        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT user_id, expires_at
            FROM refresh_tokens
            WHERE token = $token
            LIMIT 1;
        """;
        cmd.Parameters.AddWithValue("$token", token);

        using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return null;

        var userId    = reader.GetString(0);
        var expiresAt = DateTime.Parse(reader.GetString(1));

        if (expiresAt < DateTime.UtcNow)
        {
            await DeleteAsync(token);
            return null;
        }

        return userId;
    }

    public async Task DeleteAsync(string token)
    {
        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM refresh_tokens WHERE token = $token;";
        cmd.Parameters.AddWithValue("$token", token);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task DeleteAllByUserAsync(string userId)
    {
        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM refresh_tokens WHERE user_id = $userId;";
        cmd.Parameters.AddWithValue("$userId", userId);

        await cmd.ExecuteNonQueryAsync();
    }
}
