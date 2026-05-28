import { useState, useEffect, useCallback } from 'react'
import type { Question, SessionConfig, QuizMode } from '../types'

// ─── 型 ──────────────────────────────────────────────────────────────────────
type Props = {
  questions: Question[]
  domains: string[]
  weakCount: number
  isOpen: boolean
  onClose: () => void
  onStart: (config: SessionConfig) => void
}

// ─── 分野メタ情報（Home.tsx と共有推奨） ─────────────────────────────────────
const DOMAIN_META: Record<string, {
  emoji: string
  color: string
  gradientFrom: string
  bgColor: string
  borderColor: string
  label: string
}> = {
  'IDとガバナンスおよび監視ソリューションを設計する': {
    emoji: '🏃', color: '#0017C1', gradientFrom: '#B5D4F4',
    bgColor: '#EEF0FF', borderColor: '#0017C1', label: '25〜30%',
  },
  'データストレージソリューションを設計する': {
    emoji: '💾', color: '#0F7B6C', gradientFrom: '#9FE1CB',
    bgColor: '#E0F5EE', borderColor: '#0F7B6C', label: '20〜25%',
  },
  'ビジネス継続性ソリューションを設計する': {
    emoji: '🔄', color: '#B45309', gradientFrom: '#FCD34D',
    bgColor: '#FEF3C7', borderColor: '#B45309', label: '15〜20%',
  },
  'インフラストラクチャソリューションを設計する': {
    emoji: '🛠️', color: '#B91C1C', gradientFrom: '#FCA5A5',
    bgColor: '#FEE2E2', borderColor: '#B91C1C', label: '30〜35%',
  },
}
const FALLBACK_META = {
  emoji: '', color: '#0017C1', gradientFrom: '#B5D4F4',
  bgColor: '#EEF0FF', borderColor: '#0017C1', label: '',
}

// ─── チェックアイコン ─────────────────────────────────────────────────────────
function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
      <path d="M1 4l3 3 5-6" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────
