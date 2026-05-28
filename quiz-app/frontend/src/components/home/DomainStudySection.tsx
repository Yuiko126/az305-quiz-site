import { useState } from 'react'
import type { CSSProperties, FC } from 'react'
import type { DomainStat, SessionConfig } from '../../types'

type Props = {
  domains: string[]
  domainStats: DomainStat[]
  onStart: (config: SessionConfig) => void
}

const InfrastructureIcon: FC<{ active?: boolean }> = ({ active }) => (
  <svg width="28" height="28" viewBox="0 0 38 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M33.641 35.3053L22.4102 24.5815L26.7179 20.4683L37.9487 31.1921L33.641 35.3053ZM5.33333 35.3053L1.02564 31.1921L15.1795 17.6771L11.6923 14.3474L10.2564 15.7184L7.64102 13.2211V17.2364L6.20512 18.6075L0 12.6825L1.4359 11.3114H5.64102L3.07692 8.86305L10.359 1.90972C11.0427 1.25682 11.7778 0.783476 12.5641 0.489673C13.3504 0.19587 14.1538 0.0489692 14.9743 0.0489692C15.7949 0.0489692 16.5983 0.19587 17.3846 0.489673C18.1709 0.783476 18.906 1.25682 19.5897 1.90972L14.8718 6.41469L17.4359 8.86305L16 10.2341L19.4872 13.5639L24.1025 9.15685C23.9658 8.79776 23.855 8.42235 23.7702 8.03061C23.6855 7.63887 23.6424 7.24713 23.641 6.8554C23.641 4.92936 24.3337 3.30496 25.719 1.98219C27.1043 0.659426 28.8048 -0.00130386 30.8205 1.93164e-06C31.3333 1.93164e-06 31.8208 0.0489691 32.2831 0.146903C32.7453 0.244838 33.215 0.391739 33.6923 0.587608L28.6154 5.43535L32.3077 8.96098L37.3846 4.11324C37.6239 4.57027 37.7866 5.0188 37.8728 5.45886C37.9589 5.89891 38.0013 6.36442 38 6.8554C38 8.78144 37.308 10.4058 35.9241 11.7286C34.5401 13.0514 32.8389 13.7121 30.8205 13.7108C30.4102 13.7108 30 13.6781 29.5897 13.6129C29.1795 13.5476 28.7863 13.4333 28.4102 13.2701L5.33333 35.3053Z" fill={active ? '#FFFFFF' : '#3F3F3F'} />
  </svg>
)

const SecurityIcon: FC<{ active?: boolean }> = ({ active }) => (
  <svg width="28" height="28" viewBox="0 0 34 43" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 43C12.0771 41.7458 8.01267 38.8878 4.80675 34.4258C1.60083 29.9638 -0.00141573 25.0102 9.38604e-07 19.565V6.45L17 0L34 6.45V19.565C34 25.0117 32.3978 29.966 29.1933 34.428C25.9888 38.8899 21.9243 41.7473 17 43ZM17 38.485C20.4354 37.41 23.3042 35.2865 25.6062 32.1146C27.9083 28.9426 29.2542 25.4044 29.6438 21.5H17V4.56875L4.25 9.40625V20.5325C4.25 20.7833 4.28542 21.1058 4.35625 21.5H17V38.485Z" fill={active ? '#FFFFFF' : '#000000'} />
  </svg>
)

const BusinessContinuityIcon: FC<{ active?: boolean }> = ({ active }) => (
  <svg width="28" height="28" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.25 1.25H18.75C18.4185 1.25 18.1005 1.3817 17.8661 1.61612C17.6317 1.85054 17.5 2.16848 17.5 2.5V23.74H22.5V2.5C22.5 2.16848 22.3683 1.85054 22.1339 1.61612C21.8995 1.3817 21.5815 1.25 21.25 1.25ZM13.75 8.75H11.25C10.9185 8.75 10.6005 8.8817 10.3661 9.11612C10.1317 9.35054 10 9.66848 10 10V23.74H15V10C15 9.66848 14.8683 9.35054 14.6339 9.11612C14.3995 8.8817 14.0815 8.75 13.75 8.75ZM6.25 16.25H3.75C3.41848 16.25 3.10054 16.3817 2.86612 16.6161C2.6317 16.8505 2.5 17.1685 2.5 17.5V23.74H7.5V17.5C7.5 17.1685 7.3683 16.8505 7.13388 16.6161C6.89946 16.3817 6.58152 16.25 6.25 16.25Z" fill={active ? '#FFFFFF' : '#000000'} />
  </svg>
)

const DomainIcons: Record<string, FC<{ active?: boolean }>> = {
  インフラストラクチャ: InfrastructureIcon,
  ビジネス継続性: BusinessContinuityIcon,
  セキュリティ設計: SecurityIcon,
  'ID・ガバナンス・監視': ({ active }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke={active ? '#ffffff' : '#111827'} strokeWidth="2" />
      <circle cx="9" cy="10" r="2" stroke={active ? '#ffffff' : '#111827'} strokeWidth="2" />
      <path d="M6 16h6" stroke={active ? '#ffffff' : '#111827'} strokeWidth="2" />
    </svg>
  ),
}

export function DomainStudySection({ domains, domainStats, onStart }: Props) {
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null)
  const safeDomainStats = Array.isArray(domainStats) ? domainStats : []

  return (
    <div style={styles.studyOption}>
      <div style={styles.sectionTitle}>分野別に学習する</div>
      <div style={styles.domainList}>
        {domains.filter(d => d !== 'all').map(domain => {
          const stat = safeDomainStats.find(s => s.domain === domain)
          const pct = stat?.rate ?? 0
          const Icon = DomainIcons[domain]
          const isHover = hoveredDomain === domain

          return (
            <button
              key={domain}
              onMouseEnter={() => setHoveredDomain(domain)}
              onMouseLeave={() => setHoveredDomain(null)}
              onClick={() => onStart({ mode: 'normal', count: 10, domain })}
              style={{
                ...styles.fieldCard,
                ...(isHover ? styles.fieldCardHover : {}),
              }}
            >
              <div style={styles.fieldIcon}>{Icon && <Icon active={isHover} />}</div>
              <div style={styles.fieldLabel}>{domain}</div>
              <div style={styles.fieldRate}>{pct}%</div>
              <div style={styles.progressBase}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${pct}%`,
                    background: isHover ? '#ffffff' : '#111827',
                  }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  studyOption: {
    width: '100%',
    textAlign: 'left',
    margin: '60px 0 0 0 ',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 400,
    letterSpacing: '0.07em',
    marginBottom: 16,
  },
  domainList: {
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    background: '#fff',
    borderRadius: '24px',
  },
  fieldCard: {
    width: 220,
    height: 230,
    background: '#ffffff',
    borderRadius: 24,
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 16,
    padding: '20px',
    boxShadow: '0 12px 10px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    position: 'relative',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  fieldCardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
    background: '#3F3F3F',
    color: '#fff',
  },
  fieldIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: '#F9FAFB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: 600,
    textAlign: 'center',
  },
  fieldRate: {
    fontSize: 20,
    fontWeight: 600,
  },
  progressBase: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    background: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
}
