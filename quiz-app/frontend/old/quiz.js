// =====================
// quiz.js — 問題管理・CSV パーサー
// =====================

// LocalStorage キー
const LS_QUESTION_STATS = 'az305_question_stats';
const LS_SESSIONS       = 'az305_sessions';


'use strict';

// --- グローバル状態 ---
let allQuestions = [];      // CSV から読み込んだ全問題
let sessionQuestions = [];  // 今セッションで出題する問題リスト
let currentIndex = 0;       // 現在の問題インデックス
let correctCount = 0;       // 正解数
let selectedMode = 'normal';// 'normal' | 'weak'

// =====================
// CSV の読み込み・パース
// =====================

/**
 * CSV ファイルを fetch で読み込み、パースして allQuestions に格納する
 * @returns {Promise<void>}
 */
async function loadQuestions() {
  try {
    const response = await fetch('data/questions.csv');
    if (!response.ok) throw new Error('CSV の読み込みに失敗しました');
    const text = await response.text();
    allQuestions = parseCSV(text);
    console.log(`✅ ${allQuestions.length} 問を読み込みました`);
  } catch (error) {
    console.error('❌ CSV 読み込みエラー:', error);
    alert('問題データの読み込みに失敗しました。\nLive Server で起動しているか確認してください。');
  }
}

/**
 * CSV テキストをパースして問題オブジェクトの配列を返す
 * ダブルクォートで囲まれたカンマ・改行にも対応
 * @param {string} csvText
 * @returns {Array<Object>}
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const questions = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue; // 不正な行をスキップ

    const q = {};
    headers.forEach((header, idx) => {
      q[header.trim()] = values[idx] ? values[idx].trim() : '';
    });
    questions.push(q);
  }
  return questions;
}

/**
 * CSV の 1 行をフィールドの配列にパースする（ダブルクォート対応）
 * @param {string} line
 * @returns {string[]}
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'; // "" → " のエスケープ
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// =====================
// ドメイン（分野）一覧の取得
// =====================

/**
 * 全問題からドメイン名の一覧（重複なし）を取得する
 * @returns {string[]}
 */
function getDomains() {
  const domains = allQuestions.map(q => q.domain).filter(Boolean);
  return [...new Set(domains)].sort();
}

// =====================
// 出題セッションの準備
// =====================

/**
 * セッション開始：出題問題リストを作成する
 * @param {Object} options - { mode, count, domain }
 */
function startSession({ mode = 'normal', count = 10, domain}) {
  if(!domain){
    throw new Error('domain is required')
  }

  sessionDomain =domain;
  selectedMode = mode;
  currentIndex = 0;
  correctCount = 0;

  // ドメインフィルタ
  let pool = domain === 'all'
    ? [...allQuestions]
    : allQuestions.filter(q => q.domain === domain);

  // 苦手問題モードのフィルタ
  if (mode === 'weak') {
    pool = pool.filter(q => isWeakQuestion(q.id));
    if (pool.length === 0) return null; // 苦手問題なし
  }

  // シャッフル
  pool = shuffle(pool);

  // 出題数の決定
  const total = count === 'all' ? pool.length : Math.min(Number(count), pool.length);
  sessionQuestions = pool.slice(0, total);

  return sessionQuestions.length;
}

/**
 * 現在の問題を返す
 * @returns {Object|null}
 */
function getCurrentQuestion() {
  return sessionQuestions[currentIndex] || null;
}

/**
 * 回答を処理して正誤を返す
 * @param {string} selectedAnswer - 'A' | 'B' | 'C' | 'D'
 * @returns {boolean} 正解かどうか
 */
function submitAnswer(selectedAnswer) {
  const q = getCurrentQuestion();
  if (!q) return false;

  const isCorrect = selectedAnswer.toUpperCase() === q.answer.toUpperCase();
  if (isCorrect) correctCount++;

  // 正誤履歴を保存（Phase 2 で実装する saveQuestionHistory を呼ぶ）
  if (typeof saveQuestionHistory === 'function') {
    saveQuestionHistory(q.id, isCorrect);
  }

  return isCorrect;
}

/**
 * 次の問題に進む
 * @returns {boolean} まだ問題があるかどうか
 */
function nextQuestion() {
  currentIndex++;
  return currentIndex < sessionQuestions.length;
}

/**
 * 現在のプログレス情報を返す
 * @returns {{ current: number, total: number, percent: number }}
 */
function getProgress() {
  const total = sessionQuestions.length;
  const current = currentIndex + 1;
  return {
    current,
    total,
    percent: Math.round((currentIndex / total) * 100),
  };
}

