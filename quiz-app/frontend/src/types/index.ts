export type Question = {
  id: number
  domain: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
}

export type QuizMode = 'normal' | 'weak'
// src/types/index.ts
// export type { SessionRecord } from '../types/SessionRecord'
export type SessionConfig = {
  mode: QuizMode
  count: number | 'all'
  domain: string
}

export type AnswerResult = {
  isCorrect: boolean
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  explanation: string
  referenceUrl?: string
}

export type SessionResult = {
  correct: number
  total: number
  rate: number
  domainResults: DomainResult[]
  totalSeconds: number
  avgSeconds: number
  
  answers: {
    questionText: string
    selected: string
    selectedText: string
    correctAnswer: string
    correctAnswerText: string
    isCorrect: boolean
  }[]

}

export type DomainResult = {
  domain: string
  correct: number
  total: number
  rate: number
}
export type { SessionRecord } from './SessionRecord'

export type DomainStat = {
  domain: string
  correct: number
  total: number
  rate: number
}
export type QuestionStat = {
  correct: number
  total: number
}

export type QuestionStatsMap = Record<string, QuestionStat>

export type Screen = 'home' | 'quiz' | 'result' | 'dashboard'
