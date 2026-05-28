import { useState } from 'react'
import type { Question, AnswerResult } from '../types'
import { Header } from '../components/Header'

type Option = 'A' | 'B' | 'C' | 'D'

type Props = {
  question: Question
  progress: {
    current: number
    total: number
    percent: number
  }
  lastResult: AnswerResult | null
  onAnswer: (a: Option) => Promise<AnswerResult | null>
  onNext: () => Promise<void> | void
  onDashboard: () => void
  onLogout: () => void
  elapsed: number
}

const OPTIONS: Option[] = ['A', 'B', 'C', 'D']

export default function Quiz({
  question,
  progress,
  lastResult,
  onAnswer,
  onNext,
  onDashboard,
  onLogout,
  elapsed,
}: Props) {
  const [selected, setSelected] = useState<Option | null>(null)
  const [loading, setLoading] = useState(false)

  const answered = lastResult !== null

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  const handleChoice = async (opt: Option) => {
    if (answered || loading) return
    setSelected(opt)
    setLoading(true)
    await onAnswer(opt)
    setLoading(false)
  }

  return (
    

    <div className="quiz-root">
            <Header
        active="quiz"
        onQuiz={() => {}}
        onDashboard={onDashboard}
        onLogout={onLogout}
      />

      {/* ====== Top ====== */}
      <div className="quiz-header">
        <span className="quiz-title">クイズ</span>

        <div className="quiz-progress">
          <div
            className="quiz-progress-bar"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <span className="quiz-counter">
          {progress.current}/{progress.total}
        </span>
      </div>

      {/* ====== Main ====== */}
      <main className="quiz-container">
        <div className="quiz-around">
        <div className="quiz-main-card">
                      <span className="quiz-domain">
              {question.domain ?? 'インフラストラクチャ'}
            </span>
          {/* Left */}
          <div className="quiz-left">
            <div className="quiz-timer">
              {mm}:{ss}
            </div>

            <div className="quiz-question">
              {question.questionText}
            </div>

            {answered && lastResult && (
              <div className="quiz-explanation">
                {!lastResult.isCorrect && (
                  <div className="quiz-correct-answer">
                    正解：{lastResult.correctAnswer}
                  </div>
                )}
                {lastResult.explanation}
              </div>
              
            )}

              <button
                className="btn primary"
                disabled={!answered}
                onClick={onNext}
              >
                次へ →
              </button>

                        <div className="quiz-footer">
              {/* <button
                className="btn secondary"
                disabled={answered}
                onClick={!answered ? onNext : undefined}
              >
                スキップ
              </button> */}


            </div>

            {/* Illustration placeholder */}
          </div>

          {/* Right */}
          <div className="quiz-right">
            <div className="quiz-choices">
              {OPTIONS.map(opt => {
                const text =
                  question[`option${opt}` as keyof Question] as string

                const className = [
                  'quiz-choice',
                  selected === opt && 'is-selected',
                  answered &&
                    selected === opt &&
                    lastResult?.isCorrect &&
                    'is-correct',
                  answered &&
                    selected === opt &&
                    !lastResult?.isCorrect &&
                    'is-wrong',
                  answered &&
                    !lastResult?.isCorrect &&
                    lastResult?.correctAnswer === opt &&
                    'is-correct',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    key={opt}
                    className={className}
                    onClick={() => handleChoice(opt)}
                    disabled={answered || loading}
                  >
                    <span className="quiz-choice-badge">{opt}</span>
                    <span className="quiz-choice-text">{text}</span>
                  </button>
                )
              })}
            </div>


          </div>
        </div>
        </div>
      </main>

      {/* ====== Styles ====== */}
      <style>{`
/* ===== Base ===== */
.quiz-root {
  min-height: 100vh;
  font-family: 'Noto Sans JP', system-ui, sans-serif;
  color: #1a1a1a;
}

/* ===== Header ===== */
.quiz-header {
  height: 64px;
  padding: 0 48px;
  display: flex;
  align-items: center;
  gap: 24px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #fff;
}

.quiz-title {
  font-weight: 600;
  font-size: 14px;
}

.quiz-progress {
  flex: 1;
  height: 4px;
  border-radius: 4px;
  overflow: hidden;
}

.quiz-progress-bar {
  height: 100%;
}

.quiz-counter {
  font-size: 12px;
  color: #6b7280;
}

.quiz-around{
        width:1020px,
}

/* ===== Layout ===== */
.quiz-container {
 
  margin: 64px 0px 64px 260px;
  display: flex;
  justify-content: flex-start;
  border-radius:24px 0 0 24px;
  background-color:"#fff";

}

.quiz-main-card {
  max-width: 1100px;
  border-radius: 24px;
  margin:24px 50px 24px 24px;
  padding: 78px 48px 48px 48px;
  border-radius: 24px 0 0 24px;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 56px;
  position:relative;
  align-items:start;
}

/* ===== Left ===== */
.quiz-left {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width:335px;
  text-align:left;
  margin-top:5px;
}

.quiz-domain {
  color: #fff;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  width: fit-content;
  position:absolute;
  left: -30px;
  top:30px;
}

.quiz-question {
  font-size: 15px;
  line-height: 1.9;
  max-width: 420px;
}

.quiz-timer {
  font-size: 12px;
  color: #6b7280;
}

.quiz-illustration {
  height: 140px;
}

/* ===== Right ===== */
.quiz-right {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.quiz-choices {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Choice Card */
.quiz-choice {
  background: #fff;
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: none;
  cursor: pointer;
  text-align: left;

  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
  transition: transform .15s ease, box-shadow .15s ease;
}

.quiz-choice:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(0,0,0,0.08);
}

.quiz-choice-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #eef2f7;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.quiz-choice-text {
  font-size: 14px;
}

.quiz-choice.is-selected {
  outline: 2px solid #000000;

}

.quiz-choice.is-correct {
  outline: 2px solid #59DFFD;
    background-color:rgba(89, 223, 253, 0.43)
}

.quiz-choice.is-wrong {
  opacity: 0.6;
  outline: 2px solid #E74941;
  background-color: rgba(231, 73, 65, 0.23);
}

/* Explanation */
.quiz-explanation {
  margin-top: 24px;
  font-size: 13px;
  line-height: 1.8;
  color: #374151;
  min-height: 20px;
}

.quiz-correct-answer {
  font-weight: 600;
  margin-bottom: 4px;
}

/* Footer */
.quiz-footer {
  margin-top: 32px;
  display: flex;
  justify-content: space-between;
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
  margin-right:220px;
}

.btn.secondary {
  background: #fff;
  border: 1px solid #e5e7eb;
  color: #6b7280;
}
`}</style>
    </div>
  )
}
