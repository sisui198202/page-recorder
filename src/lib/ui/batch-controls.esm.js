export const STATES = Object.freeze(['idle', 'running']);

export function bind({ startButton, stopButton, onStart, onStop, initialState = 'idle' } = {}) {
  if (!startButton || !stopButton || typeof onStart !== 'function' || typeof onStop !== 'function' || !STATES.includes(initialState)) throw new TypeError('BatchControlsの設定が不正です');
  let state = initialState;
  let busy = false;
  const render = () => { startButton.disabled = busy || state === 'running'; stopButton.disabled = busy || state !== 'running'; };
  const setState = (nextState) => { if (!STATES.includes(nextState)) throw new TypeError('BatchControlsの状態が不正です'); state = nextState; render(); };
  const run = async (action, fallbackState) => {
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
  };
  const onStartClick = () => { void run(onStart, 'running'); };
  const onStopClick = () => { void run(onStop, 'idle'); };
  startButton.addEventListener('click', onStartClick);
  stopButton.addEventListener('click', onStopClick);
  render();
  return Object.freeze({ setState, getState: () => state, destroy: () => { startButton.removeEventListener('click', onStartClick); stopButton.removeEventListener('click', onStopClick); } });
}

export const BatchControls = Object.freeze({ STATES, bind });
