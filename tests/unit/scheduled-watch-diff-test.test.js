const { loadScriptFunctions } = require('../helpers/load-source-functions');

function createStorage(initial = {}) {
    const data = { ...initial };
    return {
        data,
        local: {
            get: jest.fn(async (keys) => {
                if (typeof keys === 'string') return { [keys]: data[keys] };
                return (keys || []).reduce((result, key) => ({ ...result, [key]: data[key] }), {});
            }),
            set: jest.fn(async (patch) => Object.assign(data, patch)),
            remove: jest.fn(async (key) => { delete data[key]; })
        }
    };
}

function loadDiffFunctions(overrides = {}) {
    const storage = createStorage(overrides.storage);
    const chrome = {
        storage: { local: storage.local },
        tabs: {
            create: jest.fn(async () => ({ id: 44 })),
            remove: jest.fn(async () => {})
        },
        alarms: { create: jest.fn(async () => {}), clear: jest.fn(async () => {}) }
    };
    const functions = loadScriptFunctions('../../src/background/background.js', [
        'buildScheduledWatchDiffTestVerificationItems',
        'startScheduledWatchDiffTest',
        'runScheduledWatchDiffTestTick',
        'buildScheduledWatchArtifactDiffTestVerificationItems',
        'startScheduledWatchArtifactDiffTest',
        'runScheduledWatchArtifactDiffTestTick'
    ], {
        chrome,
        SCHEDULED_WATCH_TEST_SESSION_KEY: 'scheduledWatchTestSession',
        SCHEDULED_WATCH_TEST_STATUS_KEY: 'scheduledWatchTestStatus',
        SCHEDULED_WATCH_TEST_ALARM: 'scheduledWatchTestTick',
        loadScheduledWatchSites: overrides.loadScheduledWatchSites || (async () => [{
            id: 'c', name: 'Cサイト', enabled: true, url: 'https://example.com/list', selectors: { productLinks: '.item' }
        }]),
        getMultiSiteSession: overrides.getMultiSiteSession || (async () => null),
        getGmailNotificationAutoTestPreflight: overrides.getGmailNotificationAutoTestPreflight || (async () => ({ ready: true })),
        waitForTabComplete: async () => {},
        waitForScheduledWatchPageReady: overrides.waitForScheduledWatchPageReady || (async () => true),
        captureScheduledSnapshot: overrides.captureScheduledSnapshot,
        saveScheduledStockBaselineArtifacts: overrides.saveScheduledStockBaselineArtifacts || jest.fn(async () => [
            { kind: 'baseline PNG', filename: 'test/baseline.png', downloadId: 1, success: true },
            { kind: 'baseline HTML', filename: 'test/baseline.html', downloadId: 2, success: true },
            { kind: 'baseline TXT', filename: 'test/baseline.txt', downloadId: 3, success: true }
        ]),
        saveScheduledStockDetectionArtifacts: overrides.saveScheduledStockDetectionArtifacts || jest.fn(async () => [
            { kind: 'detected PNG', filename: 'test/detected.png', downloadId: 4, success: true },
            { kind: 'detected HTML', filename: 'test/detected.html', downloadId: 5, success: true }
        ]),
        diffStockProductUrls: overrides.diffStockProductUrls || ((previous, current) => current.filter((url) => !previous.includes(url))),
        notifyGmailForNewProductDetection: overrides.notifyGmailForNewProductDetection || jest.fn(async () => {}),
        getGmailNotificationAutoTestResult: overrides.getGmailNotificationAutoTestResult || jest.fn(async () => null),
        bgLogDebug: jest.fn(),
        bgLogError: jest.fn()
    });
    return { functions, chrome, storage };
}

