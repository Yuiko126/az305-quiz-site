using Microsoft.Data.Sqlite;
using az305_api.Models;

namespace az305_api.Services.Data;

/// <summary>
/// 試験セッション・回答履歴に関するクエリを担当します。
/// </summary>
public sealed class SessionRepository
{
    private readonly DbService _db;

    public SessionRepository(DbService db) => _db = db;

    public async Task InsertExamSessionAsync(
        string sessionId,
        string userId,
        int? score,
        int totalQuestions,
        int? timeSeconds,
        string mode,
        DateTime startedAt,
        DateTime finishedAt)
    {
        await _db.EnsureUserExistsAsync(userId);

        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO exam_sessions (
                id, user_id, score, total_questions, time_seconds,
                mode, started_at, finished_at
            )
            VALUES (
                $id, $user, $score, $total, $time, $mode, $start, $finish
            );
        """;
        cmd.Parameters.AddWithValue("$id", sessionId);
        cmd.Parameters.AddWithValue("$user", userId);
        cmd.Parameters.AddWithValue("$score",  (object?)score        ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$total",  totalQuestions);
        cmd.Parameters.AddWithValue("$time",   (object?)timeSeconds  ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$mode",   mode);
        cmd.Parameters.AddWithValue("$start",  startedAt.ToString("o"));
        cmd.Parameters.AddWithValue("$finish", finishedAt.ToString("o"));

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task InsertSessionAnswerAsync(
        string userId,
        string sessionId,
        string questionId,
        string? chosenChoiceId,
        bool isCorrect,
        int? timeSeconds)
    {
        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();

        // 既存レコードを確認（同一セッション・問題の再回答）
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
            cmd.CommandText = """
                UPDATE session_answers
                SET
                    chosen_choice_id = $cid,
                    is_correct       = $ok,
                    time_seconds     = $time,
                    answered_at      = $at
                WHERE id = $id;
            """;
            cmd.Parameters.Add(new SqliteParameter("$id", existingId.ToString()));
        }
        else
        {
            cmd.CommandText = """
                INSERT INTO session_answers (
                    id, user_id, session_id, question_id,
                    chosen_choice_id, is_correct, time_seconds, answered_at
                )
                VALUES ($id, $user, $sid, $qid, $cid, $ok, $time, $at);
            """;
            cmd.Parameters.Add(new SqliteParameter("$id",   Guid.NewGuid().ToString()));
            cmd.Parameters.Add(new SqliteParameter("$user", userId));
            cmd.Parameters.Add(new SqliteParameter("$sid",  sessionId));
            cmd.Parameters.Add(new SqliteParameter("$qid",  questionId));
        }

        cmd.Parameters.Add(new SqliteParameter("$cid",  chosenChoiceId ?? (object)DBNull.Value));
        cmd.Parameters.Add(new SqliteParameter("$ok",   isCorrect ? 1 : 0));
        cmd.Parameters.Add(new SqliteParameter("$time", timeSeconds ?? (object)DBNull.Value));
        cmd.Parameters.Add(new SqliteParameter("$at",   DateTime.UtcNow.ToString("o")));

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<List<SessionRecord>> GetSessionsAsync(string userId)
    {
        using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandTimeout = 10;
        cmd.CommandText = """
            SELECT
                s.id,
                s.user_id,
                s.mode,
                s.started_at,
                s.finished_at,
                s.time_seconds,
                COALESCE(s.total_questions, 0) AS total,
                COALESCE(s.score, 0)           AS correct,
                COALESCE(s.domain, 'all')      AS domain
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
                Id          = reader.GetString(0),
                UserId      = reader.GetString(1),
                Mode        = reader.GetString(2),
                StartedAt   = DateTime.Parse(reader.GetString(3)),
                FinishedAt  = reader.IsDBNull(4) ? null : DateTime.Parse(reader.GetString(4)),
                TimeSeconds = reader.IsDBNull(5) ? null : reader.GetInt32(5),
                Total       = reader.GetInt32(6),
                Correct     = reader.GetInt32(7),
                Domain      = reader.GetString(8)
            });
        }

        return list;
    }

    public async Task SaveSessionAsync(SessionDto dto)
    {
        await _db.EnsureUserExistsAsync(dto.UserId);

        using var conn = _db.CreateConnection();
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
        cmd.Parameters.AddWithValue("$id",     sessionId);
        cmd.Parameters.AddWithValue("$userId", dto.UserId);
        cmd.Parameters.AddWithValue("$score",  dto.Correct);
        cmd.Parameters.AddWithValue("$total",  dto.Total);
        cmd.Parameters.AddWithValue("$mode",   dto.Mode);
        cmd.Parameters.AddWithValue("$domain", dto.Domain);
        cmd.Parameters.AddWithValue("$now",    now);

        await cmd.ExecuteNonQueryAsync();
    }
}
