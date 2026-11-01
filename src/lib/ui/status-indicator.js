(function attachStatusIndicator(global) {
  'use strict';

  const STATES = Object.freeze(['idle', 'running', 'disabled', 'error', 'scheduled']);

  function render({ indicator, textElement, state, text } = {}) {
    if (!indicator || !textElement || !STATES.includes(state)) {
      throw new TypeError('StatusIndicatorの表示対象または状態が不正です');
    }

    STATES.forEach((name) => indicator.classList.remove(`shared-ui-status--${name}`));
    indicator.classList.add('shared-ui-status', `shared-ui-status--${state}`);
    indicator.setAttribute('aria-hidden', 'true');
    textElement.setAttribute('aria-live', 'polite');
    textElement.textContent = typeof text === 'string' ? text : state;
  }

  global.StatusIndicator = Object.freeze({ STATES, render });
})(globalThis);
