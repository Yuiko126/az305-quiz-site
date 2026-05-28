using Microsoft.Data.Sqlite;
using az305_api.Dtos;

namespace az305_api.Services.Data;

/// <summary>
/// 問題・回答・進捗・統計に関するクエリを担当します。
/// </summary>
public sealed class QuestionRepository
{
    private readonly DbService _db;

    public QuestionRepository(DbService db) => _db = db;

    public async Task<List<QuestionResponse>> GetQuestionsAsync(string? domain, int limit)
    {
        using var conn = _db.CreateConnection();
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
            string.IsNullOrEmpty(domain) || domain == "all" ? DBNull.Value : domain);
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

    public async Task<CheckResponse?> CheckAnswerAsync(string questionId, string selectedLabel)
    {
        using var conn = _db.CreateConnection();
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

        return new CheckResponse
        {
            IsCorrect     = reader.GetInt32(0) == 1,
            Explanation   = reader.GetString(1),
            ReferenceUrl  = reader.IsDBNull(2) ? null : reader.GetString(2),
            CorrectAnswer = reader.GetString(3)
        };
    }

    public async Task<string?> GetChoiceIdAsync(string questionId, string label)
    {
        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT id
            FROM question_choices
            WHERE question_id = $qid AND choice_label = $label
        """;
        cmd.Parameters.AddWithValue("$qid", questionId);
        cmd.Parameters.AddWithValue("$label", label);

        var result = await cmd.ExecuteScalarAsync();
        return result?.ToString();
    }

    public async Task UpdateUserProgressAsync(string userId, string questionId, bool isCorrect)
    {
        await _db.EnsureUserExistsAsync(userId);

        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

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
        cmd.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("o"));

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<List<DomainStatDto>> GetDomainStatsAsync(string userId)
    {
        using var conn = _db.CreateConnection();
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

    public async Task<List<az305_api.Models.UserCategoryStat>> GetUserCategoryStatsAsync(string userId)
    {
        using var conn = _db.CreateConnection();
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

        var list = new List<az305_api.Models.UserCategoryStat>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new az305_api.Models.UserCategoryStat
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
}
