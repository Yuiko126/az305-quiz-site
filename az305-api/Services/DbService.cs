// ============================================================
// DbService.cs
// Azure Functions v4 / .NET 8 isolated + Microsoft.Data.Sqlite
//
// 【追加パッケージ】
//   dotnet add package Microsoft.Data.Sqlite          (既存)
//   dotnet add package Microsoft.AspNetCore.Identity  (追加が必要)
// ============================================================

using System.Data;

namespace az305_api.Services;

// ----- シンプルなユーザーモデル（Identity 不要な最小実装）-----
public record UserModel(string Id, string Username, string Email);

// ---------------------------------------------------------------
// DbService: SQLite 接続・初期化・認証
// ---------------------------------------------------------------
public class DbService
{
    private readonly string _connectionString;
    private readonly string _dataDir;


    public SqliteConnection CreateConnection()
    {
        return new SqliteConnection(_connectionString);
    }


public DbService(IConfiguration config)
{
    try
    {
        Console.WriteLine("=== DbService ctor START ===");

        // ✅ プロジェクトルートを取得（bin を脱出）
        var projectRoot = Directory.GetParent(
            Directory.GetParent(
                Directory.GetParent(
                    AppContext.BaseDirectory
                )!.FullName
            )!.FullName
        )!.FullName;

        _dataDir = Path.Combine(projectRoot, "Data");

        Console.WriteLine($"[DbService] ProjectRoot = {projectRoot}");
        Console.WriteLine($"[DbService] DataDir = {_dataDir}");

        Directory.CreateDirectory(_dataDir);

        var dbPath = Path.Combine(_dataDir, "az305.db");
        Console.WriteLine($"[DbService] DB path = {dbPath}");

        _connectionString = $"Data Source={dbPath}";

        ApplyPragmas();
        Console.WriteLine("[DbService] Pragmas applied");

        InitializeSchema();
        Console.WriteLine("[DbService] Schema initialized");

        // ✅ 初回のみCSVシードを実行（DBが新規作成された場合のみ）
        var csvPath = Path.Combine(_dataDir, "questions.csv");
        if (ShouldSeedDatabase())
        {
            Console.WriteLine("[DbService] First run detected - seeding database...");
            SeedQuestionsFromCsvAsync(csvPath).GetAwaiter().GetResult();
            Console.WriteLine("[DbService] Database seeded successfully");
        }
        else
        {
            Console.WriteLine("[DbService] Database already seeded - skipping CSV import");
        }

        Console.WriteLine("=== DbService ctor END ===");
    }
    catch (Exception ex)
    {
        Console.WriteLine("=== DbService ctor FAILED ===");
        Console.WriteLine($"Error: {ex.Message}");
        Console.WriteLine($"StackTrace: {ex.StackTrace}");
        throw; // 再スロー
    }
}

private async Task<string> GetOrCreateCategoryIdAsync(string name)
{
    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();

    // ① 既存チェック
    using (var check = conn.CreateCommand())
    {
        check.CommandText = "SELECT id FROM categories WHERE name = $name";
        check.Parameters.AddWithValue("$name", name);

        var existing = await check.ExecuteScalarAsync();
        if (existing != null)
            return existing.ToString()!;
    }

    // ② なければ作成
    var id = Guid.NewGuid().ToString();

    using (var insert = conn.CreateCommand())
    {
        insert.CommandText = """
            INSERT INTO categories (id, name, created_at)
            VALUES ($id, $name, $now);
        """;
        insert.Parameters.AddWithValue("$id", id);
        insert.Parameters.AddWithValue("$name", name);
        insert.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("o"));

        await insert.ExecuteNonQueryAsync();
    }

    return id;
}

