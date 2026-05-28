
import type { AnswerResult, DomainStat, SessionRecord, SessionConfig } from "../types";

export const API_BASE = import.meta.env.VITE_API_BASE;

type DomainStatDto = {
  Domain?: string;
  domain?: string;
  Correct?: number;
  correct?: number;
  Total?: number;
  total?: number;
  Rate?: number;
  rate?: number;
};

type SessionRecordDto = {
  UserId?: string;
  userId?: string;
  Date?: string;
  date?: string;
  Correct?: number;
  correct?: number;
  Total?: number;
  total?: number;
  Rate?: number;
  rate?: number;
  Mode?: string;
  mode?: string;
  Domain?: string;
  domain?: string;
};

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toMode(value: unknown): SessionRecord["mode"] {
  return value === "weak" ? "weak" : "normal";
}

function mapDomainStat(dto: DomainStatDto): DomainStat {
  const correct = toNumber(dto.correct ?? dto.Correct);
  const total = toNumber(dto.total ?? dto.Total);
  const calculatedRate = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    domain: dto.domain ?? dto.Domain ?? "",
    correct,
    total,
    rate: toNumber(dto.rate ?? dto.Rate, calculatedRate),
  };
}

function mapSessionRecord(dto: SessionRecordDto): SessionRecord {
  const correct = toNumber(dto.correct ?? dto.Correct);
  const total = toNumber(dto.total ?? dto.Total);
  const calculatedRate = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    userId: dto.userId ?? dto.UserId,
    date: dto.date ?? dto.Date ?? new Date(0).toISOString(),
    correct,
    total,
    rate: toNumber(dto.rate ?? dto.Rate, calculatedRate),
    mode: toMode(dto.mode ?? dto.Mode),
    domain: dto.domain ?? dto.Domain ?? "all",
  };
}

// リフレッシュ中かどうかのフラグ
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * リフレッシュトークンを使って新しいアクセストークンを取得
 */
async function refreshAccessToken(): Promise<boolean> {
  // 既にリフレッシュ中なら、その結果を待つ
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include", // refresh_token Cookie を自動送信
      });

      if (!res.ok) {
        console.error("Token refresh failed:", res.status);
        return false;
      }

      console.log("✅ Token refreshed successfully");
      return true;
    } catch (error) {
      console.error("Token refresh error:", error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * 自動リフレッシュ機能付きのfetch
 */
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // credentials: 'include' を自動追加
  const fetchOptions: RequestInit = {
    ...options,
    credentials: "include",
  };

  // 1回目のリクエスト
  let response = await fetch(url, fetchOptions);

  // 401エラーならリフレッシュを試みる
  if (response.status === 401) {
    console.log("⚠️ 401 Unauthorized - トークンをリフレッシュします");

    const refreshed = await refreshAccessToken();

    if (refreshed) {
      // リフレッシュ成功 → リトライ
      console.log("🔄 リクエストをリトライします");
      response = await fetch(url, fetchOptions);
    } else {
      // リフレッシュ失敗 → ログアウトが必要
      console.error("❌ リフレッシュ失敗 - 再ログインが必要です");
      // ここでログアウト処理を呼ぶこともできる
    }
  }

  return response;
}

//ログインAPI
export async function login(loginId: string, password: string) {
  const res = await fetch(`${API_BASE}/Login`, {
    method: "POST",
    credentials: "include", // Cookie を受け取る
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      loginId,
      password,
    }),
  });

  if (!res.ok) {
    throw new Error("Login failed");
  }

  const data = await res.json();
  return data;
}

//新規登録API
export async function register(username: string, email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, email, password }),
  });

  if (!res.ok) {
    throw new Error("register failed");
  }
}

//MeAPI（ログイン直後は自動リフレッシュしない）
export async function me() {
  const res = await fetch(`${API_BASE}/Me`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Unauthorized");
  }

  return res.json();
}

/**
 * クイズ取得（自動リフレッシュ対応）
 */
export async function getQuestions(domain: string = "all", limit: number = 999) {
  const res = await fetchWithAuth(`${API_BASE}/questions?domain=${domain}&limit=${limit}`);

  if (!res.ok) {
    throw new Error("Failed to fetch questions");
  }

  return res.json();
}

/**
 * 統計情報取得（自動リフレッシュ対応）
 */
export async function getDomainStats(): Promise<DomainStat[]> {
  const res = await fetchWithAuth(`${API_BASE}/stats/domains`);

  if (!res.ok) {
    throw new Error("Failed to fetch stats");
  }

  const data = (await res.json()) as DomainStatDto[];
  return Array.isArray(data) ? data.map(mapDomainStat) : [];
}

/**
 * セッション履歴取得（自動リフレッシュ対応）
 */
export async function getSessions(): Promise<SessionRecord[]> {
  const res = await fetchWithAuth(`${API_BASE}/sessions`);

  if (!res.ok) {
    throw new Error("Failed to fetch sessions");
  }

  const data = (await res.json()) as SessionRecordDto[];
  return Array.isArray(data) ? data.map(mapSessionRecord) : [];
}

/**
 * セッション結果を保存（自動リフレッシュ対応）
 */
export async function saveSession(data: {
  correct: number;
  total: number;
  mode: string;
  domain: string;
}) {
  const res = await fetchWithAuth(`${API_BASE}/SaveSession`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Correct: data.correct,  // ✅ 大文字に変更
      Total: data.total,      // ✅ 大文字に変更
      Mode: data.mode,        // ✅ 大文字に変更
      Domain: data.domain,    // ✅ 大文字に変更
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Failed to save session:", errorText);
    throw new Error("Failed to save session");
  }

  return res.json();
}

export async function startSession(data: {
  totalQuestions: number;
  mode: SessionConfig["mode"];
  startedAt: string;
  finishedAt: string;
}): Promise<{ sessionId: string }> {
  const res = await fetchWithAuth(`${API_BASE}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      score: null,
      totalQuestions: data.totalQuestions,
      timeSeconds: null,
      mode: data.mode,
      startedAt: data.startedAt,
      finishedAt: data.finishedAt,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to start session: ${errorText}`);
  }

  const payload = (await res.json()) as { sessionId?: string | number };
  return { sessionId: String(payload.sessionId ?? "") };
}

export async function checkAnswer(data: {
  sessionId: string;
  questionId: number;
  selected: "A" | "B" | "C" | "D";
  timeSeconds?: number;
}): Promise<AnswerResult> {
  const res = await fetchWithAuth(`${API_BASE}/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId: data.sessionId,
      questionId: data.questionId,
      selected: data.selected,
      timeSeconds: data.timeSeconds ?? null,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`CHECK ERROR: ${text}`);
  }

  return JSON.parse(text) as AnswerResult;
}

export async function logout(): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/logout`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Logout failed");
  }
}


