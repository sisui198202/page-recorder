/**
 * sw-log-buffer.js
 * Service Worker ログの循環バッファ保持モジュール
 *
 * 使用方法:
 *   Service Worker: importScripts('shared/lib/logging/sw-log-buffer.js');
 *
 * API:
 *   SwLogBuffer.push(level, message, args)  - ログエントリを追加
 *   SwLogBuffer.getAll()                    - 全ログを取得
 *   SwLogBuffer.clear()                     - バッファをクリア
 *   SwLogBuffer.setMaxSize(size)            - バッファサイズを設定
 *   SwLogBuffer.getMaxSize()                - 現在のバッファサイズを取得
 *   SwLogBuffer.toText()                    - ログをテキスト形式で取得
 */
const SwLogBuffer = (function () {
  'use strict';

  // デフォルトのバッファサイズ（PageRecorderと同じ）
  const DEFAULT_MAX_SIZE = 300;

  // バッファとサイズ設定
  let buffer = [];
  let maxSize = DEFAULT_MAX_SIZE;

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
   * 値を文字列に変換（JSON化を試みる）
   * @param {any} value - 変換対象
   * @returns {string} 文字列化された値
   */
  function stringify(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }

  /**
   * ログエントリを追加
   * @param {string} level - ログレベル（LOG, WARN, ERROR, INFO, DEBUG）
   * @param {string} message - メッセージ
   * @param {Array} [args=[]] - 追加引数
   */
  function push(level, message, args = []) {
    const timestamp = formatTimestamp();
    const levelUpper = (level || 'LOG').toUpperCase();

    // argsを文字列化
    const argsStr = args.length > 0
      ? ' ' + args.map(stringify).join(' ')
      : '';

    // フォーマット: [HH:MM:SS.mmm] [LEVEL] message args
    const entry = `[${timestamp}] [${levelUpper}] ${message}${argsStr}`;

    buffer.push(entry);

    // FIFO: バッファサイズを超えたら古いログを削除
    while (buffer.length > maxSize) {
      buffer.shift();
    }
  }

  /**
   * ログ出力と同時にバッファに追加するヘルパー
   * @param {string} level - ログレベル
   * @param {string} message - メッセージ
   * @param {...any} args - 追加引数
   */
  function log(message, ...args) {
    push('LOG', message, args);
    console.log(message, ...args);
  }

  function warn(message, ...args) {
    push('WARN', message, args);
    console.warn(message, ...args);
  }

  function error(message, ...args) {
    push('ERROR', message, args);
    console.error(message, ...args);
  }

  function info(message, ...args) {
    push('INFO', message, args);
    console.info(message, ...args);
  }

  function debug(message, ...args) {
    push('DEBUG', message, args);
    console.debug(message, ...args);
  }

  /**
   * 全ログを取得（配列のコピーを返す）
   * @returns {Array<string>} ログエントリの配列
   */
  function getAll() {
    return buffer.slice();
  }

  /**
   * バッファをクリア
   */
  function clear() {
    buffer = [];
  }

  /**
   * バッファサイズを設定
   * @param {number} size - 新しいバッファサイズ
   */
  function setMaxSize(size) {
    if (typeof size === 'number' && size > 0) {
      maxSize = size;
      // サイズを超えている場合は古いログを削除
      while (buffer.length > maxSize) {
        buffer.shift();
      }
    }
  }

  /**
   * 現在のバッファサイズを取得
   * @returns {number} バッファサイズ
   */
  function getMaxSize() {
    return maxSize;
  }

  /**
   * 現在のログ件数を取得
   * @returns {number} ログ件数
   */
  function getCount() {
    return buffer.length;
  }

  /**
   * ログをテキスト形式で取得（コピー用）
   * @param {string} [separator='\n'] - 区切り文字
   * @returns {string} ログテキスト
   */
  function toText(separator = '\n') {
    return buffer.join(separator);
  }

  /**
   * 最新のN件のログを取得
   * @param {number} n - 取得件数
   * @returns {Array<string>} ログエントリの配列
   */
  function getLast(n) {
    if (n >= buffer.length) return buffer.slice();
    return buffer.slice(-n);
  }

  // 公開API
  return {
    push,
    log,
    warn,
    error,
    info,
    debug,
    getAll,
    clear,
    setMaxSize,
    getMaxSize,
    getCount,
    toText,
    getLast,
    DEFAULT_MAX_SIZE,
  };
})();

// グローバルスコープにエクスポート（Service Worker対応）
if (typeof globalThis !== 'undefined') {
  globalThis.SwLogBuffer = SwLogBuffer;
}
