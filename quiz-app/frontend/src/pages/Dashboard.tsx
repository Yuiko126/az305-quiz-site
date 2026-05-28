import type { SessionRecord } from '../types'
import {
  buildDomainAggregate,
  buildRecentSessions,
  getAvgRateFromSessions,
  getWeakestDomain,
} from '../utils/dashboard'

type Props = {
  sessions: SessionRecord[]
  totalSessions: number
  avgRate: number
  weakCount: number
  onHome: () => void
}

const DOMAIN_META: Record<string, { color: string; bg: string; short: string }> = {
  'IDとガバナンスおよび監視ソリューションを設計する': { color: '#007fff', bg: '#EEF0FF', short: 'ID・ガバナンス・監視' },
  'データストレージソリューションを設計する':          { color: '#0F7B6C', bg: '#E0F5EE', short: 'データストレージ' },
  'ビジネス継続性ソリューションを設計する':            { color: '#B45309', bg: '#FEF3C7', short: 'ビジネス継続性' },
  'インフラストラクチャソリューションを設計する':      { color: '#B91C1C', bg: '#FEE2E2', short: 'インフラストラクチャ' },
}
const FALLBACK = { color: '#007fff', bg: '#EEF0FF', short: '' }

// 学習カレンダーヒートマップ
function ActivityHeatmap({ sessions }: { sessions: SessionRecord[] }) {
  const countByDate: Record<string, number> = {}
  sessions.forEach(s => {
    const d = new Date(s.date).toISOString().slice(0, 10)
    countByDate[d] = (countByDate[d] ?? 0) + 1
  })
  const today = new Date()
  const days: { date: string; count: number }[] = []
  for (let i = 59; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    days.push({ date: key, count: countByDate[key] ?? 0 })
  }
  const levelColor = (n: number) => {
    if (n === 0) return '#F0F0F0'
    if (n === 1) return '#E0F5EE'
    if (n === 2) return '#9FE1CB'
    if (n <= 4)  return '#5DCAA5'
    return '#1D9E75'
  }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 4, marginBottom: 8 }}>
        {days.map(({ date, count }) => (
          <div key={date} title={`${date}：${count}回`} style={{
            aspectRatio: '1', borderRadius: 3, background: levelColor(count),
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 10, color: '#888' }}>少ない</span>
        {['#F0F0F0', '#E0F5EE', '#9FE1CB', '#5DCAA5', '#1D9E75'].map(c => (
          <div key={c} style={{ width: 11, height: 11, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: '#888' }}>多い</span>
      </div>
    </div>
  )
}

export function Dashboard({ sessions, totalSessions, avgRate, weakCount, onHome }: Props) {
  const recent = buildRecentSessions(sessions)
  const domainStats = buildDomainAggregate(sessions)
  const weakestDomain = getWeakestDomain(domainStats)
  const overallAvgRate = avgRate > 0 ? avgRate : getAvgRateFromSessions(sessions)

  const rateColor = (r: number) => r >= 80 ? '#0F7B6C' : r >= 60 ? '#007fff' : '#B91C1C'

  // 今日の日付
  const today = new Date()
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${'日月火水木金土'[today.getDay()]}）`

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", background: 'fdfdfd', minHeight: '100vh', display: 'flex' }}>

      {/* ── 左サイドバー ─────────────────────────────────────────────────────── */}
      <aside style={{
        width: 200, minHeight: '100vh', background: '#fdfdfd',
        borderRight: '1px solid #E0E0E0', padding: '20px 0',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        {/* ロゴ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 20px 18px', borderBottom: '1px solid #F0F0F0', marginBottom: 10,
        }}>
          <span style={{
            background: '#007fff', color: '#fdfdfd', fontSize: 11, fontWeight: 700,
            padding: '3px 8px', borderRadius: 4,
          }}>AZ-305</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>試験対策</span>
        </div>

        {/* ナビ */}
        {[
          { label: 'ホーム',       icon: '⊞', active: false, onClick: onHome },
          { label: 'クイズ',       icon: '⏱', active: false, onClick: onHome },
          { label: 'ダッシュボード', icon: '📊', active: true,  onClick: undefined },
          { label: '問題一覧',     icon: '≡', active: false, onClick: undefined },
          { label: 'ブックマーク', icon: '⌗', active: false, onClick: undefined },
        ].map(({ label, icon, active, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', fontSize: 13,
              color: active ? '#007fff' : '#595959',
              background: active ? '#F0F4FF' : 'none',
              border: 'none',
              borderLeft: active ? '3px solid #007fff' : '3px solid transparent',
              fontFamily: 'inherit', cursor: onClick ? 'pointer' : 'default',
              fontWeight: active ? 600 : 400, width: '100%', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 14 }}>{icon}</span>
            {label}
          </button>
        ))}

        {/* ユーザー情報（下部） */}
        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid #F0F0F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: '#EEF0FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#007fff', flexShrink: 0,
            }}>田</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A' }}>田中 太郎</div>
              <div style={{ fontSize: 10, color: '#888' }}>試験まで 42日</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── メインコンテンツ ─────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '28px 32px', minWidth: 0, maxWidth: 1080 }}>

        {/* ヘッダー行 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A' }}>学習ダッシュボード</div>
          <div style={{ fontSize: 13, color: '#888' }}>{dateStr}</div>
        </div>

        {/* KPI 4枚 */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            {
              label: '総合正解率',
              value: <><span style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A' }}>{overallAvgRate}%</span></>,
              sub: <span style={{ fontSize: 11, color: '#0F7B6C' }}>▲ 3% 先週比</span>,
            },
            {
              label: '回答済み問題数',
              value: <><span style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A' }}>{sessions.reduce((s, r) => s + r.total, 0)}</span></>,
              sub: <span style={{ fontSize: 11, color: '#888' }}>学習セッション {totalSessions} 回</span>,
            },
            {
              label: '連続学習日数',
              value: <><span style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A' }}>12日</span></>,
              sub: <span style={{ fontSize: 11, color: '#B45309' }}>目標: 30日</span>,
            },
            {
              label: '今日の学習時間',
              value: <><span style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A' }}>47分</span></>,
              sub: <span style={{ fontSize: 11, color: '#007fff' }}>苦手問題: {weakCount} 問</span>,
            },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{
              flex: 1, background: '#fdfdfd', border: '1px solid #E0E0E0',
              borderRadius: 12, padding: '16px 18px', minWidth: 0,
            }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{label}</div>
              <div style={{ lineHeight: 1.2, marginBottom: 4 }}>{value}</div>
              <div>{sub}</div>
            </div>
          ))}
        </div>

        {/* 2カラム：分野別正解率 + 最近の学習履歴 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* 分野別正解率 */}
          <div style={{
            background: '#fdfdfd', border: '1px solid #E0E0E0',
            borderRadius: 12, padding: '20px 22px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 16 }}>分野別正解率</div>
            {Object.entries(domainStats).length === 0
              ? (
                // サンプルデータで表示
                [
                  ['IDとガバナンスおよび監視ソリューションを設計する', 78],
                  ['データストレージソリューションを設計する', 62],
                  ['ビジネス継続性ソリューションを設計する', 55],
                  ['インフラストラクチャソリューションを設計する', 45],
                ].map(([domain, rate]) => {
                  const meta = DOMAIN_META[domain as string] ?? FALLBACK
                  return (
                    <div key={domain as string} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 12, color: '#595959', width: 130, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {meta.short}
                      </span>
                      <div style={{ flex: 1, height: 6, background: '#F0F0F0', borderRadius: 999 }}>
                        <div style={{ height: 6, width: `${rate}%`, background: meta.color, borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, width: 36, textAlign: 'right', flexShrink: 0 }}>
                        {rate}%
                      </span>
                    </div>
                  )
                })
              )
              : Object.entries(domainStats).map(([domain, { correct, total }]) => {
                const rate = total > 0 ? Math.round(correct / total * 100) : 0
                const meta = DOMAIN_META[domain] ?? FALLBACK
                return (
                  <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: '#595959', width: 130, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {meta.short || domain}
                    </span>
                    <div style={{ flex: 1, height: 6, background: '#F0F0F0', borderRadius: 999 }}>
                      <div style={{ height: 6, width: `${rate}%`, background: meta.color, borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, width: 36, textAlign: 'right', flexShrink: 0 }}>
                      {rate}%
                    </span>
                  </div>
                )
              })
            }
            {weakestDomain && (
              <div style={{
                background: '#FEE2E2', borderRadius: 8, padding: '8px 12px',
                display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#B91C1C', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#B91C1C', fontWeight: 500 }}>
                  {(DOMAIN_META[weakestDomain] ?? FALLBACK).short || weakestDomain}を重点的に強化しましょう
                </span>
              </div>
            )}
          </div>

          {/* 最近の学習履歴 */}
          <div style={{
            background: '#fdfdfd', border: '1px solid #E0E0E0',
            borderRadius: 12, padding: '20px 22px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#007fff', marginBottom: 14 }}>最近の学習履歴</div>
            {recent.length === 0
              ? (
                // サンプルデータ
                [
                  { domain: 'IDとガバナンスおよび監視ソリューションを設計する', label: 'ID・ガバナンス ー 模擬試験', sub: '本日 09:32',    rate: 80, color: '#007fff' },
                  { domain: 'インフラストラクチャソリューションを設計する',      label: 'インフラ ー ランダム25問',  sub: '昨日 20:15',   rate: 48, color: '#B91C1C' },
                  { domain: 'データストレージソリューションを設計する',          label: 'データストレージ ー 復習',  sub: '3日前 18:00',  rate: 72, color: '#0F7B6C' },
                  { domain: 'ビジネス継続性ソリューションを設計する',            label: 'ビジネス継続性 ー 20問',    sub: '4日前 21:40',  rate: 60, color: '#B45309' },
                ].map(({ label, sub, rate, color }, i) => (
                  <div key={i} style={{
                    padding: '10px 0',
                    borderBottom: i < 3 ? '1px solid #F0F0F0' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#007fff', fontWeight: 500 }}>{label}</div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{sub}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: rateColor(rate), flexShrink: 0 }}>
                        {rate}%
                      </div>
                    </div>
                  </div>
                ))
              )
              : recent.slice(0, 5).map((s, i) => {
                const d     = new Date(s.date)
                const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                const meta  = s.domain && s.domain !== 'all' ? (DOMAIN_META[s.domain] ?? FALLBACK) : FALLBACK
                return (
                  <div key={i} style={{
                    padding: '10px 0',
                    borderBottom: i < Math.min(recent.length, 5) - 1 ? '1px solid #F0F0F0' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: 5 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 500 }}>
                          {s.mode === 'weak' ? '苦手' : '通常'} — {s.correct}/{s.total}問
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{label}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: rateColor(s.rate), flexShrink: 0 }}>
                        {s.rate}%
                      </div>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>

        {/* 学習カレンダー */}
        <div style={{
          background: '#fdfdfd', border: '1px solid #E0E0E0',
          borderRadius: 12, padding: '20px 22px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 14 }}>
            学習カレンダー（過去2ヶ月）
          </div>
          <ActivityHeatmap sessions={sessions} />
        </div>
      </main>
    </div>
  )
}
