import type { SessionResult } from '../types'
import { Header } from '../components/Header'

type Props = {
  result: SessionResult
  onRetry: () => void
  onHome: () => void
}

function formatSeconds(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function Result({ result, onRetry, onHome }: Props) {
  const {
    correct,
    total,
    rate,
    totalSeconds,
    avgSeconds,
    domainResults = [],
    answers = [],
  } = result

  const passed = rate >= 70
  const wrongAnswers = answers.filter(a => !a.isCorrect)

  return (
    <div className="result-root">
      <Header
        active="dashboard"
        onQuiz={onRetry}
        onDashboard={onHome}
        onLogout={() => {}}
      />

      <main className="result-container">
        <div className="result-card">
          {/* ===== Head ===== */}
          <div className="result-head">
            <div className={`result-rate ${passed ? 'pass' : 'fail'}`}>
              {rate}%
            </div>
            <div className="result-summary">
              <div className="result-score">
                {total}問中 {correct}問正解
              </div>
              <div className="result-message">
                {passed
                  ? '合格ラインをクリアしました'
                  : '復習して再挑戦しましょう'}
              </div>
            </div>
          </div>

          {/* ===== Stats ===== */}
          <div className="result-stats">
            <div className="stat">
              <span className="label">総回答時間</span>
              <span className="value">{formatSeconds(totalSeconds)}</span>
            </div>
            <div className="stat">
              <span className="label">平均回答時間</span>
              <span className="value">{formatSeconds(avgSeconds)}</span>
            </div>
          </div>

          {/* ===== Domain Result ===== */}
          {domainResults.length > 1 && (
            <div className="result-section">
              <h3>分野別正解率</h3>
              {domainResults.map(dr => (
                <div key={dr.domain} className="domain-row">
                  <span>{dr.domain}</span>
                  <span>{dr.rate}%</span>
                </div>
              ))}
            </div>
          )}

          {/* ===== Wrong Answers ===== */}
          {wrongAnswers.length > 0 && (
            <div className="result-section">
              <h3>間違えた問題</h3>
              <div className="wrong-list">
                {wrongAnswers.map((a, i) => (
                  <div key={i} className="wrong-item">
                    <div className="q">{a.questionText}</div>
                    <div className="a">
                      <span className="your">あなた：{a.selected}</span>
                      <span className="correct">
                        正解：{a.correctAnswer}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Actions ===== */}
          <div className="result-actions">
            <button className="btn secondary" onClick={onRetry}>
              もう一度挑戦
            </button>
            <button className="btn primary" onClick={onHome}>
              ダッシュボードへ
            </button>
          </div>
        </div>
      </main>

      <style>{`
/* ===== Base ===== */
.result-root {
  min-height: 100vh;
  font-family: 'Noto Sans JP', system-ui, sans-serif;
  color: #1a1a1a;
}

/* ===== Layout ===== */
.result-container {
  margin: 64px 0 64px 260px;
}

.result-card {
  max-width: 1000px;
  background: #fff;
  border-radius: 24px;
  padding: 56px;
}

/* ===== Head ===== */
.result-head {
  display: flex;
  align-items: center;
  gap: 32px;
  margin-bottom: 32px;
}

.result-rate {
  font-size: 42px;
  font-weight: 700;
}

.result-rate.pass {
  color: #0017C1;
}

.result-rate.fail {
  color: #B91C1C;
}

.result-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-score {
  font-size: 18px;
  font-weight: 600;
  test-align: left;
}

.result-message {
  font-size: 13px;
  color: #6b7280;
  text-align: left;
}

/* ===== Stats ===== */
.result-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 40px;
}

.stat {
  background: #f9fafb;
  border-radius: 16px;
  padding: 16px;
}

.stat .label {
  font-size: 11px;
  color: #6b7280;
}

.stat .value {
  margin-top: 4px;
  font-size: 20px;
  font-weight: 700;
}

/* ===== Sections ===== */
.result-section {
  margin-bottom: 36px;
}

.result-section h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  text-align: left;
}

/* Domain */
.domain-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 12px;
  background: #f3f4f6;
  font-size: 13px;
}

/* Wrong */
.wrong-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wrong-item {
  border-left: 4px solid #E74941;
  background: #fff5f5;
  border-radius: 12px;
  padding: 12px 14px;
}

.wrong-item .q {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  text-align: left;
}

.wrong-item .a {
  font-size: 12px;
  display: flex;
  gap: 12px;
}

.wrong-item .your {
  color: #E74941;
}

.wrong-item .correct {
  color: #0F7B6C;
}

/* ===== Actions ===== */
.result-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 12px 28px;
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
}

.btn.primary {
  background: #111827;
  color: #fff;
  border: none;
}

.btn.secondary {
  background: #fff;
  border: 1px solid #e5e7eb;
}
      `}</style>
    </div>
  )
}