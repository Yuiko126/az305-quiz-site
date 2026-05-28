import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Header } from '../components/Header'
import { DomainStudySection } from '../components/home/DomainStudySection'
import { HomeHero } from '../components/home/HomeHero'
import type { DomainStat, Question, SessionConfig, SessionRecord } from '../types'
import { StartModal } from './StartModal'

type Props = {
  userName: string
  questions: Question[]
  domains: string[]
  sessions: SessionRecord[]
  domainStats: DomainStat[]
  weakCount: number
  onStart: (config: SessionConfig) => void
  onDashboard: () => void
  onLogout: () => void
}

function calcRemainingDays(target: Date) {
  const today = new Date()

  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)

  const diffMs = target.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function Home({
  questions,
  domains,
  domainStats,
  weakCount,
  onStart,
  onDashboard,
  onLogout,
  userName,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const examDate = new Date('2026-06-15')
  const remainingDays = calcRemainingDays(examDate)

  return (
    <div style={styles.root}>
      <Header
        active="home"
        onQuiz={() => setModalOpen(true)}
        onDashboard={onDashboard}
        onLogout={onLogout}
      />

      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <HomeHero
            userName={userName}
            remainingDays={remainingDays}
            onStartQuiz={() => setModalOpen(true)}
          />

          <DomainStudySection
            domains={domains}
            domainStats={domainStats}
            onStart={onStart}
          />
        </div>
      </section>

      <StartModal
        questions={questions}
        domains={domains}
        weakCount={weakCount}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onStart={onStart}
      />
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  root: {
    fontFamily: "'Noto Sans JP', sans-serif",
    background: '#fff',
    height: '100vh',
    overflow: 'hidden',
    color: '#1a1a1a',
  },
  hero: {
    width: '100%',
  },
  heroInner: {
    maxWidth: 1280,
    margin: '40px 0 0 220px',
    borderRadius: '24px 0 0 0px',
    padding: '21px 35px 32px 35px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
}
