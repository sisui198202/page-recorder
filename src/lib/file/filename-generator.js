(function attachFilenameGenerator(global) {
  'use strict';

  class FilenameGeneratorError extends Error {
    constructor() {
      super('ファイル名の入力が不正です');
      this.name = 'FilenameGeneratorError';
      this.code = 'INVALID_FILENAME_INPUT';
    }
  }

  function formatJstTimestamp(value) {
    const date = value === undefined ? new Date() : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new FilenameGeneratorError();
    }

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts.filter(({ type }) => type !== 'literal').map(({ type, value: partValue }) => [type, partValue])
    );

    return `${values.year}${values.month}${values.day}-${values.hour}${values.minute}${values.second}`;
  }

  function create({ kind, siteName, keyword, now, extension } = {}) {
    if (!global.FileSanitizer || !String(kind || '').trim() || !String(extension || '').trim()) {
      throw new FilenameGeneratorError();
    }

    const rawExtension = String(extension).trim();
    if (rawExtension.startsWith('.')) {
      throw new FilenameGeneratorError();
    }

    const safeKind = global.FileSanitizer.sanitizeSegment(kind);
    const safeSiteName = global.FileSanitizer.sanitizeSegment(siteName, { fallback: 'unknown' });
    const safeExtension = global.FileSanitizer.sanitizeSegment(rawExtension, { fallback: '' });
    if (!safeExtension || safeExtension === 'unnamed') {
      throw new FilenameGeneratorError();
    }

    const parts = [safeKind, safeSiteName];
    if (String(keyword == null ? '' : keyword).trim()) {
      parts.push(global.FileSanitizer.sanitizeSegment(keyword));
    }
    parts.push(formatJstTimestamp(now));

    return `${parts.join('_')}.${safeExtension}`;
  }

  global.FilenameGenerator = Object.freeze({
    create,
    FilenameGeneratorError
  });
})(globalThis);
