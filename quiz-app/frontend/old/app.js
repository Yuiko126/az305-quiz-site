// =====================
// app.js — メインロジック・画面制御
// =====================

'use strict';

// =====================
// 画面管理
// =====================

const screens = {
    home: document.getElementById('screen-home'),
    quiz: document.getElementById('screen-quiz'),
    result: document.getElementById('screen-result'),
    dashboard: document.getElementById('screen-dashboard'),
};

/** 指定した画面だけを表示する */
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// =====================
// ホーム画面
// =====================

const btnModeNormal = document.getElementById('btn-mode-normal');
const btnModeWeak = document.getElementById('btn-mode-weak');
const selectCount = document.getElementById('select-count');
const selectDomain = document.getElementById('select-domain');
const btnStart = document.getElementById('btn-start');

// selectDomain の change イベントを追加
selectDomain.addEventListener('change', updateStartButtonLabel);
selectCount.addEventListener('change', updateStartButtonLabel);

function updateStartButtonLabel() {
  const domain = selectDomain.value;
  const pool = domain === 'all'
    ? allQuestions
    : allQuestions.filter(q => q.domain === domain);

  const countVal = selectCount.value;
  const actual = countVal === 'all' ? pool.length : Math.min(Number(countVal), pool.length);

  document.getElementById('btn-start').textContent = `スタート 🚀（${actual} 問）`;
}

// モードボタンのトグル
[btnModeNormal, btnModeWeak].forEach(btn => {
    btn.addEventListener('click', () => {
        btnModeNormal.classList.remove('active');
        btnModeWeak.classList.remove('active');
        btn.classList.add('active');
    });
});

/** ドメインセレクタを allQuestions の内容で動的生成 */
function populateDomainSelect() {
    const domains = getDomains();
    selectDomain.innerHTML = '<option value="all">すべての分野</option>';
    domains.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        selectDomain.appendChild(opt);
    });
    updateStartButtonLabel();
}

// スタートボタン
btnStart.addEventListener('click', () => {
    const mode = btnModeWeak.classList.contains('active') ? 'weak' : 'normal';
    const count = selectCount.value;
    const domain = selectDomain.value;

    const total = startSession({ mode, count, domain });

    if (total === null) {
        alert('苦手問題がありません。\n通常モードで学習を続けましょう！');
        return;
    }
    if (total === 0) {
        alert('選択した条件に一致する問題がありません。');
        return;
    }

    showScreen('quiz');
    renderQuestion();
});

// =====================
// クイズ画面
// =====================

const progressText = document.getElementById('progress-text');
const progressFill = document.getElementById('progress-fill');
const questionDomain = document.getElementById('question-domain');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const btnNext = document.getElementById('btn-next');

/** 現在の問題を描画する */
function renderQuestion() {
    // ── Phase 3 追加：解説エリアをリセット ──
    const explanationArea = document.getElementById('explanation-area');
    const accordionToggle = document.getElementById('accordion-toggle');
    const explanationBody = document.getElementById('explanation-body');
    explanationArea.style.display = 'none';
    closeAccordion(accordionToggle, explanationBody);
    // ─────────────────────────────────────────

    const q = getCurrentQuestion();
    if (!q) return;

    const { current, total, percent } = getProgress();

    // プログレス更新
    progressText.textContent = `${current} / ${total}`;
    progressFill.style.width = `${percent}%`;

    // 問題文
    questionDomain.textContent = q.domain || '';
    questionText.textContent = q.question;

    // 選択肢の描画
    optionsContainer.innerHTML = '';
    btnNext.style.display = 'none';

    const labels = ['A', 'B', 'C', 'D'];
    const optionValues = [q.option_a, q.option_b, q.option_c, q.option_d];

    optionValues.forEach((text, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.dataset.answer = labels[i];
        btn.innerHTML = `<span class="option-label">${labels[i]}</span><span>${text}</span>`;
        btn.addEventListener('click', () => handleAnswer(labels[i]));
        optionsContainer.appendChild(btn);
    });
}

/** 回答時の処理（Phase 3 版：解説を追加） */
function handleAnswer(selectedLabel) {
    const isCorrect = submitAnswer(selectedLabel);
    const q = getCurrentQuestion();

    // 全選択肢を無効化してハイライト
    const allBtns = optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(btn => {
        btn.disabled = true;
        // handleAnswer 内、btn.classList.add('correct') の直後に追記
        if (btn.dataset.answer === q.answer.toUpperCase()) {
            btn.classList.add('correct');
            btn.querySelector('.option-label').textContent = '✅';
        } else if (btn.dataset.answer === selectedLabel && !isCorrect) {
            btn.classList.add('incorrect');
            btn.querySelector('.option-label').textContent = '❌';
        }
    });

    // ── Phase 3 追加 ──────────────────────────────
    // 解説エリアを表示して自動展開
    const explanationArea = document.getElementById('explanation-area');
    const explanationText = document.getElementById('explanation-text');
    const explanationLink = document.getElementById('explanation-link');
    const accordionToggle = document.getElementById('accordion-toggle');
    const explanationBody = document.getElementById('explanation-body');

    explanationText.textContent = q.explanation || '（解説はありません）';

    if (q.reference_url && q.reference_url.startsWith('http')) {
        explanationLink.href = q.reference_url;
        explanationLink.style.display = 'inline-block';
    } else {
        explanationLink.style.display = 'none';
    }

    explanationArea.style.display = 'block';

    // 自動で展開
    openAccordion(accordionToggle, explanationBody);
    // ─────────────────────────────────────────────

    btnNext.style.display = 'block';
}