function loadSingleSafetyTestFunctions(overrides = {}) {
    const storage = createStorage(overrides.storage);
    const chrome = {
        storage: { local: storage.local },
        alarms: { create: jest.fn(async () => {}) }
    };
    const functions = loadScriptFunctions('../../src/background/background.js', [
        'startScheduledWatchTest'
    ], {
        chrome,
        configManager: {
            loadConfig: overrides.loadConfig || (async () => ({
                single_scheduled_watch: {
                    url: 'https://example.com/list',
                    monitorSelector: ''
                }
            }))
        },
        loadScheduledWatchSites: overrides.loadScheduledWatchSites || (async () => [{
            id: 'c', name: 'Cサイト', enabled: true, url: 'https://example.com/list',
            selectors: { productLinks: '.item', itemCount: '.count' }
        }]),
        getMultiSiteSession: overrides.getMultiSiteSession || (async () => null),
        buildScheduledWatchTestVerificationItems: jest.fn(() => []),
        SCHEDULED_WATCH_TEST_SESSION_KEY: 'scheduledWatchTestSession',
        SCHEDULED_WATCH_TEST_STATUS_KEY: 'scheduledWatchTestStatus',
        SCHEDULED_WATCH_TEST_ALARM: 'scheduledWatchTestTick',
        STOCK_WATCH_SESSION_KEY: 'stockWatchSession'
    });
    return { functions, chrome, storage };
}

