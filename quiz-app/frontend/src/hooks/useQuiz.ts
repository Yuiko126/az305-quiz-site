import { useState, useCallback } from 'react'
import type {
  Question,
  SessionConfig,
  AnswerResult,
  SessionResult,
  DomainResult,
} from '../types'
import { shuffle } from '../utils/shuffle'
import { checkAnswer, getQuestions, startSession as startSessionApi } from '../utils/api'

type SessionAnswer = {
  questionId: number
  domain: string
  questionText: string
  selected: string
  selectedText: string
  isCorrect: boolean
  correctAnswer: string
  correctAnswerText: string
}

export function useQuiz() {
  const [allQuestions, setAllQuestions]     = useState<Question[]>([])
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex]     = useState(0)
  const [correctCount, setCorrectCount]     = useState(0)
  const [lastResult, setLastResult]         = useState<AnswerResult | null>(null)
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([])
  const [isLoading, setIsLoading]           = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0)

  const clearLastResult = useCallback(() => { setLastResult(null)}, [])

  //クイズの状態をリセットする
  const resetSession = useCallback(() => {
    setSessionQuestions([]);
    setCurrentIndex(0);
    setLastResult(null);
    setSessionElapsedSeconds(0);
  }, []);

  // ─── API から問題を取得（自動リフレッシュ対応） ────────────────────
  const loadQuestions = useCallback(async (domain = 'all') => {
    console.log('[useQuiz] loadQuestions called');
    setIsLoading(true)
    try {
      const data = await getQuestions(domain, 999)
      console.log('[useQuiz] Fetched questions:', data.length);
      setAllQuestions(data)
      return data
    } finally {
      setIsLoading(false)
    }
  }, []);

  // ─── ドメイン一覧 ──────────────────────────
  const getDomains = useCallback((qs: Question[]) => {
    return [...new Set(qs.map(q => q.domain))].sort()
  }, [])

  const [sessionDomain, setSessionDomain] = useState<string>('all')
  // ─── セッション開始 ────────────────────────
  const startSession = useCallback(async(
    config: SessionConfig,
    qs: Question[],
    weakIds: Set<number>
  ): Promise<string | null> => {
    setSessionDomain(config.domain)
    let pool = config.domain === 'all'
      ? [...qs]
      : qs.filter(q => q.domain === config.domain)

    if (config.mode === 'weak') {
      pool = pool.filter(q => weakIds.has(q.id))
      if (pool.length === 0) return null
    }

    pool = shuffle(pool)

    const total = config.count === 'all'
      ? pool.length
      : Math.min(Number(config.count), pool.length)

    const selected = pool.slice(0, total)

    setSessionQuestions(selected)
    setCurrentIndex(0)
    setCorrectCount(0)
    setLastResult(null)
    setSessionAnswers([])
    setSessionElapsedSeconds(0)

    const data = await startSessionApi({
      totalQuestions: selected.length,
      mode: config.mode,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    })

    setSessionId(data.sessionId)
    return data.sessionId

  }, [])

  // ─── 現在の問題 ────────────────────────────
  const currentQuestion = sessionQuestions[currentIndex] ?? null

  // ─── 回答をAPIに送信してサーバーで正誤判定 ──
  const submitAnswer = useCallback(
  async (
    selected: 'A' | 'B' | 'C' | 'D',
    elapsedSeconds?: number
  ): Promise<AnswerResult | null> => {

    const q = sessionQuestions[currentIndex];
    if (!q || !sessionId) return null;

    let data: AnswerResult;
    try {
      data = await checkAnswer({
        sessionId,
        questionId: q.id,
        selected,
        timeSeconds: elapsedSeconds,
      });
    } catch (error) {
      console.error('CHECK ERROR:', error);
      return null;
    }

    if (typeof elapsedSeconds === 'number' && Number.isFinite(elapsedSeconds)) {
      setSessionElapsedSeconds(elapsedSeconds)
    }

    if (data.isCorrect) setCorrectCount(c => c + 1);

    setLastResult(data);
    setSessionAnswers(prev => [
      ...prev,
      {
        questionId: q.id,
        domain: q.domain,
        questionText: q.questionText,
        selected,
        selectedText: q[`option${selected}` as const],
        correctAnswer: data.correctAnswer,
        correctAnswerText: q[`option${data.correctAnswer}` as const],
        isCorrect: data.isCorrect,
      },
    ]);

    return data;
  },
  [sessionQuestions, currentIndex, sessionId]
);

  // ─── 次の問題へ ────────────────────────────

const goNext = useCallback(() => {
  setCurrentIndex(i => i + 1)  // ← 次の問題へ
}, [])

  // ─── プログレス ────────────────────────────
  const progress = {
    current: currentIndex + 1,
    total:   sessionQuestions.length,
    percent: sessionQuestions.length > 0
      ? Math.round((currentIndex / sessionQuestions.length) * 100)
      : 0,
  }

  const isFinished =
    sessionQuestions.length > 0 &&
    currentIndex >= sessionQuestions.length

  // ─── セッション結果の集計 ──────────────────
  const getSessionResult = useCallback((): SessionResult => {
    const total = sessionQuestions.length
    const rate  = total > 0
      ? Math.round((correctCount / total) * 100)
      : 0

    const domainMap: Record<string, { correct: number; total: number }> = {}
    sessionAnswers.forEach(({ domain, isCorrect }) => {
      if (!domainMap[domain]) {
        domainMap[domain] = { correct: 0, total: 0 }
      }
      domainMap[domain].total++
      if (isCorrect) domainMap[domain].correct++
    })

    const domainResults: DomainResult[] = Object.entries(domainMap).map(
      ([domain, { correct, total: t }]) => ({
        domain,
        correct,
        total: t,
        rate: Math.round((correct / t) * 100),
      })
    )

    const totalSeconds = Math.max(0, sessionElapsedSeconds)
    const avgSeconds = total > 0 ? Math.round(totalSeconds / total) : 0

    return {
      correct: correctCount,
      total,
      rate,
      domainResults,
      totalSeconds,
      avgSeconds,
      answers: sessionAnswers,
    }
  }, [correctCount, sessionQuestions.length, sessionAnswers, sessionElapsedSeconds])

  return {
    resetSession,
    allQuestions,
    loadQuestions,
    getDomains,
    startSession,
    currentQuestion,
    submitAnswer,
    goNext,
    clearLastResult,
    progress,
    isFinished,
    lastResult,
    isLoading,
    getSessionResult,
    sessionDomain,
  }
}