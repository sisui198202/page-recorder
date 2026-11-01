(function attachFileSave(global) {
  'use strict';

  class FileSaveError extends Error {
    constructor(code) {
      const messages = {
        EMPTY_CONTENT: '保存する内容がありません',
        INVALID_DATA_URL: '保存するデータ形式が不正です',
        DOWNLOAD_FAILED: 'ダウンロードに失敗しました'
      };
      super(messages[code] || 'ファイル保存に失敗しました');
      this.name = 'FileSaveError';
      this.code = code;
    }
  }

  function toDataUrl(textContent, mimeType) {
    const bytes = new TextEncoder().encode(String(textContent));
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return `data:${mimeType || 'text/plain;charset=utf-8'};base64,${btoa(binary)}`;
  }

  function isImageDataUrl(dataUrl) {
    return typeof dataUrl === 'string' && /^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$/i.test(dataUrl);
  }

  function requestDownload({ url, filename, saveAs = false, conflictAction = 'uniquify' }) {
    if (!global.FileSanitizer || !global.chrome?.downloads?.download) {
      return Promise.reject(new FileSaveError('DOWNLOAD_FAILED'));
    }

    const safeFilename = global.FileSanitizer.sanitizePath(filename);
    return new Promise((resolve, reject) => {
      try {
        global.chrome.downloads.download(
          { url, filename: safeFilename, saveAs, conflictAction },
          (downloadId) => {
            if (global.chrome.runtime?.lastError || !Number.isInteger(downloadId)) {
              reject(new FileSaveError('DOWNLOAD_FAILED'));
              return;
            }
            resolve({ downloadId, filename: safeFilename });
          }
        );
      } catch (_error) {
        reject(new FileSaveError('DOWNLOAD_FAILED'));
      }
    });
  }

  function download({ url, textContent, mimeType, filename, saveAs = false, conflictAction = 'uniquify' } = {}) {
    const hasUrl = typeof url === 'string' && url.length > 0;
    const hasTextContent = textContent !== undefined && textContent !== null && String(textContent).length > 0;
    if (hasUrl === hasTextContent) {
      return Promise.reject(new FileSaveError('EMPTY_CONTENT'));
    }

    return requestDownload({
      url: hasUrl ? url : toDataUrl(textContent, mimeType),
      filename,
      saveAs,
      conflictAction
    });
  }

  function saveHtml({ html, filename, saveAs = false, conflictAction = 'uniquify' } = {}) {
    return download({
      textContent: html,
      mimeType: 'text/html;charset=utf-8',
      filename,
      saveAs,
      conflictAction
    });
  }

  function saveScreenshot({ dataUrl, filename, saveAs = false, conflictAction = 'uniquify' } = {}) {
    if (!isImageDataUrl(dataUrl)) {
      return Promise.reject(new FileSaveError('INVALID_DATA_URL'));
    }
    return requestDownload({ url: dataUrl, filename, saveAs, conflictAction });
  }

  global.FileSave = Object.freeze({
    download,
    saveHtml,
    saveScreenshot,
    FileSaveError
  });
})(globalThis);