public async Task SeedQuestionsFromCsvAsync(string csvPath)
{
    Console.WriteLine($"[Seed] CSV path = {csvPath}");
    Console.WriteLine($"[Seed] CSV exists = {File.Exists(csvPath)}");

    if (!File.Exists(csvPath))
        return;

    var rows = CsvParser.Parse(csvPath);

    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();

    foreach (var r in rows)
    {
        var categoryId = await GetOrCreateCategoryIdAsync(r.Domain);

        // questions
        using (var q = conn.CreateCommand())
        {
            q.CommandText = """
                INSERT OR IGNORE INTO questions
                    (id, category_id, question_text, explanation, reference_url, created_at)
                VALUES
                    ($id, $cat, $text, $exp, $url, $now);
            """;

            q.Parameters.AddWithValue("$id", r.Id);
            q.Parameters.AddWithValue("$cat", categoryId);
            q.Parameters.AddWithValue("$text", r.QuestionText);
            q.Parameters.AddWithValue("$exp", r.Explanation ?? "");
            q.Parameters.AddWithValue("$url", r.ReferenceUrl ?? "");
            q.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("o"));

            await q.ExecuteNonQueryAsync();
        }

        // choices
        await InsertChoiceAsync(r.Id, "A", r.OptionA, r.Answer == "A");
        await InsertChoiceAsync(r.Id, "B", r.OptionB, r.Answer == "B");
        await InsertChoiceAsync(r.Id, "C", r.OptionC, r.Answer == "C");
        await InsertChoiceAsync(r.Id, "D", r.OptionD, r.Answer == "D");
    }
}
public async Task InsertExamSessionAsync(
    string sessionId,
    string userId,
    int? score,
    int totalQuestions,
    int? timeSeconds,
    string mode,
    DateTime startedAt,
    DateTime finishedAt
)
{
    await EnsureUserExistsAsync(userId);

    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();

    using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        INSERT INTO exam_sessions (
            id,
            user_id,
            score,
            total_questions,
            time_seconds,
            mode,
            started_at,
            finished_at
        )
        VALUES (
            $id, $user, $score, $total, $time, $mode, $start, $finish
        );
    """;

    cmd.Parameters.AddWithValue("$id", sessionId);
    cmd.Parameters.AddWithValue("$user", userId);
    cmd.Parameters.AddWithValue("$score", (object?)score ?? DBNull.Value);
    cmd.Parameters.AddWithValue("$total", totalQuestions);
    cmd.Parameters.AddWithValue("$time", (object?)timeSeconds ?? DBNull.Value);
    cmd.Parameters.AddWithValue("$mode", mode);
    cmd.Parameters.AddWithValue("$start", startedAt.ToString("o"));
    cmd.Parameters.AddWithValue("$finish", finishedAt.ToString("o"));

    await cmd.ExecuteNonQueryAsync();
}

public async Task InsertSessionAnswerAsync(
    string userId,
    string sessionId,
    string questionId,
    string? chosenChoiceId,
    bool isCorrect,
    int? timeSeconds
)
{
    Console.WriteLine($"[InsertSessionAnswerAsync] Parameters: userId={userId}, sessionId={sessionId}, questionId={questionId}, chosenChoiceId={chosenChoiceId}, isCorrect={isCorrect} (as int: {(isCorrect ? 1 : 0)})");

    using var conn = CreateConnection();
    await conn.OpenAsync();

    using var cmd = conn.CreateCommand();

    // ✅ まず既存レコードをチェック
    cmd.CommandText = """
        SELECT id FROM session_answers 
        WHERE session_id = $sid AND question_id = $qid
        LIMIT 1;
    """;
    cmd.Parameters.Add(new SqliteParameter("$sid", sessionId));
    cmd.Parameters.Add(new SqliteParameter("$qid", questionId));

    var existingId = await cmd.ExecuteScalarAsync();

    cmd.Parameters.Clear();

    if (existingId != null)
    {
        // ✅ 既存レコードを更新
        cmd.CommandText = """
            UPDATE session_answers
            SET 
                chosen_choice_id = $cid,
                is_correct = $ok,
                time_seconds = $time,
                answered_at = $at
            WHERE id = $id;
        """;
        cmd.Parameters.Add(new SqliteParameter("$id", existingId.ToString()));
    }
    else
    {
        // ✅ 新規レコードを挿入
        cmd.CommandText = """
            INSERT INTO session_answers (
                id,
                user_id,
                session_id,
                question_id,
                chosen_choice_id,
                is_correct,
                time_seconds,
                answered_at
            )
            VALUES ($id, $user, $sid, $qid, $cid, $ok, $time, $at);
        """;
        cmd.Parameters.Add(new SqliteParameter("$id", Guid.NewGuid().ToString()));
        cmd.Parameters.Add(new SqliteParameter("$user", userId));
        cmd.Parameters.Add(new SqliteParameter("$sid", sessionId));
        cmd.Parameters.Add(new SqliteParameter("$qid", questionId));
    }

    // ✅ 共通パラメータ
    cmd.Parameters.Add(
        new SqliteParameter("$cid", chosenChoiceId ?? (object)DBNull.Value)
    );
    cmd.Parameters.Add(new SqliteParameter("$ok", isCorrect ? 1 : 0));
    cmd.Parameters.Add(
        new SqliteParameter("$time", timeSeconds ?? (object)DBNull.Value)
    );
    cmd.Parameters.Add(new SqliteParameter("$at", DateTime.UtcNow.ToString("o")));

    var rowsAffected = await cmd.ExecuteNonQueryAsync();
    Console.WriteLine($"[InsertSessionAnswerAsync] Rows affected: {rowsAffected}, Operation: {(existingId != null ? "UPDATE" : "INSERT")}");
}




private async Task InsertChoiceAsync(
    string questionId, string label, string text, bool isCorrect)
{
    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();
    
    using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        INSERT OR IGNORE INTO question_choices
        (id, question_id, choice_label, choice_text, is_correct)
        VALUES ($id, $qid, $label, $text, $correct);
    """;

    cmd.Parameters.AddWithValue("$id", Guid.NewGuid().ToString());
    cmd.Parameters.AddWithValue("$qid", questionId);
    cmd.Parameters.AddWithValue("$label", label);
    cmd.Parameters.AddWithValue("$text", text);
    cmd.Parameters.AddWithValue("$correct", isCorrect ? 1 : 0);

    await cmd.ExecuteNonQueryAsync();
}
    // ----------------------------------------------------------
    // PRAGMA（WAL モード + 外部キー制約）
    // Microsoft.Data.Sqlite では接続ごとに発行が必要
    // ----------------------------------------------------------
    private void ApplyPragmas()
    {
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
            """;
        cmd.ExecuteNonQuery();
    }

    // ----------------------------------------------------------
    // データベースにシードが必要かチェック
    // ----------------------------------------------------------
    private bool ShouldSeedDatabase()
    {
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM questions;";

        var count = Convert.ToInt32(cmd.ExecuteScalar());
        return count == 0;  // 問題が1件もなければシードが必要
    }

    // ----------------------------------------------------------
    // スキーマ初期化（schema.sql を読み込んで実行）
    // ----------------------------------------------------------
    private void InitializeSchema()
    {
        var schemaPath = Path.Combine(_dataDir, "schema.sql");
        if (!File.Exists(schemaPath)) return;

        var sql = File.ReadAllText(schemaPath);

        using var conn = new SqliteConnection(_connectionString);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.ExecuteNonQuery();
    }

    
public async Task EnsureUserExistsAsync(string userId)
{
    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();

    using var check = conn.CreateCommand();
    check.CommandText = "SELECT COUNT(*) FROM users WHERE id = $id";
    check.Parameters.AddWithValue("$id", userId);

    var exists = Convert.ToInt32(await check.ExecuteScalarAsync()) > 0;
    if (exists) return;

    using var insert = conn.CreateCommand();
    insert.CommandText = """
        INSERT INTO users
            (id, username, email, password_hash, created_at, updated_at)
        VALUES
            ($id, $username, $email, 'dummy', $now, $now);
    """;

    insert.Parameters.AddWithValue("$id", userId);
    insert.Parameters.AddWithValue("$username", $"guest-{userId[..6]}");
    insert.Parameters.AddWithValue("$email", $"{userId}@example.com");
    insert.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("o"));

    await insert.ExecuteNonQueryAsync();
}

    
public async Task<CheckResponse?> CheckAnswerAsync(
    string questionId,
    string selectedLabel)
{
    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();

    using var cmd = conn.CreateCommand();

    cmd.CommandText = """
        SELECT
            qc.is_correct,
            q.explanation,
            q.reference_url,
            (
            SELECT choice_label
            FROM question_choices
            WHERE question_id = q.id AND is_correct = 1
            LIMIT 1
            ) AS correct_label
        FROM question_choices qc
        JOIN questions q ON q.id = qc.question_id
        WHERE qc.question_id = $qid
        AND qc.choice_label = $label
        LIMIT 1;
    """;

    cmd.Parameters.AddWithValue("$qid", questionId);
    cmd.Parameters.AddWithValue("$label", selectedLabel.ToUpper());

    using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync())
        return null;


    Console.WriteLine(
        $"Selected={selectedLabel}, IsCorrect(raw)={reader.GetInt32(0)}"
    );

    return new CheckResponse
    {
        IsCorrect     = reader.GetInt32(0) == 1,
        Explanation   = reader.GetString(1),
        ReferenceUrl  = reader.IsDBNull(2) ? null : reader.GetString(2),
        CorrectAnswer = reader.GetString(3)
    };
}

public async Task UpdateUserProgressAsync(
    string userId,
    string questionId,
    bool isCorrect)
{
    await EnsureUserExistsAsync(userId);

    Console.WriteLine("=== ENTER UpdateUserProgressAsync ===");

    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();

    var now = DateTime.UtcNow.ToString("o");

    using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        INSERT INTO user_progress
            (id, user_id, question_id, attempt_count, correct_count, last_attempted_at)
        VALUES
            ($id, $user, $question, 1, $correct, $now)
        ON CONFLICT(user_id, question_id)
        DO UPDATE SET
            attempt_count = attempt_count + 1,
            correct_count = correct_count + $correct,
            last_attempted_at = $now;
    """;

    cmd.Parameters.AddWithValue("$id", Guid.NewGuid().ToString());
    cmd.Parameters.AddWithValue("$user", userId);
    cmd.Parameters.AddWithValue("$question", questionId);
    cmd.Parameters.AddWithValue("$correct", isCorrect ? 1 : 0);
    cmd.Parameters.AddWithValue("$now", now);

    await cmd.ExecuteNonQueryAsync();

    Console.WriteLine("=== EXIT UpdateUserProgressAsync ===");
}


    
public async Task<List<QuestionResponse>> GetQuestionsAsync(
    string? domain,
    int limit)
{
    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();
    var list = new List<QuestionResponse>();

    using var cmd = conn.CreateCommand();

    cmd.CommandText = """
        SELECT
            q.id,
            c.name            AS domain,
            q.question_text,
            MAX(CASE WHEN qc.choice_label = 'A' THEN qc.choice_text END) AS optionA,
            MAX(CASE WHEN qc.choice_label = 'B' THEN qc.choice_text END) AS optionB,
            MAX(CASE WHEN qc.choice_label = 'C' THEN qc.choice_text END) AS optionC,
            MAX(CASE WHEN qc.choice_label = 'D' THEN qc.choice_text END) AS optionD
        FROM questions q
        JOIN categories c ON c.id = q.category_id
        JOIN question_choices qc ON qc.question_id = q.id
        WHERE q.is_active = 1
          AND ($domain IS NULL OR c.name = $domain)
        GROUP BY q.id
        ORDER BY RANDOM()
        LIMIT $limit;
    """;

    cmd.Parameters.AddWithValue(
        "$domain",
        string.IsNullOrEmpty(domain) || domain == "all"
            ? DBNull.Value
            : domain);

    cmd.Parameters.AddWithValue("$limit", limit);

    using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        list.Add(new QuestionResponse
        {
            Id           = reader.GetString(0),
            Domain       = reader.GetString(1),
            QuestionText = reader.GetString(2),
            OptionA      = reader.GetString(3),
            OptionB      = reader.GetString(4),
            OptionC      = reader.GetString(5),
            OptionD      = reader.GetString(6),
        });
    }

    return list;
}

