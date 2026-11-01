/**
 * log-highlight.js
 * パターンマッチによる色付けログ出力モジュール
 *
 * 使用方法:
 *   Service Worker: importScripts('shared/lib/logging/log-highlight.js');
 *   Popup: <script src="shared/lib/logging/log-highlight.js"></script>
 *
 * API:
 *   LogHighlight.log(message, ...args)     - 色付きログ出力
 *   LogHighlight.warn(message, ...args)    - 警告ログ出力
 *   LogHighlight.error(message, ...args)   - エラーログ出力
 *   LogHighlight.addPattern(pattern, style) - カスタムパターン追加
 *   LogHighlight.setPatterns(patterns)     - パターン一括設定
 */
const LogHighlight = (function () {
  'use strict';

  // デフォルトの色付けパターン（優先度順: 具体的なパターンを先に配置）
  const DEFAULT_PATTERNS = [
    // 1. 複合パターン（具体的なもの）を先に - 「監視開始」が「監視」より先にマッチ
    { pattern: /監視開始|start.*monitor/i, style: 'color: #00aaff; font-weight: bold;' },
    { pattern: /監視停止|stop.*monitor/i, style: 'color: #ff6600; font-weight: bold;' },

    // 2. 重要イベント（背景色）- 検知・在庫あり・checkout のみ
    { pattern: /検知|detect|発見|found/i, style: 'background: #ccffcc; color: #333; font-weight: bold;' },
    { pattern: /^🎯/, style: 'background: #ccffcc; color: #333; font-weight: bold;' },
    { pattern: /在庫あり|in.?stock|stock.*available|在庫復活/i, style: 'background: #ccffcc; color: #333; font-weight: bold;' },
    { pattern: /checkout|最終確認/i, style: 'background: #ffffcc; color: #333; font-weight: bold;' },

    // 3. エラー系（赤）
    { pattern: /error|エラー|失敗|fail/i, style: 'color: #ff4444; font-weight: bold;' },
    { pattern: /^❌/, style: 'color: #ff4444; font-weight: bold;' },

    // 4. 成功系（緑）
    { pattern: /success|成功|完了|done|saved|保存/i, style: 'color: #44bb44; font-weight: bold;' },
    { pattern: /^✅/, style: 'color: #44bb44; font-weight: bold;' },

    // 5. 警告系（オレンジ）
    { pattern: /warning|警告|注意|caution/i, style: 'color: #ffaa00; font-weight: bold;' },
    { pattern: /^⚠️/, style: 'color: #ffaa00; font-weight: bold;' },

    // 6. 情報系（青）
    { pattern: /info|情報|通知/i, style: 'color: #4488ff;' },
    { pattern: /^ℹ️/, style: 'color: #4488ff;' },

    // 7. カート系（紫）
    { pattern: /カート|cart|basket/i, style: 'color: #aa44ff;' },

    // 8. 開始/停止（単体）- 複合パターンの後に配置
    { pattern: /開始|start|begin/i, style: 'color: #00aaff;' },
    { pattern: /停止|stop|終了/i, style: 'color: #ff6600;' },

    // 9. 在庫なし（赤）
    { pattern: /在庫なし|sold.?out|out.?of.?stock/i, style: 'color: #cc0000;' },

    // 10. デバッグ系（グレー）
    { pattern: /debug|デバッグ|trace/i, style: 'color: #888888;' },

    // Note: 「監視」単体パターンは削除（ほぼ全ログにマッチして黄色背景だらけになるため）
  ];

  // カスタムパターン格納用
  let customPatterns = [];

  /**
   * メッセージに一致するパターンを検索
   * @param {string} message - チェック対象のメッセージ
   * @returns {object|null} 一致したパターン、なければnull
   */
  function findMatchingPattern(message) {
    if (typeof message !== 'string') return null;

    // カスタムパターンを先に検索（優先度高）
    for (const p of customPatterns) {
      if (p.pattern.test(message)) return p;
    }

    // デフォルトパターンを検索
    for (const p of DEFAULT_PATTERNS) {
      if (p.pattern.test(message)) return p;
    }

    return null;
  }

  /**
   * タイムスタンプを生成（HH:MM:SS.mmm形式）
   * @returns {string} フォーマットされたタイムスタンプ
   */
  function formatTimestamp() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const mmm = String(now.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${mmm}`;
  }

  /**
   * 色付きログを出力
   * @param {string} level - ログレベル（log, warn, error）
   * @param {string} message - メッセージ
   * @param {...any} args - 追加引数
   */
  function outputLog(level, message, ...args) {
    const timestamp = formatTimestamp();
    const prefix = `[${timestamp}]`;

    // level に応じた console メソッドを決定
    const consoleMethod = console[level] || console.log;

    // メッセージがエラーの場合は強制的にスタイル適用
    if (level === 'error') {
      const style = 'color: #ff4444; font-weight: bold;';
      consoleMethod(`%c${prefix} ${message}`, style, ...args);
      return;
    }

    // パターンマッチでスタイルを決定
    const matchedPattern = findMatchingPattern(message);

    if (matchedPattern) {
      consoleMethod(`%c${prefix} ${message}`, matchedPattern.style, ...args);
    } else {
      consoleMethod(prefix, message, ...args);
    }
  }

  /**
   * 通常ログ出力
   */
  function log(message, ...args) {
    outputLog('log', message, ...args);
  }

  /**
   * 警告ログ出力
   */
  function warn(message, ...args) {
    outputLog('warn', message, ...args);
  }

  /**
   * エラーログ出力
   */
  function error(message, ...args) {
    outputLog('error', message, ...args);
  }

  /**
   * カスタムパターンを追加
   * @param {RegExp} pattern - マッチングパターン
   * @param {string} style - CSS スタイル
   */
  function addPattern(pattern, style) {
    customPatterns.push({ pattern, style });
  }

  /**
   * パターンを一括設定（既存のカスタムパターンを置換）
   * @param {Array} patterns - {pattern, style} の配列
   */
  function setPatterns(patterns) {
    customPatterns = patterns.slice();
  }

  /**
   * カスタムパターンをクリア
   */
  function clearPatterns() {
    customPatterns = [];
  }

  /**
   * 現在のパターン一覧を取得
   * @returns {Array} すべてのパターン（カスタム + デフォルト）
   */
  function getPatterns() {
    return [...customPatterns, ...DEFAULT_PATTERNS];
  }

  // 公開API
  return {
    log,
    warn,
    error,
    addPattern,
    setPatterns,
    clearPatterns,
    getPatterns,
    DEFAULT_PATTERNS,
  };
})();

// グローバルスコープにエクスポート（Service Worker / Popup 両対応）
if (typeof globalThis !== 'undefined') {
  globalThis.LogHighlight = LogHighlight;
}
