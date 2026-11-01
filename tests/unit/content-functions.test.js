const {
    loadContentFunctions
} = require('../helpers/load-source-functions');
const fs = require('fs');
const path = require('path');

describe('content.js pure functions', () => {
    const { normalizeText, isHighFrequencySessionExpired, getHighFrequencySessionKey } = loadContentFunctions([
        'normalizeText',
        'isHighFrequencySessionExpired',
        'getHighFrequencySessionKey'
    ]);

    test('normalizeText collapses whitespace and trims', () => {
        expect(normalizeText('  a\tb\n c  ')).toBe('a b c');
        expect(normalizeText('')).toBe('');
        expect(normalizeText(null)).toBe('');
    });

    test('高頻度セッションは終了時刻に達した場合だけ期限切れと判定する', () => {
        expect(isHighFrequencySessionExpired({ endsAt: 1000 }, 999)).toBe(false);
        expect(isHighFrequencySessionExpired({ endsAt: 1000 }, 1000)).toBe(true);
        expect(isHighFrequencySessionExpired({}, 1000)).toBe(false);
    });

    test('同一の高頻度セッション世代を一意の実行キーとして識別する', () => {
        expect(getHighFrequencySessionKey({ id: 'single_1', generation: 3 }))
            .toBe('single_1:3');
        expect(getHighFrequencySessionKey({ id: 'single_1' })).toBe('single_1:unknown');
    });

    test('同一世代の開始通知とready通知では監視処理を一度だけ実行する', () => {
        const source = fs.readFileSync(
            path.resolve(__dirname, '../../src/content/content.js'),
            'utf8'
        );

        expect(source).toContain('let highFrequencySessionKey = null');
        expect(source).toContain('const sessionKey = getHighFrequencySessionKey(session);');
        expect(source).toContain('if (!isFollowUp && highFrequencySessionKey === sessionKey) return;');
    });

    test('受け入れテストのDOM更新結果をbackgroundへ渡す', () => {
        const source = fs.readFileSync(
            path.resolve(__dirname, '../../src/content/content.js'),
            'utf8'
        );

        expect(source).toContain('let testDomMutation = null');
        expect(source).toContain('testDomMutation = {');
        expect(source).toContain('testDomMutation');
    });
});

describe('テストタブの基準取得後の変化', () => {
    const { applyTestTabDomMutation, shouldHoldForTestTabManualWindow } = loadContentFunctions([
        'applyTestTabDomMutation',
        'shouldHoldForTestTabManualWindow'
    ]);
    const createRoot = (texts) => {
        const elements = texts.map((text) => ({ textContent: text, dataset: {} }));
        return {
            elements,
            querySelectorAll: () => elements
        };
    };

    test('出現は一致したすべての要素の末尾にキーワードを追記する', () => {
        const root = createRoot(['在庫なし', '在庫なし - ¥330']);
        const result = applyTestTabDomMutation(root, 'button', 'カートに入れる', 'detect_after_initial');

        expect(root.elements.map((element) => element.textContent)).toEqual([
            '在庫なし カートに入れる',
            '在庫なし - ¥330 カートに入れる'
        ]);
        expect(result).toEqual({ applied: true, selector: 'button', keyword: 'カートに入れる', count: 2 });
    });

    test('消失は一致したすべての要素からキーワードを削除する', () => {
        const root = createRoot(['カートに入れる', 'カートに入れる - ¥4,109']);
        const result = applyTestTabDomMutation(root, 'button', 'カートに入れる', 'disappear_after_initial');

        expect(root.elements.map((element) => element.textContent)).toEqual(['', ' - ¥4,109']);
        expect(result.count).toBe(2);
    });

    test('同じ要素は2回目以降変化させない', () => {
        const root = createRoot(['在庫なし']);
        applyTestTabDomMutation(root, 'button', 'カートに入れる', 'detect_after_initial');
        const second = applyTestTabDomMutation(root, 'button', 'カートに入れる', 'detect_after_initial');

        expect(root.elements[0].textContent).toBe('在庫なし カートに入れる');
        expect(second).toEqual({ applied: false, selector: 'button', keyword: 'カートに入れる', count: 0 });
    });

    test('変化のない動作や手動モードでは文言を変えない', () => {
        const root = createRoot(['在庫なし']);

        expect(applyTestTabDomMutation(root, 'button', 'カートに入れる', 'none')).toBeNull();
        expect(applyTestTabDomMutation(root, 'button', 'カートに入れる', 'manual_after_initial')).toBeNull();
        expect(root.elements[0].textContent).toBe('在庫なし');
    });

    test('無効なセレクタでも例外を外へ出さず変化なしとして扱う', () => {
        const root = { querySelectorAll: () => { throw new Error('invalid selector'); } };

        expect(applyTestTabDomMutation(root, '[', 'カートに入れる', 'detect_after_initial'))
            .toEqual({ applied: false, selector: '[', keyword: 'カートに入れる', count: 0 });
    });

    test('手動の受付時間はテストタブの手動モードで基準取得後の最初の読み込みだけ設ける', () => {
        const base = {
            testOnly: 'test_tab_scenario',
            initialCheckCompleted: true,
            manualWindowCompleted: false,
            settings: { twoTierTestBehavior: 'manual_after_initial' }
        };

        expect(shouldHoldForTestTabManualWindow(base)).toBe(true);
        expect(shouldHoldForTestTabManualWindow({ ...base, initialCheckCompleted: false })).toBe(false);
        expect(shouldHoldForTestTabManualWindow({ ...base, manualWindowCompleted: true })).toBe(false);
        expect(shouldHoldForTestTabManualWindow({ ...base, testOnly: undefined })).toBe(false);
        expect(shouldHoldForTestTabManualWindow({ ...base, settings: { twoTierTestBehavior: 'detect_after_initial' } })).toBe(false);
    });
});
