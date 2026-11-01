(function attachChromeNotify(global) {
  'use strict';

  function toErrorMessage(error) {
    return typeof error?.message === 'string' ? error.message : String(error || '通知の表示に失敗しました');
  }

  function logNotificationResult(level, details) {
    if (typeof global.console?.[level] === 'function') {
      global.console[level](`[chrome-notify] 通知作成${level === 'info' ? '成功' : '失敗'}`, details);
    }
  }

  async function show(options = {}, chromeApi = global.chrome) {
    const { title, message, clearAfterMs, notificationId, ...notificationOptions } = options;
    if (typeof title !== 'string' || !title.trim() || typeof message !== 'string') {
      const error = 'title と message は必須です';
      logNotificationResult('error', { notificationId: notificationId || null, title: typeof title === 'string' ? title : null, error });
      return { success: false, error };
    }
    if (!chromeApi?.notifications?.create) {
      const error = 'chrome.notifications.create を利用できません';
      logNotificationResult('error', { notificationId: notificationId || null, title, error });
      return { success: false, error };
    }

    const id = notificationId || `notification-${Date.now()}`;
    try {
      await chromeApi.notifications.create(id, {
        type: 'basic',
        ...notificationOptions,
        title,
        message
      });
      logNotificationResult('info', { notificationId: id, title });
      if (Number.isFinite(clearAfterMs) && clearAfterMs > 0 && chromeApi.notifications.clear) {
        setTimeout(() => {
          chromeApi.notifications.clear(id).catch(() => {});
        }, clearAfterMs);
      }
      return { success: true, notificationId: id };
    } catch (error) {
      const message = toErrorMessage(error);
      logNotificationResult('error', { notificationId: id, title, error: message });
      return { success: false, error: message };
    }
  }

  global.ChromeNotify = Object.freeze({ show });
})(globalThis);
