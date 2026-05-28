export type SessionRecord = {
  userId?: string
  date: string
  correct: number
  total: number
  rate: number
  domain: string
  mode: 'normal' | 'weak'
}