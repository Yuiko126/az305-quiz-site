-- ============================================================
-- AZ-305 試験アプリ データベーススキーマ
-- Runtime : Azure Functions v4 / .NET 8 isolated
-- Client  : Microsoft.Data.Sqlite
-- ============================================================
-- Microsoft.Data.Sqlite は PRAGMA を接続時に自動で発行できないため
-- DbService の初期化コードで以下を実行してください:
--   PRAGMA journal_mode = WAL;
--   PRAGMA foreign_keys = ON;
-- ============================================================

-- ------------------------------------------------------------
-- 1. categories（問題カテゴリ）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id          TEXT    NOT NULL PRIMARY KEY,   -- Guid.NewGuid().ToString()
    name        TEXT    NOT NULL UNIQUE,        -- 例: "Identity & Access Management"
    description TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL               -- ISO-8601: DateTime.UtcNow.ToString("o")
);

-- ------------------------------------------------------------
-- 2. users（ユーザー）
--
--   【ハッシュ化の方針】
--   .NET 標準ライブラリには bcrypt がないため
--   Microsoft.AspNetCore.Identity の PasswordHasher<T> を使用する。
--   PBKDF2-HMAC-SHA512 + ソルト (128 bit) + 反復 100,000 回を
--   Base64 エンコードした1列で完結する。
--   ソルトはハッシュ文字列に埋め込まれているが、
--   将来のアルゴリズム変更を追跡するため hash_version も保持する。
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            TEXT    NOT NULL PRIMARY KEY,   -- Guid.NewGuid().ToString()
    username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,               -- PasswordHasher 出力（ソルト埋め込み済み）
    hash_version  INTEGER NOT NULL DEFAULT 3,     -- AspNetCore Identity のバージョン番号
    total_score   INTEGER NOT NULL DEFAULT 0,
    is_active     INTEGER NOT NULL DEFAULT 1,     -- 0: 無効, 1: 有効
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL
);

-- ------------------------------------------------------------
-- 3. questions（問題）
--    questions.csv から DbInitializer で一括 INSERT する想定
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
    id            TEXT    NOT NULL PRIMARY KEY,
    category_id   TEXT    NOT NULL REFERENCES categories(id),
    question_text TEXT    NOT NULL,
    explanation   TEXT,
    difficulty    TEXT    NOT NULL DEFAULT 'medium',  -- 'easy' | 'medium' | 'hard'
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active     INTEGER NOT NULL DEFAULT 1,
    reference_url TEXT,
    created_at    TEXT    NOT NULL
);

-- ------------------------------------------------------------
-- 4. question_choices（選択肢）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_choices (
    id           TEXT    NOT NULL PRIMARY KEY,
    question_id  TEXT    NOT NULL REFERENCES questions(id),
    choice_label TEXT    NOT NULL,   -- 'A' | 'B' | 'C' | 'D'
    choice_text  TEXT    NOT NULL,
    is_correct   INTEGER NOT NULL DEFAULT 0,
    UNIQUE (question_id, choice_label)
);

-- ------------------------------------------------------------
-- 5. exam_sessions（受験セッション）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_sessions (
    id              TEXT    NOT NULL PRIMARY KEY,
    user_id         TEXT    NOT NULL REFERENCES users(id),
    score           INTEGER,                -- NULL = 未完了
    total_questions INTEGER NOT NULL DEFAULT 0,
    time_seconds    INTEGER,
    mode            TEXT    NOT NULL DEFAULT 'exam',  -- 'exam' | 'practice' | 'review'
    domain          TEXT,                   -- カテゴリ/ドメイン名
    started_at      TEXT    NOT NULL,
    finished_at     TEXT                    -- NULL = 受験中
);

-- ------------------------------------------------------------
-- 6. session_answers（各問への回答）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_answers (
    id               TEXT    NOT NULL PRIMARY KEY,
    user_id          TEXT    NOT NULL REFERENCES users(id),
    session_id       TEXT    NOT NULL REFERENCES exam_sessions(id),
    question_id      TEXT    NOT NULL REFERENCES questions(id),
    chosen_choice_id TEXT    REFERENCES question_choices(id),   -- NULL = 未回答
    is_correct       INTEGER,
    time_seconds     INTEGER,
    answered_at      TEXT    NOT NULL,
    UNIQUE (session_id, question_id)
);

-- ------------------------------------------------------------
-- 7. user_progress（問題ごとの学習進捗）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_progress (
    id                TEXT    NOT NULL PRIMARY KEY,
    user_id           TEXT    NOT NULL REFERENCES users(id),
    question_id       TEXT    NOT NULL REFERENCES questions(id),
    attempt_count     INTEGER NOT NULL DEFAULT 0,
    correct_count     INTEGER NOT NULL DEFAULT 0,
    last_attempted_at TEXT,
    UNIQUE (user_id, question_id)
);

-- ------------------------------------------------------------
-- 8. refresh_tokens（リフレッシュトークン）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          TEXT NOT NULL PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    token       TEXT NOT NULL UNIQUE,
    expires_at  TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

-- ============================================================
-- インデックス
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username    ON users(username);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id, display_order);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty, is_active);
CREATE INDEX IF NOT EXISTS idx_choices_question  ON question_choices(question_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user     ON exam_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_answers_session   ON session_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_user      ON session_answers(user_id, is_correct);
CREATE INDEX IF NOT EXISTS idx_answers_question  ON session_answers(question_id, is_correct);
CREATE INDEX IF NOT EXISTS idx_progress_user     ON user_progress(user_id, correct_count, attempt_count);
CREATE INDEX IF NOT EXISTS idx_progress_last     ON user_progress(user_id, last_attempted_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================================
-- ビュー: ユーザーごとのカテゴリ別正答率
-- ============================================================
CREATE VIEW IF NOT EXISTS v_user_category_stats AS
SELECT
    up.user_id,
    q.category_id,
    c.name                                              AS category_name,
    SUM(up.attempt_count)                               AS total_attempts,
    SUM(up.correct_count)                               AS total_correct,
    ROUND(
        CAST(SUM(up.correct_count) AS REAL)
        / MAX(SUM(up.attempt_count), 1) * 100.0, 1
    )                                                   AS accuracy_pct
FROM user_progress up
JOIN questions  q ON q.id = up.question_id
JOIN categories c ON c.id = q.category_id
GROUP BY up.user_id, q.category_id;