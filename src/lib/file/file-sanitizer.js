(function attachFileSanitizer(global) {
  'use strict';

  const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001F\u007F]/g;

  function normalizeValue(value) {
    return String(value == null ? '' : value)
      .normalize('NFC')
      .replace(INVALID_FILENAME_CHARACTERS, '_')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function truncate(value, maxLength) {
    return Array.from(value).slice(0, maxLength).join('');
  }

  function sanitizeSegment(value, { fallback = 'unnamed', maxLength = 80 } = {}) {
    const safeMaxLength = Number.isInteger(maxLength) && maxLength > 0 ? maxLength : 80;
    const normalized = truncate(normalizeValue(value), safeMaxLength);
    if (normalized && normalized !== '.' && normalized !== '..') {
      return normalized;
    }

    const normalizedFallback = truncate(normalizeValue(fallback), safeMaxLength);
    return normalizedFallback && normalizedFallback !== '.' && normalizedFallback !== '..'
      ? normalizedFallback
      : 'unnamed';
  }

  function sanitizePath(path, { fallback = 'unnamed', maxSegmentLength = 80 } = {}) {
    const segments = String(path == null ? '' : path)
      .split('/')
      .filter((segment) => {
        const trimmed = segment.trim();
        return trimmed && trimmed !== '.' && trimmed !== '..';
      })
      .map((segment) => sanitizeSegment(segment, { fallback, maxLength: maxSegmentLength }));

    return segments.length > 0
      ? segments.join('/')
      : sanitizeSegment(fallback, { fallback: 'unnamed', maxLength: maxSegmentLength });
  }

  global.FileSanitizer = Object.freeze({
    sanitizeSegment,
    sanitizePath
  });
})(globalThis);