/** アコーディオンを開く */
function openAccordion(toggle, body) {
    toggle.classList.add('open');
    body.classList.add('open');
}

/** アコーディオンを閉じる */
function closeAccordion(toggle, body) {
    toggle.classList.remove('open');
    body.classList.remove('open');
}

// 「次の問題」ボタン
btnNext.addEventListener('click', () => {
    const hasNext = nextQuestion();
    if (hasNext) {
        renderQuestion();
    } else {
        showResultScreen();
    }
});

// =====================
// 結果画面
// =====================

const scoreFraction = document.getElementById('score-fraction');
const scorePercent = document.getElementById('score-percent');
const scoreMessage = document.getElementById('score-message');

function showResultScreen() {
    const { correct, total, rate } = getResult();

    scoreFraction.textContent = `${correct} / ${total}`;
    scorePercent.textContent = `正答率 ${rate}%`;
    scoreMessage.textContent = rate >= 80
        ? '🎉 素晴らしい！この調子で頑張りましょう！'
        : rate >= 60
            ? '📚 もう少しです。苦手問題を復習しましょう。'
            : '💪 基礎から復習しましょう。継続が大切です！';

    // Phase 2 で saveSession を呼ぶ
    if (typeof saveSession === 'function') saveSession();

    showScreen('result');
}

document.getElementById('btn-retry').addEventListener('click', () => {
    showScreen('quiz');
    startSession({
        mode: btnModeWeak.classList.contains('active') ? 'weak' : 'normal',
        count: selectCount.value,
        domain: selectDomain.value,
    });
    renderQuestion();
});

document.getElementById('btn-home').addEventListener('click', () => showScreen('home'));

// =====================
// ダッシュボード
// =====================

document.getElementById('btn-dashboard').addEventListener('click', () => {
    if (typeof renderDashboard === 'function') renderDashboard();
    showScreen('dashboard');
});
document.getElementById('btn-dashboard-home').addEventListener('click', () => showScreen('home'));

// =====================
// アプリ初期化
// =====================

async function init() {
    await loadQuestions();
    populateDomainSelect();
    showScreen('home');
}

// app.js の init() の前あたりに追加
document.getElementById('accordion-toggle').addEventListener('click', () => {
    const toggle = document.getElementById('accordion-toggle');
    const body = document.getElementById('explanation-body');
    if (toggle.classList.contains('open')) {
        closeAccordion(toggle, body);
    } else {
        openAccordion(toggle, body);
    }
});

init();

// =====================
// ダッシュボード描画
// =====================

/**
 * ダッシュボード画面を最新データで更新する
 */
function renderDashboard() {
    const sessions = loadSessions();
    const weakCount = getWeakCount();
    const avgRate = getAverageRate();

    // 統計サマリー
    document.getElementById('stat-total-sessions').textContent = sessions.length;
    document.getElementById('stat-avg-rate').textContent = `${avgRate}%`;
    document.getElementById('stat-weak-count').textContent = weakCount;

    // 履歴リスト
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';

    if (sessions.length === 0) {
        historyList.innerHTML = '<p style="color:var(--color-muted);text-align:center;">まだ学習履歴がありません</p>';
        return;
    }

    sessions.forEach(s => {
        const date = new Date(s.date).toLocaleString('ja-JP', {
            month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
        const modeLabel = s.mode === 'weak' ? '🔥苦手' : '🎲通常';
        const domainLabel = s.domain === 'all' ? '全分野' : s.domain;

        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
      <span>${date}　${modeLabel}・${domainLabel}</span>
      <span>${s.correct}/${s.total} 問</span>
      <span class="history-rate">${s.rate}%</span>
    `;
        historyList.appendChild(item);
    });
}

/**
 * selectDomain 変更時に selectCount のオプションを更新する
 */
function updateCountOptions() {
  const domain = selectDomain.value;
  const pool = domain === 'all'
    ? allQuestions
    : allQuestions.filter(q => q.domain === domain);
  const max = pool.length;

  selectCount.innerHTML = '';
  [10, 20, 30].forEach(n => {
    if (n > max) return; // 問題数を超えるオプションは表示しない
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = `${n} 問`;
    selectCount.appendChild(opt);
  });

  // 全問オプションは常に追加
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = `全問（${max} 問）`;
  selectCount.appendChild(allOpt);

  updateStartButtonLabel();
}

// selectDomain の change イベントを更新
selectDomain.addEventListener('change', () => {
  updateCountOptions();
});