export function StartModal({ questions, domains, weakCount, isOpen, onClose, onStart }: Props) {
  const [mode,   setMode]   = useState<QuizMode>('normal')
  const [domain, setDomain] = useState<string>('all')
  const [count,  setCount]  = useState<number | 'all'>(20)

  const closeModal = useCallback(() => {
    setMode('normal')
    setDomain('all')
    setCount(20)
    onClose()
  }, [onClose])

  // Esc キーで閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, closeModal])

  if (!isOpen) return null

  const pool = domain === 'all'
    ? questions
    : questions.filter(q => q.domain === domain)

  const countOptions: (number | 'all')[] = [10, 20, 30].filter(n => n <= pool.length)
  if (!countOptions.includes(pool.length)) countOptions.push('all')

  const actualCount = count === 'all'
    ? pool.length
    : Math.min(Number(count), pool.length)

  const handleStart = () => {
    onStart({ mode, count, domain })
    closeModal()
  }

  return (
    <>
      {/* ── オーバーレイ ──────────────────────────────────────────────────── */}
      <div
        onClick={closeModal}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(26, 26, 26, 0.45)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: "'Noto Sans JP', sans-serif",
        }}
      >
        {/* ── モーダル本体 ───────────────────────────────────────────────── */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fafaf8',
            borderRadius: 16,
            width: '100%',
            maxWidth: 500,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >

          {/* ── ヘッダー ─────────────────────────────────────────────────── */}
          <div style={{
            padding: '22px 28px 0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', marginBottom: 3,display: 'flex'}}>
                クイズを設定する
              </div>
              <div style={{ fontSize: 13, color: '#888' }}>
                分野・問題数・モードを選択してください
              </div>
            </div>
            {/* 閉じるボタン */}
            <button
              onClick={closeModal}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                border: '1.5px solid #E0E0E0',
                background: '#fafaf8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, marginLeft: 12,
                color: '#888', fontSize: 16, lineHeight: 1,
              }}
            >×</button>
          </div>

          {/* ── ボディ ────────────────────────────────────────────────────── */}
          <div style={{ padding: '20px 28px', flex: 1 }}>

            {/* 出題モード */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: '#888', letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 8,
              }}>出題モード</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {([
                  { value: 'normal' as QuizMode, label: '通常モード' },
                  { value: 'weak'   as QuizMode, label: `苦手モード（${weakCount}問）` },
                ] as { value: QuizMode; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    style={{
                      flex: 1,
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: mode === value ? '2px solid #0017C1' : '1.5px solid #E0E0E0',
                      background: mode === value ? '#EEF0FF' : '#fafaf8',
                      color: mode === value ? '#0017C1' : '#595959',
                      fontSize: 13, fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {/* チェック */}
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: mode === value ? 'none' : '1.5px solid #D0D0D0',
                      background: mode === value ? '#0017C1' : '#fafaf8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {mode === value && <CheckIcon color="#fafaf8" />}
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 出題分野 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: '#888', letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 8,
              }}>出題分野</label>

              {/* すべての分野 */}
              <button
                onClick={() => setDomain('all')}
                style={{
                  width: '100%', textAlign: 'left',
                  borderRadius: 10, padding: '11px 14px',
                  marginBottom: 8,
                  border: domain === 'all' ? '2px solid #0017C1' : '1.5px solid #E0E0E0',
                  background: domain === 'all' ? '#EEF0FF' : '#fafaf8',
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                {/* チェック丸 */}
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: domain === 'all' ? 'none' : '1.5px solid #D0D0D0',
                  background: domain === 'all' ? '#0017C1' : '#fafaf8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {domain === 'all' && <CheckIcon color="#fafaf8" />}
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: domain === 'all' ? '#0017C1' : '#1A1A1A',
                }}>すべての分野</span>
                <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>
                  {questions.length}問
                </span>
              </button>

              {/* 各分野 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {domains.map(d => {
                  const meta  = DOMAIN_META[d] ?? FALLBACK_META
                  const isSel = domain === d
                  const qCnt  = questions.filter(q => q.domain === d).length
                  return (
                    <button
                      key={d}
                      onClick={() => setDomain(d)}
                      style={{
                        width: '100%', textAlign: 'left',
                        borderRadius: 10, padding: '12px 14px',
                        border: isSel ? `2px solid ${meta.borderColor}` : '1.5px solid #E0E0E0',
                        background: isSel ? meta.bgColor : '#fafaf8',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {/* 1行目：チェック・分野名・比率ピル・問題数 */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2,
                      }}>
                        {/* チェック丸 */}
                        <span style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                          border: isSel ? 'none' : '1.5px solid #D0D0D0',
                          background: isSel ? meta.color : '#fafaf8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isSel && <CheckIcon color="#fafaf8" />}
                        </span>
                        {/* 分野名 */}
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: isSel ? meta.color : '#1A1A1A',
                          flex: 1, textAlign: 'left',
                        }}>{d}</span>
                        {/* 比率ピル */}
                        {/* 問題数 */}
                        <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>
                          {qCnt}問
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 出題数 */}
            <div style={{ marginBottom: 0 }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: '#888', letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 8,
              }}>出題数</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {countOptions.map(n => {
                  const label = n === 'all' ? `全問（${pool.length}問）` : `${n}問`
                  const isSel = count === n
                  return (
                    <button
                      key={String(n)}
                      onClick={() => setCount(n)}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: 10,
                        border: isSel ? '2px solid #0017C1' : '1.5px solid #E0E0E0',
                        background: isSel ? '#EEF0FF' : '#fafaf8',
                        color: isSel ? '#0017C1' : '#595959',
                        fontSize: 13, fontWeight: isSel ? 700 : 400,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >{label}</button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── フッター ─────────────────────────────────────────────────── */}
          <div style={{
            padding: '16px 28px 24px',
            borderTop: '1px solid #F0F0F0',
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
          }}>
            <button
              onClick={onClose}
              style={{
                background: '#fafaf8',
                border: '1.5px solid #E0E0E0',
                borderRadius: 7,
                padding: '10px 22px',
                fontSize: 14, fontFamily: 'inherit',
                color: '#595959', cursor: 'pointer',
              }}
            >キャンセル</button>
            <button
              onClick={handleStart}
              style={{
                background: '#0017C1', color: '#fafaf8',
                border: 'none', borderRadius: 7,
                padding: '10px 28px',
                fontSize: 14, fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >クイズ開始（{actualCount}問）</button>
          </div>
        </div>
      </div>
    </>
  )
}
