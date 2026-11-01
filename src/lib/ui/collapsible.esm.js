const DEFAULTS = Object.freeze({
  storageKey: 'popupCollapsibleStates',
  defaultCollapsed: true,
  sectionSelector: '[data-collapsible-section]',
  triggerSelector: '[data-collapsible-trigger]',
  contentSelector: '[data-collapsible-content]',
  stateLabelSelector: '.section-toggle-state'
});

export function setSectionState(section, isCollapsed, options = DEFAULTS) {
  const trigger = section?.querySelector(options.triggerSelector);
  const content = section?.querySelector(options.contentSelector);
  const stateLabel = section?.querySelector(options.stateLabelSelector);
  if (!trigger || !content) return false;
  section.classList.toggle('collapsed', isCollapsed);
  trigger.setAttribute('aria-expanded', String(!isCollapsed));
  content.hidden = isCollapsed;
  if (stateLabel) stateLabel.textContent = isCollapsed ? '開く' : '閉じる';
  return true;
}

export async function init({ root = document, storage = chrome?.storage?.local, ...overrides } = {}) {
  if (!root?.querySelectorAll || !storage?.get || !storage?.set) throw new TypeError('Collapsibleの初期化に必要なrootまたはstorageがありません');
  const options = { ...DEFAULTS, ...overrides };
  let states = {};
  try {
    const stored = await storage.get(options.storageKey);
    states = stored?.[options.storageKey] && typeof stored[options.storageKey] === 'object' ? { ...stored[options.storageKey] } : {};
  } catch (_error) { /* 初期状態を使う */ }
  const listeners = [];
  Array.from(root.querySelectorAll(options.sectionSelector)).forEach((section) => {
    const sectionId = section?.dataset?.collapsibleId;
    const trigger = section?.querySelector(options.triggerSelector);
    if (!sectionId || !trigger) return;
    setSectionState(section, Object.prototype.hasOwnProperty.call(states, sectionId) ? Boolean(states[sectionId]) : options.defaultCollapsed, options);
    const onClick = async () => {
      const nextCollapsed = !section.classList.contains('collapsed');
      setSectionState(section, nextCollapsed, options);
      states = { ...states, [sectionId]: nextCollapsed };
      try { await storage.set({ [options.storageKey]: states }); } catch (_error) { /* 表示状態を維持 */ }
    };
    trigger.addEventListener('click', onClick);
    listeners.push({ trigger, onClick });
  });
  return Object.freeze({ destroy: () => listeners.forEach(({ trigger, onClick }) => trigger.removeEventListener('click', onClick)) });
}

export const Collapsible = Object.freeze({ init, setSectionState });