/**
 * セッション結果を返す
 * @returns {{ correct: number, total: number, rate: number }}
 */
function getResult() {
  const total = sessionQuestions.length;
  const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  return { correct: correctCount, total, rate };
}

// =====================
// ユーティリティ
// =====================

/** 配列をシャッフルして返す（Fisher-Yates） */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 苦手問題かどうか（Phase 2 で上書き。Phase 1 では常に false を返す） */
function isWeakQuestion(id) {
  return false; // Phase 2 で LocalStorage 参照に変更
}

// =====================
// 問題別正誤履歴の管理
// =====================

/**
 * LocalStorage から問題別統計を読み込む
 * @returns {Object} { "問題id": { correct, total }, ... }
 */
function loadQuestionStats() {
  try {
    const raw = localStorage.getItem(LS_QUESTION_STATS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * 問題別統計を LocalStorage に書き込む
 * @param {Object} stats
 */
function saveQuestionStats(stats) {
  localStorage.setItem(LS_QUESTION_STATS, JSON.stringify(stats));
}

/**
 * 1 問分の正誤を記録する
 * Phase 1 の quiz.js の isWeakQuestion と同時に定義する
 * @param {string|number} questionId
 * @param {boolean} isCorrect
 */
function saveQuestionHistory(questionId, isCorrect) {
  const stats = loadQuestionStats();
  const id = String(questionId);

  if (!stats[id]) {
    stats[id] = { correct: 0, total: 0 };
  }
  stats[id].total  += 1;
  stats[id].correct += isCorrect ? 1 : 0;

  saveQuestionStats(stats);
}

/**
 * 苦手問題かどうか判定する（正答率 60% 以下 かつ 2 回以上出題済み）
 * Phase 1 で定義した同名の関数をこれで上書きする
 * @param {string|number} id
 * @returns {boolean}
 */
function isWeakQuestion(id) {
  const stats = loadQuestionStats();
  const stat  = stats[String(id)];
  if (!stat || stat.total < 2) return false; // 2 回未満は判定しない
  return (stat.correct / stat.total) <= 0.6;
}

/**
 * 苦手問題の件数を返す
 * @returns {number}
 */
function getWeakCount() {
  const stats = loadQuestionStats();
  return allQuestions.filter(q => isWeakQuestion(q.id)).length;
}

// =====================
// セッション履歴の管理
// =====================

/**
 * LocalStorage からセッション履歴を読み込む
 * @returns {Array}
 */
function loadSessions() {
  try {
    const raw = localStorage.getItem(LS_SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 現在のセッション結果を保存する
 * app.js の showResultScreen から呼び出す
 */
function saveSession() {
  const { correct, total, rate } = getResult();
  const sessions = loadSessions();

  sessions.unshift({
    date:    new Date().toISOString(),
    correct,
    total,
    rate,
    mode:   selectedMode,
    domain: sessionDomain,
  });

  // 最大 30 件を保持
  const trimmed = sessions.slice(0, 30);
  localStorage.setItem(LS_SESSIONS, JSON.stringify(trimmed));
}

/**
 * 累計正答率を計算して返す
 * @returns {number} 0〜100 の整数
 */
function getAverageRate() {
  const sessions = loadSessions();
  if (sessions.length === 0) return 0;
  const sum = sessions.reduce((acc, s) => acc + s.rate, 0);
  return Math.round(sum / sessions.length);
}

/**
 * セッションのドメイン別結果を集計して返す
 * @returns {Array<{ domain, correct, total, rate }>}
 */
function getDomainResults() {
  const domainMap = {};

  sessionQuestions.forEach((q, i) => {
    const d = q.domain || '不明';
    if (!domainMap[d]) domainMap[d] = { correct: 0, total: 0 };
    domainMap[d].total++;
  });

  // ※ 正解かどうかは submitAnswer で correctCount を更新しているが、
  //    問題別には管理していない。LocalStorage の question_stats から算出する。
  const stats = loadQuestionStats();
  sessionQuestions.forEach(q => {
    const d = q.domain || '不明';
    const stat = stats[String(q.id)];
    if (stat && stat.total > 0) {
      // 最新の 1 回が正解かどうかは直接分からないため、
      // セッション中の正誤を配列で管理する方式に変更する（下記参照）
    }
  });

  return Object.entries(domainMap).map(([domain, { correct, total }]) => ({
    domain,
    correct,
    total,
    rate: total > 0 ? Math.round((correct / total) * 100) : 0,
  }));
}