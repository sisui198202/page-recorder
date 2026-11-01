(function attachBatchControls(global) {
  'use strict';

  const STATES = Object.freeze(['idle', 'running']);

  function bind({ startButton, stopButton, onStart, onStop, initialState = 'idle' } = {}) {
    if (!startButton || !stopButton || typeof onStart !== 'function' || typeof onStop !== 'function') {
      throw new TypeError('BatchControlsのボタンまたはコールバックが不正です');
    }
    if (!STATES.includes(initialState)) {
      throw new TypeError('BatchControlsの初期状態が不正です');
    }

    let state = initialState;
    let busy = false;

    function render() {
      startButton.disabled = busy || state === 'running';
      stopButton.disabled = busy || state !== 'running';
    }

    function setState(nextState) {
      if (!STATES.includes(nextState)) {
        throw new TypeError('BatchControlsの状態が不正です');
      }
      state = nextState;
      render();
    }

    async function run(action, fallbackState) {
      if (busy) return;
      const previousState = state;
      busy = true;
      render();
      try {
        const nextState = await action();
        setState(STATES.includes(nextState) ? nextState : fallbackState);
      } catch (_error) {
        setState(previousState);
      } finally {
        busy = false;
        render();
      }
    }

    const onStartClick = () => { void run(onStart, 'running'); };
    const onStopClick = () => { void run(onStop, 'idle'); };
    startButton.addEventListener('click', onStartClick);
    stopButton.addEventListener('click', onStopClick);
    render();

    return Object.freeze({
      setState,
      getState: () => state,
      destroy() {
        startButton.removeEventListener('click', onStartClick);
        stopButton.removeEventListener('click', onStopClick);
      }
    });
  }

  global.BatchControls = Object.freeze({ STATES, bind });
})(globalThis);