public async Task<List<UserCategoryStat>> GetUserCategoryStatsAsync(string userId)
{
    using var conn = CreateConnection();
    await conn.OpenAsync();

    using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        SELECT
            category_id,
            category_name,
            total_attempts,
            total_correct,
            accuracy_pct
        FROM v_user_category_stats
        WHERE user_id = $user;
    """;

    cmd.Parameters.AddWithValue("$user", userId);

    var list = new List<UserCategoryStat>();

    using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        list.Add(new UserCategoryStat
        {
            CategoryId    = reader.GetString(0),
            CategoryName  = reader.GetString(1),
            TotalAttempts = reader.GetInt32(2),
            TotalCorrect  = reader.GetInt32(3),
            AccuracyPct   = reader.GetDouble(4),
        });
    }

    return list;
}

public async Task<string?> GetChoiceIdAsync(string questionId, string label)
    {
        using var conn = CreateConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT id
            FROM question_choices
            WHERE question_id = $qid AND choice_label = $label
            """;

        cmd.Parameters.AddWithValue("$qid", questionId);
        cmd.Parameters.AddWithValue("$label",label);

        var result = await cmd.ExecuteScalarAsync();
        return result?.ToString();
    }

public async Task<List<DomainStatDto>> GetDomainStatsAsync(string userId)
{
    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();

    using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        SELECT
          c.name AS domain,
          SUM(CASE WHEN sa.is_correct = 1 THEN 1 ELSE 0 END) AS correct,
          COUNT(*) AS total
        FROM session_answers sa
        JOIN questions q ON q.id = sa.question_id
        JOIN categories c ON c.id = q.category_id
        WHERE sa.user_id = $userId
        GROUP BY c.name
        ORDER BY c.name;
    """;

    cmd.Parameters.AddWithValue("$userId", userId);

    var list = new List<DomainStatDto>();

    using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        list.Add(new DomainStatDto
        {
            Domain  = reader.GetString(0),
            Correct = reader.GetInt32(1),
            Total   = reader.GetInt32(2),
        });
    }

    return list;
}

// ========================================
// リフレッシュトークン管理
// ========================================

/// <summary>
/// リフレッシュトークンを保存
/// </summary>
public async Task SaveRefreshTokenAsync(string userId, string token, DateTime expiresAt)
{
    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();

    using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
        VALUES ($id, $userId, $token, $expiresAt, $createdAt);
    """;

    cmd.Parameters.AddWithValue("$id", Guid.NewGuid().ToString());
    cmd.Parameters.AddWithValue("$userId", userId);
    cmd.Parameters.AddWithValue("$token", token);
    cmd.Parameters.AddWithValue("$expiresAt", expiresAt.ToString("o"));
    cmd.Parameters.AddWithValue("$createdAt", DateTime.UtcNow.ToString("o"));

    await cmd.ExecuteNonQueryAsync();
}

