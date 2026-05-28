using Microsoft.Data.Sqlite;
using az305_api.Models;

namespace az305_api.Services.Data;

public sealed class UserRepository
{
    private readonly DbService _db;
    private const string UserSelectColumns = "id, username, email, password_hash, is_active";

    public UserRepository(DbService db)
    {
        _db = db;
    }

    /// <summary>
    /// ログインIDを検索する
    /// </summary>
    /// <param name="loginId"></param>
    /// <returns></returns>
    public async Task<User?> FindByLoginIdAsync(string loginId)
    {
        var normalizedLoginId = loginId.Trim();

        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT {UserSelectColumns}
            FROM users
            WHERE email = $loginId
            OR username = $loginId
            LIMIT 1;
        """;
        cmd.Parameters.AddWithValue("$loginId", normalizedLoginId);

        return await ReadUserOrDefaultAsync(cmd, includeInactive: true);
    }

    public async Task<User?> FindByIdAsync(string userId)
    {
        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT {UserSelectColumns}
            FROM users
            WHERE id = $userId
            LIMIT 1;
        """;
        cmd.Parameters.AddWithValue("$userId", userId);

        return await ReadUserOrDefaultAsync(cmd, includeInactive: true);
    }

    
    public async Task<User> InsertAsync(
        string username,
        string email,
        string passwordHash)
    {
        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var id  = Guid.NewGuid().ToString();
        var now = DateTime.UtcNow.ToString("o");

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO users
                (id, username, email, password_hash, is_active, created_at, updated_at)
            VALUES
                ($id, $username, $email, $hash, 1, $now, $now);
        """;

        cmd.Parameters.AddWithValue("$id", id);
        cmd.Parameters.AddWithValue("$username", username);
        var normalizedEmail = NormalizeEmail(email);
        cmd.Parameters.AddWithValue("$email", normalizedEmail);
        cmd.Parameters.AddWithValue("$hash", passwordHash);
        cmd.Parameters.AddWithValue("$now", now);

        await cmd.ExecuteNonQueryAsync();

        return new User
        {
            Id = id,
            Username = username,
            Email = normalizedEmail,
            IsActive = 1
        };
    }

    public async Task<User?> FindByEmailAsync(string email)
    {
        var normalizedEmail = NormalizeEmail(email);

        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT {UserSelectColumns}
            FROM users
            WHERE email = $email
            LIMIT 1;
        """;
        cmd.Parameters.AddWithValue("$email", normalizedEmail);

        return await ReadUserOrDefaultAsync(cmd, includeInactive: false);
    }

    public async Task<User?> FindByUsernameAsync(string username)
    {
        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT {UserSelectColumns}
            FROM users
            WHERE username = $username
            LIMIT 1;
        """;
        cmd.Parameters.AddWithValue("$username", username);

        return await ReadUserOrDefaultAsync(cmd, includeInactive: false);
    }

    private static string NormalizeEmail(string email)
        => email.Trim().ToLowerInvariant();

    private static async Task<User?> ReadUserOrDefaultAsync(SqliteCommand cmd, bool includeInactive)
    {
        using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return null;

        var user = MapUser(reader);
        if (!includeInactive && user.IsActive == 0)
            return null;

        return user;
    }

    private static User MapUser(SqliteDataReader reader)
    {
        return new User
        {
            Id = reader.GetString(0),
            Username = reader.GetString(1),
            Email = reader.GetString(2),
            PasswordHash = reader.GetString(3),
            IsActive = reader.GetInt32(4),
        };
    }

}