/**
 * timestamped-console.js
 * コンソール出力にタイムスタンプを自動付与するモジュール
 *
 * 使用方法:
 *   Popup/Options: <script src="shared/lib/logging/timestamped-console.js"></script>
 *   Service Worker: importScripts('shared/lib/logging/timestamped-console.js');
 *
 * API:
 *   TimestampedConsole.install()             - console をラップしてタイムスタンプを付与
 *   TimestampedConsole.install(targetConsole) - 指定した console オブジェクトをラップ
 *   TimestampedConsole.uninstall()           - ラップを解除（元の console に戻す）
 *   TimestampedConsole.isInstalled()         - インストール済みかどうかを確認
 */
const TimestampedConsole = (function () {
  'use strict';

  // 対象メソッド（PageRecorderと同じ5メソッド）
  const METHODS = ['log', 'info', 'warn', 'error', 'debug'];

  // フラグ名（二重ラップ防止用）
  const WRAPPED_FLAG = '__sharedTimestampWrapped';

  // 元のメソッドを保存
  let originalMethods = null;
  let targetConsole = null;

  /**
   * タイムスタンプを生成（HH:MM:SS.mmm:形式）
   * @returns {string} フォーマットされたタイムスタンプ
   */
  function formatTimestamp() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const mmm = String(now.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${mmm}:`;
  }

  /**
   * メッセージにプレフィックスを付与
   * @param {any} message - 元のメッセージ
   * @param {string} prefix - プレフィックス
   * @returns {Array} [prefixedMessage] または [prefix, message]
   */
  function prefixMessage(message, prefix) {
    if (typeof message !== 'string') {
      // 非文字列はそのままprefixと分離して返す
      return [prefix, message];
    }

    // 改行に対してもprefixを付与
    const prefixedMessage = `${prefix} ${message}`.replace(/\n/g, `\n${prefix} `);
    return [prefixedMessage];
  }

  /**
   * console をラップしてタイムスタンプを自動付与
   * @param {Console} [consoleObj=console] - ラップ対象の console オブジェクト
   * @returns {boolean} 成功したら true、既にラップ済みなら false
   */
  function install(consoleObj) {
    const target = consoleObj || console;

    // 二重ラップ防止
    if (target[WRAPPED_FLAG]) {
      return false;
    }

    targetConsole = target;
    originalMethods = {};

    // 各メソッドをラップ
    METHODS.forEach((method) => {
      const original = target[method];
      if (typeof original !== 'function') return;

      // 元のメソッドを保存
      originalMethods[method] = original;

      // ラップしたメソッドを設定
      target[method] = function timestampedMethod(...args) {
        const prefix = formatTimestamp();

        if (args.length === 0) {
          original.call(target, prefix);
          return;
        }

        const [firstArg, ...restArgs] = args;
        const prefixedArgs = prefixMessage(firstArg, prefix);
        original.call(target, ...prefixedArgs, ...restArgs);
      };
    });

    // フラグを設定
    Object.defineProperty(target, WRAPPED_FLAG, {
      value: true,
      configurable: true,
      enumerable: false,
      writable: false,
    });

    return true;
  }

  /**
   * ラップを解除（元の console に戻す）
   * @returns {boolean} 成功したら true、未インストールなら false
   */
  function uninstall() {
    if (!targetConsole || !originalMethods) {
      return false;
    }

    // 元のメソッドを復元
    METHODS.forEach((method) => {
      if (originalMethods[method]) {
        targetConsole[method] = originalMethods[method];
      }
    });

    // フラグを削除
    delete targetConsole[WRAPPED_FLAG];

    originalMethods = null;
    targetConsole = null;

    return true;
  }

  /**
   * インストール済みかどうかを確認
   * @param {Console} [consoleObj=console] - 確認対象の console オブジェクト
   * @returns {boolean} インストール済みなら true
   */
  function isInstalled(consoleObj) {
    const target = consoleObj || console;
    return target[WRAPPED_FLAG] === true;
  }

  // 公開API
  return {
    install,
    uninstall,
    isInstalled,
    METHODS,
  };
})();

// グローバルスコープにエクスポート
if (typeof globalThis !== 'undefined') {
  globalThis.TimestampedConsole = TimestampedConsole;
}
