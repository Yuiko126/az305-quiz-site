import type { CSSProperties } from 'react'

type Props = {
  userName: string
  remainingDays: number
  onStartQuiz: () => void
}

export function HomeHero({ userName, remainingDays, onStartQuiz }: Props) {
  return (
    <div style={styles.topMessage}>
      <div>
        <div style={styles.eyebrow}>こんにちは、{userName} さん👋</div>
        <h1 style={styles.heroTitle}>
          試験まであと
          <span style={styles.daysNumber}>{remainingDays > 0 ? remainingDays : '当日'}</span>
          日です
        </h1>
        <button style={styles.primaryButton} onClick={onStartQuiz}>
          クイズを始める →
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  topMessage: {
    background: '#fff',
    textAlign: 'left',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '954px',
  },
  eyebrow: {
    fontSize: 30,
    letterSpacing: '0.02px',
  },
  heroTitle: {
    fontWeight: 400,
    lineHeight: 1.2,
    margin: '23px 0px 23px 3px',
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Noto Sans JP',
  },
  daysNumber: {
    fontSize: 20,
    margin: 'unset',
  },
  primaryButton: {
    background: '#1a1a1a',
    color: '#fff',
    borderRadius: '12px',
    padding: '10px 32px',
    fontSize: 14,
    letterSpacing: '0.05em',
    cursor: 'pointer',
  },
}