describe('C 定時差分検知テスト', () => {
    test('保存付き差分テストは専用アラーム経由で5ファイルの保存結果を返し、本番Cセッションへ触れない', async () => {
        const captureScheduledSnapshot = jest.fn()
            .mockResolvedValueOnce({ count: 2, matchedCount: 2, urls: ['https://example.com/a', 'https://example.com/b'] })
            .mockResolvedValueOnce({ count: 2, matchedCount: 2, urls: ['https://example.com/a', 'https://example.com/b'] });
        const saveScheduledStockBaselineArtifacts = jest.fn(async () => [
            { kind: 'baseline PNG', filename: 'test/baseline.png', downloadId: 1, success: true },
            { kind: 'baseline HTML', filename: 'test/baseline.html', downloadId: 2, success: true },
            { kind: 'baseline TXT', filename: 'test/baseline.txt', downloadId: 3, success: true }
        ]);
        const saveScheduledStockDetectionArtifacts = jest.fn(async () => [
            { kind: 'detected PNG', filename: 'test/detected.png', downloadId: 4, success: true },
            { kind: 'detected HTML', filename: 'test/detected.html', downloadId: 5, success: true }
        ]);
        const { functions, chrome, storage } = loadDiffFunctions({ captureScheduledSnapshot, saveScheduledStockBaselineArtifacts, saveScheduledStockDetectionArtifacts });

        await functions.startScheduledWatchArtifactDiffTest('c', { executionMode: 'fast' });
        expect(chrome.alarms.create).toHaveBeenCalledWith('scheduledWatchTestTick', expect.objectContaining({ when: expect.any(Number) }));
        const initial = storage.data.scheduledWatchTestSession;
        expect(initial.executionMode).toBe('fast');
        await functions.runScheduledWatchArtifactDiffTestTick(initial);

        const result = storage.data.scheduledWatchTestStatus;
        expect(result.status).toBe('success');
        expect(result.newUrls).toEqual(['https://example.com/a']);
        expect(result.verificationItems.every((item) => item.passed)).toBe(true);
        expect(result.artifacts).toHaveLength(5);
        expect(storage.data.scheduledWatchTestSession).toBeUndefined();
        expect(chrome.tabs.remove).toHaveBeenCalledWith(44);
    });

    test('実運用再現はbaseline後にdetect状態を保存し、次の専用アラームtickで終了する', async () => {
        const captureScheduledSnapshot = jest.fn()
            .mockResolvedValueOnce({ count: 2, matchedCount: 2, urls: ['https://example.com/a', 'https://example.com/b'] })
            .mockResolvedValueOnce({ count: 2, matchedCount: 2, urls: ['https://example.com/a', 'https://example.com/b'] });
        const { functions, chrome, storage } = loadDiffFunctions({ captureScheduledSnapshot });

        await functions.startScheduledWatchArtifactDiffTest('c', { executionMode: 'alarm' });
        await functions.runScheduledWatchArtifactDiffTestTick(storage.data.scheduledWatchTestSession);

        const pending = storage.data.scheduledWatchTestSession;
        expect(pending).toMatchObject({ active: true, phase: 'detect', executionMode: 'alarm' });
        expect(storage.data.scheduledWatchTestStatus).toMatchObject({ active: true, phase: 'detect' });
        expect(chrome.alarms.create).toHaveBeenCalledTimes(2);
        expect(chrome.tabs.remove).toHaveBeenCalledWith(44);

        await functions.runScheduledWatchArtifactDiffTestTick(pending);

        const result = storage.data.scheduledWatchTestStatus;
        expect(result.status).toBe('success');
        expect(result.newUrls).toEqual(['https://example.com/a']);
        expect(result.artifacts).toHaveLength(5);
        expect(storage.data.scheduledWatchTestSession).toBeUndefined();
        expect(chrome.alarms.clear).toHaveBeenCalledWith('scheduledWatchTestTick');
    });

    test('保存付き差分テストの未指定・無効な実行方式は短縮検証へ正規化する', async () => {
        const { functions, storage } = loadDiffFunctions({ captureScheduledSnapshot: async () => null });
        await functions.startScheduledWatchArtifactDiffTest('c');
        expect(storage.data.scheduledWatchTestSession.executionMode).toBe('fast');

        storage.data.scheduledWatchTestSession = undefined;
        await functions.startScheduledWatchArtifactDiffTest('c', { executionMode: 'invalid' });
        expect(storage.data.scheduledWatchTestSession.executionMode).toBe('fast');
    });
    test('初回 snapshot の URL を1件除外した専用 baseline から、再取得で newUrls を検知して終了する', async () => {
        const captureScheduledSnapshot = jest
            .fn()
            .mockResolvedValueOnce({ count: 2, matchedCount: 2, urls: ['https://example.com/a', 'https://example.com/b'] })
            .mockResolvedValueOnce({ count: 2, matchedCount: 2, urls: ['https://example.com/a', 'https://example.com/b'] });
        const { functions, chrome, storage } = loadDiffFunctions({ captureScheduledSnapshot });
        const session = {
            mode: 'multi-diff', id: 'c', name: 'Cサイト', url: 'https://example.com/list', settings: { monitorSelector: '.item' },
            active: true, phase: 'initial_snapshot', checkGmail: false
        };

        await functions.runScheduledWatchDiffTestTick(session);
        const pending = storage.data.scheduledWatchTestSession;
        expect(pending.temporaryBaselineUrls).toEqual(['https://example.com/b']);
        expect(pending.temporaryBaselineCount).toBe(1);
        expect(pending.temporaryBaselineProductCount).toBe(1);
        expect(chrome.tabs.remove).not.toHaveBeenCalled();

        await functions.runScheduledWatchDiffTestTick(pending);
        const result = storage.data.scheduledWatchTestStatus;
        expect(result.status).toBe('success');
        expect(result.newUrls).toEqual(['https://example.com/a']);
        expect(result.verificationItems.map((item) => item.label)).toEqual([
            'URL取得', 'テスト用baseline作成', '再取得', 'newUrls検知', 'Gmail 検知送信', 'テスト終了'
        ]);
        expect(result.verificationItems.every((item) => item.passed)).toBe(true);
        expect(storage.data.scheduledWatchTestSession).toBeUndefined();
        expect(chrome.tabs.remove).toHaveBeenCalledWith(44);
    });

    test('空 URL・DOM 未準備・本運用中は失敗または開始拒否にする', async () => {
        const { functions } = loadDiffFunctions({
            captureScheduledSnapshot: async () => ({ count: 0, urls: [] }),
            getMultiSiteSession: async () => ({ active: true })
        });
        await expect(functions.startScheduledWatchDiffTest('c')).rejects.toThrow('本運用中');

        const { functions: tickFunctions, storage } = loadDiffFunctions({
            captureScheduledSnapshot: async () => ({ count: 1, matchedCount: 1, urls: [] })
        });
        await tickFunctions.runScheduledWatchDiffTestTick({
            mode: 'multi-diff', id: 'c', name: 'Cサイト', url: 'https://example.com/list', settings: { monitorSelector: '.item' }, active: true, phase: 'initial_snapshot', checkGmail: false
        });
        expect(storage.data.scheduledWatchTestStatus.failureReason).toContain('URL が0件');
    });

    test('差分検知テストだけは初回ページ準備を最大30秒待機する', async () => {
        const { functions, storage } = loadDiffFunctions({ captureScheduledSnapshot: async () => null });
        await functions.startScheduledWatchDiffTest('c');
        expect(storage.data.scheduledWatchTestSession.settings).toMatchObject({ pageReadyTimeoutMs: 30000 });

        const waitForPageReady = jest.fn(async () => true);
        const { waitForScheduledWatchPageReady } = loadScriptFunctions('../../src/background/background.js', [
            'waitForScheduledWatchPageReady'
        ], { waitForPageReady });
        await waitForScheduledWatchPageReady(44, 'https://example.com/list', null, { pageReadyTimeoutMs: 30000 });
        expect(waitForPageReady).toHaveBeenCalledWith(44, { periodicReloadContext: null, maxWaitTime: 30000 });
    });

    test('Gmail OFF は既存の事前確認・送信を呼ばず、ON は事前確認未達で開始しない', async () => {
        const preflight = jest.fn(async () => ({ ready: false, reason: '設定不足' }));
        const send = jest.fn();
        const { functions } = loadDiffFunctions({ captureScheduledSnapshot: async () => null, getGmailNotificationAutoTestPreflight: preflight, notifyGmailForNewProductDetection: send });
        await functions.startScheduledWatchDiffTest('c', { checkGmail: false });
        expect(preflight).not.toHaveBeenCalled();
        expect(send).not.toHaveBeenCalled();
        const { functions: gmailFunctions } = loadDiffFunctions({
            captureScheduledSnapshot: async () => null,
            getGmailNotificationAutoTestPreflight: preflight
        });
        await expect(gmailFunctions.startScheduledWatchDiffTest('c', { checkGmail: true })).rejects.toThrow('設定不足');
        expect(preflight).toHaveBeenCalledTimes(1);
    });

    test('Gmail ON は今回の実行IDと一致する success だけを成功にする', () => {
        const { functions } = loadDiffFunctions({ captureScheduledSnapshot: async () => null });
        expect(functions.buildScheduledWatchDiffTestVerificationItems({
            initialSnapshotCount: 1, temporaryBaselineCount: 0, refetchCount: 1, newUrls: ['u'], checkGmail: true,
            gmailResult: { status: 'success', testRunId: 'current' }, completed: true
        }).find((item) => item.label === 'Gmail 検知送信')).toMatchObject({ passed: true });
        expect(functions.buildScheduledWatchDiffTestVerificationItems({ checkGmail: true, gmailResult: { status: 'success' } })
            .find((item) => item.label === 'Gmail 検知送信')).toMatchObject({ passed: false });
    });

    test('Gmail ON は検知後に既存ヘルパーを今回の実行IDで呼び、不一致は要確認にする', async () => {
        const notifyGmailForNewProductDetection = jest.fn(async () => {});
        const { functions, storage } = loadDiffFunctions({
            captureScheduledSnapshot: async () => ({ count: 2, matchedCount: 2, urls: ['https://example.com/a', 'https://example.com/b'] }),
            notifyGmailForNewProductDetection,
            getGmailNotificationAutoTestResult: async () => null
        });
        await functions.runScheduledWatchDiffTestTick({
            mode: 'multi-diff', id: 'c', name: 'Cサイト', url: 'https://example.com/list', tabId: 44,
            settings: { monitorSelector: '.item' }, active: true, phase: 'refetch', temporaryBaselineUrls: ['https://example.com/b'],
            temporaryBaselineCount: 1, checkGmail: true, gmailTestRunId: 'current-run'
        });
        expect(notifyGmailForNewProductDetection).toHaveBeenCalledWith(expect.objectContaining({
            baselineCount: 1, suppressGmailNotification: false, gmailTestRunId: 'current-run'
        }), expect.anything(), ['https://example.com/a']);
        expect(storage.data.scheduledWatchTestStatus).toMatchObject({ status: 'warning' });
        expect(storage.data.scheduledWatchTestStatus.warningReason).toContain('今回の実行ID');
    });

    test('Gmail ON はURL件数と別に商品総数ベースの baseline 件数を送信する', async () => {
        const urls = Array.from({ length: 20 }, (_, index) => `https://example.com/${index}`);
        const notifyGmailForNewProductDetection = jest.fn(async () => {});
        const { functions, storage } = loadDiffFunctions({
            captureScheduledSnapshot: jest.fn(async () => ({ count: 25, matchedCount: 25, urls })),
            notifyGmailForNewProductDetection,
            getGmailNotificationAutoTestResult: async () => ({ status: 'success', testRunId: 'current-run' })
        });
        const session = {
            mode: 'multi-diff', id: 'c', name: 'Cサイト', url: 'https://example.com/list',
            settings: { monitorSelector: '.item' }, active: true, phase: 'initial_snapshot', checkGmail: true,
            gmailTestRunId: 'current-run'
        };

        await functions.runScheduledWatchDiffTestTick(session);
        const pending = storage.data.scheduledWatchTestSession;
        expect(pending).toMatchObject({
            initialSnapshotCount: 20,
            temporaryBaselineCount: 19,
            temporaryBaselineProductCount: 24
        });

        await functions.runScheduledWatchDiffTestTick(pending);
        expect(notifyGmailForNewProductDetection).toHaveBeenCalledWith(expect.objectContaining({
            baselineCount: 24
        }), expect.objectContaining({ count: 25 }), [urls[0]]);
    });

    test('親tickは初回差分テスト後に、次tick用のアラームとsessionを削除しない', async () => {
        const session = { mode: 'multi-diff', active: true };
        const chrome = {
            storage: {
                local: {
                    get: jest.fn(async () => ({ scheduledWatchTestSession: session })),
                    remove: jest.fn(async () => {})
                }
            },
            alarms: { clear: jest.fn(async () => {}) }
        };
        const runScheduledWatchDiffTestTick = jest.fn(async () => {});
        const { runScheduledWatchTestTick } = loadScriptFunctions('../../src/background/background.js', [
            'runScheduledWatchTestTick'
        ], {
            chrome,
            SCHEDULED_WATCH_TEST_SESSION_KEY: 'scheduledWatchTestSession',
            SCHEDULED_WATCH_TEST_STATUS_KEY: 'scheduledWatchTestStatus',
            SCHEDULED_WATCH_TEST_ALARM: 'scheduledWatchTestTick',
            runScheduledWatchDiffTestTick,
            bgLogDebug: jest.fn()
        });

        await runScheduledWatchTestTick();

        expect(runScheduledWatchDiffTestTick).toHaveBeenCalledWith(session);
        expect(chrome.alarms.clear).not.toHaveBeenCalled();
        expect(chrome.storage.local.remove).not.toHaveBeenCalled();
    });

    test('親tickは保存付き差分テストのbaseline後にも、次tick用のアラームとsessionを削除しない', async () => {
        const session = { mode: 'multi-artifact-diff', active: true, phase: 'baseline', executionMode: 'alarm' };
        const chrome = {
            storage: {
                local: {
                    get: jest.fn(async () => ({ scheduledWatchTestSession: session })),
                    remove: jest.fn(async () => {})
                }
            },
            alarms: { clear: jest.fn(async () => {}) }
        };
        const runScheduledWatchArtifactDiffTestTick = jest.fn(async () => {});
        const { runScheduledWatchTestTick } = loadScriptFunctions('../../src/background/background.js', [
            'runScheduledWatchTestTick'
        ], {
            chrome,
            SCHEDULED_WATCH_TEST_SESSION_KEY: 'scheduledWatchTestSession',
            SCHEDULED_WATCH_TEST_STATUS_KEY: 'scheduledWatchTestStatus',
            SCHEDULED_WATCH_TEST_ALARM: 'scheduledWatchTestTick',
            runScheduledWatchArtifactDiffTestTick,
            bgLogDebug: jest.fn()
        });

        await runScheduledWatchTestTick();

        expect(runScheduledWatchArtifactDiffTestTick).toHaveBeenCalledWith(session);
        expect(chrome.alarms.clear).not.toHaveBeenCalled();
        expect(chrome.storage.local.remove).not.toHaveBeenCalled();
    });
});

describe('B/C 定時商品取得テスト', () => {
    test('B/C ともに Gmail検知送信を抑止して商品取得確認だけを開始する', async () => {
        const { functions, storage } = loadSingleSafetyTestFunctions();

        await expect(functions.startScheduledWatchTest('single')).resolves.toMatchObject({
            started: true,
            target: { mode: 'single', id: 'single', name: '単一サイト定時検証' }
        });
        expect(storage.data.scheduledWatchTestSession).toMatchObject({
            mode: 'single',
            suppressGmailNotification: true,
            settings: { monitorSelector: '' }
        });

        const { functions: multiFunctions, storage: multiStorage } = loadSingleSafetyTestFunctions();
        await expect(multiFunctions.startScheduledWatchTest('multi', 'c')).resolves.toMatchObject({
            started: true,
            target: { mode: 'multi', id: 'c', name: 'Cサイト' }
        });
        expect(multiStorage.data.scheduledWatchTestSession).toMatchObject({
            mode: 'multi',
            suppressGmailNotification: true,
            settings: { monitorSelector: '.item', itemCountSelector: '.count' }
        });
    });
});
