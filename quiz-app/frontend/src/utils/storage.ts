import type { QuestionStatsMap } from '../types'

export const LS_QUESTION_STATS = 'az305_question_stats'

export function loadQuestionStats(): QuestionStatsMap {
  try {
    const raw = localStorage.getItem(LS_QUESTION_STATS)
    return raw ? (JSON.parse(raw) as QuestionStatsMap) : {}
  } catch {
    return {}
  }
}

export function saveQuestionStats(value: QuestionStatsMap): void {
  localStorage.setItem(LS_QUESTION_STATS, JSON.stringify(value))
}

export function mergeAnswerResult(
  prev: QuestionStatsMap,
  questionId: number,
  isCorrect: boolean
): QuestionStatsMap {
  const id = String(questionId)
  const stat = prev[id] ?? { correct: 0, total: 0 }

  return {
    ...prev,
    [id]: {
      correct: stat.correct + (isCorrect ? 1 : 0),
      total: stat.total + 1,
    },
  }
}

export function getWeakQuestionIds(stats: QuestionStatsMap): Set<number> {
  const weakIds = new Set<number>()

  Object.entries(stats).forEach(([id, stat]) => {
    if (stat.total >= 2 && stat.correct / stat.total <= 0.6) {
      weakIds.add(Number(id))
    }
  })

  return weakIds
}