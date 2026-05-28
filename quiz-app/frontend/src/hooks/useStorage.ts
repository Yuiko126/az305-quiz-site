import { useState, useCallback } from 'react'
import type { QuestionStatsMap } from '../types'
import {
  getWeakQuestionIds,
  loadQuestionStats,
  mergeAnswerResult,
  saveQuestionStats,
} from '../utils/storage'

export function useStorage() {
  const [questionStats, setQuestionStats] = useState<QuestionStatsMap>(
    () => loadQuestionStats()
  )

  // ✅ 回答履歴を記録
  const recordAnswer = useCallback(
    (questionId: number, isCorrect: boolean) => {
      setQuestionStats(prev => {
        const updated = mergeAnswerResult(prev, questionId, isCorrect)
        saveQuestionStats(updated)
        return updated
      })
    },
    []
  )

  // ✅ 苦手問題IDを返す
  const getWeakIds = useCallback((): Set<number> => getWeakQuestionIds(questionStats), [questionStats])

  return {
    questionStats,
    recordAnswer,
    getWeakIds,
  }
}