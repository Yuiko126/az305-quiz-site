import type { SessionRecord } from '../types'

export type DomainAggregate = Record<string, { correct: number; total: number }>

export function buildRecentSessions(sessions: SessionRecord[], limit = 30): SessionRecord[] {
  return [...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}

export function buildDomainAggregate(sessions: SessionRecord[]): DomainAggregate {
  const stats: DomainAggregate = {}

  sessions.forEach((s) => {
    if (!s.domain || s.domain === 'all') return
    if (!stats[s.domain]) stats[s.domain] = { correct: 0, total: 0 }
    stats[s.domain].correct += s.correct
    stats[s.domain].total += s.total
  })

  return stats
}

export function getWeakestDomain(domainStats: DomainAggregate): string | null {
  return Object.entries(domainStats).reduce<string | null>((acc, [domain, { correct, total }]) => {
    if (total === 0) return acc
    const rate = correct / total
    if (!acc) return domain

    const accStat = domainStats[acc]
    return rate < accStat.correct / accStat.total ? domain : acc
  }, null)
}

export function getAvgRateFromSessions(sessions: SessionRecord[]): number {
  if (sessions.length === 0) return 0
  const totalCorrect = sessions.reduce((sum, s) => sum + s.correct, 0)
  const totalQuestions = sessions.reduce((sum, s) => sum + s.total, 0)
  if (totalQuestions === 0) return 0
  return Math.round((totalCorrect / totalQuestions) * 100)
}