/// <summary>
/// リフレッシュトークンを検証して、ユーザーIDを取得
/// </summary>
public async Task<string?> ValidateRefreshTokenAsync(string token)
{
    using var conn = new SqliteConnection(_connectionString);
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
        return null;  // トークンが見つからない

    var userId = reader.GetString(0);
    var expiresAt = DateTime.Parse(reader.GetString(1));

    // 有効期限切れチェック
    if (expiresAt < DateTime.UtcNow)
    {
        // 期限切れのトークンを削除
        await DeleteRefreshTokenAsync(token);
        return null;
    }

    return userId;
}

/// <summary>
/// リフレッシュトークンを削除（ログアウト時）
/// </summary>
public async Task DeleteRefreshTokenAsync(string token)
{
    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();

    using var cmd = conn.CreateCommand();
    cmd.CommandText = "DELETE FROM refresh_tokens WHERE token = $token;";
    cmd.Parameters.AddWithValue("$token", token);

    await cmd.ExecuteNonQueryAsync();
}

/// <summary>
/// ユーザーの全リフレッシュトークンを削除（全デバイスからログアウト）
/// </summary>
public async Task DeleteAllRefreshTokensAsync(string userId)
{
    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();

    using var cmd = conn.CreateCommand();
    cmd.CommandText = "DELETE FROM refresh_tokens WHERE user_id = $userId;";
    cmd.Parameters.AddWithValue("$userId", userId);

    await cmd.ExecuteNonQueryAsync();
}

