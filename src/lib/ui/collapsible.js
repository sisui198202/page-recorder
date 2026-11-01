(function attachCollapsible(global) {
  'use strict';

  const DEFAULTS = Object.freeze({
    storageKey: 'popupCollapsibleStates',
    defaultCollapsed: true,
    sectionSelector: '[data-collapsible-section]',
    triggerSelector: '[data-collapsible-trigger]',
    contentSelector: '[data-collapsible-content]',
    stateLabelSelector: '.section-toggle-state'
  });

  function setSectionState(section, isCollapsed, options) {
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

  async function init({ root = global.document, storage = global.chrome?.storage?.local, ...overrides } = {}) {
    if (!root?.querySelectorAll || !storage?.get || !storage?.set) {
      throw new TypeError('Collapsibleの初期化に必要なrootまたはstorageがありません');
    }

    const options = { ...DEFAULTS, ...overrides };
    let states = {};
    try {
      const stored = await storage.get(options.storageKey);
      const storedStates = stored?.[options.storageKey];
      states = storedStates && typeof storedStates === 'object' ? { ...storedStates } : {};
    } catch (_error) {
      states = {};
    }

    const listeners = [];
    const sections = Array.from(root.querySelectorAll(options.sectionSelector));
    sections.forEach((section) => {
      const sectionId = section?.dataset?.collapsibleId;
      const trigger = section?.querySelector(options.triggerSelector);
      if (!sectionId || !trigger) return;

      const isCollapsed = Object.prototype.hasOwnProperty.call(states, sectionId)
        ? Boolean(states[sectionId])
        : options.defaultCollapsed;
      setSectionState(section, isCollapsed, options);

      const onClick = async () => {
        const nextCollapsed = !section.classList.contains('collapsed');
        setSectionState(section, nextCollapsed, options);
        states = { ...states, [sectionId]: nextCollapsed };
        try {
          await storage.set({ [options.storageKey]: states });
        } catch (_error) {
          // 表示状態は維持し、次回起動時は保存済み状態へフォールバックする。
        }
      };
      trigger.addEventListener('click', onClick);
      listeners.push({ trigger, onClick });
    });

    return Object.freeze({
      setState(section, isCollapsed) {
        return setSectionState(section, Boolean(isCollapsed), options);
      },
      destroy() {
        listeners.forEach(({ trigger, onClick }) => trigger.removeEventListener('click', onClick));
      }
    });
  }

  global.Collapsible = Object.freeze({ init, setSectionState });
})(globalThis);
