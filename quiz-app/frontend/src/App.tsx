// src/App.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import type { SessionConfig, SessionResult } from "./types";
import { useAuth } from "./hooks/useAuth";
import { useLearningStats } from "./hooks/useLearningStats";
import { useQuiz } from "./hooks/useQuiz";
import { useStorage } from "./hooks/useStorage";
import { saveSession } from "./utils/api";

import { LoginPage } from "./pages/Login";
import { Home } from "./pages/Home.tsx";
import { Result } from "./pages/Result";
import Quiz from "./pages/Quiz";
import { Dashboard } from "./pages/Dashboard";

export default function App() {
  /* ───────────── 認証状態 ───────────── */
  const { userId, userName, loading: authLoading, checkAuth, logout } = useAuth();

  /* ───────────── 学習状態 ───────────── */
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  const quiz = useQuiz();
  const { allQuestions, currentQuestion, lastResult, loadQuestions, progress } = quiz;
  const storage = useStorage();
  const weakCount = storage.getWeakIds().size;

  const {
    domainStats,
    sessions,
    reload: reloadLearningStats,
  } = useLearningStats(userId);

  const domains = useMemo(
    () => [...new Set(allQuestions.map(q => q.domain))].sort(),
    [allQuestions]
  );

  /* 問題取得（Cookie認証前提） */
  useEffect(() => {
    // ✅ ログイン後のみ問題を取得
    if (!userId) return;

    console.log('[App] Loading questions...');
    loadQuestions().then((loadedQuestions) => {
      console.log('[App] Questions loaded:', loadedQuestions.length);
    });
  }, [userId, loadQuestions]);

/* ───────────── タイマー ───────────── */
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (lastResult !== null) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    if (timerRef.current !== null) return;

    timerRef.current = window.setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [lastResult]);

  /* ───────────── ローディング表示 ───────────── */
  if (authLoading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        認証確認中...
      </div>
    );
  }

  /* ───────────── 未ログイン ───────────── */
  if (!userId) {
    return (
      <LoginPage
        onLoginSuccess={async () => {
          // ✅ Login後に Me を再チェック
          await checkAuth();
        }}
      />
    );
  }

  /* ───────────── ダッシュボード ───────────── */
  if (showDashboard) {
    return (
      <Dashboard
        sessions={sessions}
        totalSessions={sessions.length}
        avgRate={0}
        weakCount={weakCount}
        onHome={() => setShowDashboard(false)}
      />
    );
  }


  /* ───────────── メイン画面 ───────────── */
  return (
    <div className="min-h-screen">
      {sessionResult && (
        <Result
          result={sessionResult}
          onRetry={() => {
            setSessionResult(null);
            quiz.startSession(
              sessionConfig!,
              allQuestions,
              storage.getWeakIds()
            );
          }}
          onHome={async () => {
            quiz.resetSession();
            setSessionResult(null);
            setSessionConfig(null);
            await reloadLearningStats();
          }}
        />
      )}

      {!sessionResult && currentQuestion && (
        <Quiz
          key={`${currentQuestion.id}-${progress.current}`}
          question={currentQuestion}
          progress={progress}
          lastResult={lastResult}
          onAnswer={(a) => quiz.submitAnswer(a, elapsed)}
          onNext={() => {
            quiz.clearLastResult();

            const isLast =
              progress.current === progress.total;

            if (isLast) {
              const result = quiz.getSessionResult();

              // ✅ バックエンドにセッション結果を保存してから最新データ取得
              saveSession({
                correct: result.correct,
                total: result.total,
                mode: sessionConfig!.mode,
                domain: quiz.sessionDomain,
              })
                .then(() => reloadLearningStats())
                .catch(err => {
                  console.error("Failed to save/reload sessions/stats:", err);
                });

              setSessionResult(result);
            } else {
              quiz.goNext();
            }
          }}
          onDashboard={() => setShowDashboard(true)}
          onLogout={async () => {
            await logout();
          }}
          elapsed={elapsed}
        />
      )}

      {!sessionResult && !currentQuestion && (
        <Home
          userName={userName ?? ''}
          questions={allQuestions}
          sessions={sessions}
          domainStats={domainStats}
          domains={domains}
          weakCount={weakCount}
          onStart={async (config: SessionConfig) => {
            setElapsed(0);
            setSessionConfig(config);

            const total =await quiz.startSession(
              config,
              allQuestions,
              storage.getWeakIds()
            );

            if (total === null) {
              alert("苦手問題がありません");
            }
          }}
          onDashboard={() => setShowDashboard(true)}
          onLogout={async () => {
            await logout();
          }}
        />
      )}
    </div>
  );
}