// ========================================
// セッション履歴管理
// ========================================

/// <summary>
/// ユーザーのセッション履歴を取得
/// </summary>
public async Task<List<SessionRecord>> GetSessionsAsync(string userId)
{
    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();

    using var cmd = conn.CreateCommand();
    // タイムアウト設定を追加
    cmd.CommandTimeout = 10; // 10秒でタイムアウト

    cmd.CommandText = """
        SELECT
            s.id,
            s.user_id,
            s.mode,
            s.started_at,
            s.finished_at,
            s.time_seconds,
            COALESCE(s.total_questions, 0) AS total,
            COALESCE(s.score, 0) AS correct,
            COALESCE(s.domain, 'all') AS domain
        FROM exam_sessions s
        WHERE s.user_id = $userId
        ORDER BY s.started_at DESC
        LIMIT 100;
    """;

    cmd.Parameters.AddWithValue("$userId", userId);

    var list = new List<SessionRecord>();

    using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        list.Add(new SessionRecord
        {
            Id = reader.GetString(0),
            UserId = reader.GetString(1),
            Mode = reader.GetString(2),
            StartedAt = DateTime.Parse(reader.GetString(3)),
            FinishedAt = reader.IsDBNull(4) ? (DateTime?)null : DateTime.Parse(reader.GetString(4)),
            TimeSeconds = reader.IsDBNull(5) ? (int?)null : reader.GetInt32(5),
            Total = reader.GetInt32(6),
            Correct = reader.GetInt32(7),
            Domain = reader.GetString(8)
        });
    }

    return list;
}

/// <summary>
/// セッション結果を保存
/// </summary>
public async Task SaveSessionAsync(SessionDto dto)
{
    await EnsureUserExistsAsync(dto.UserId);

    using var conn = new SqliteConnection(_connectionString);
    await conn.OpenAsync();

    var sessionId = Guid.NewGuid().ToString();
    var now = DateTime.UtcNow.ToString("o");

    using var cmd = conn.CreateCommand();
    cmd.CommandText = """
        INSERT INTO exam_sessions
            (id, user_id, score, total_questions, mode, domain, started_at, finished_at, time_seconds)
        VALUES
            ($id, $userId, $score, $total, $mode, $domain, $now, $now, NULL);
    """;

    cmd.Parameters.AddWithValue("$id", sessionId);
    cmd.Parameters.AddWithValue("$userId", dto.UserId);
    cmd.Parameters.AddWithValue("$score", dto.Correct);
    cmd.Parameters.AddWithValue("$total", dto.Total);
    cmd.Parameters.AddWithValue("$mode", dto.Mode);
    cmd.Parameters.AddWithValue("$domain", dto.Domain);
    cmd.Parameters.AddWithValue("$now", now);

    await cmd.ExecuteNonQueryAsync();

    // ✅ セッション保存完了のログ
    Console.WriteLine($"Session saved: sessionId={sessionId}, userId={dto.UserId}, correct={dto.Correct}, total={dto.Total}");
}

}