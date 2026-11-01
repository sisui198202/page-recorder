const { loadScriptFunctions } = require('../helpers/load-source-functions');
const fs = require('fs');
const path = require('path');

const gmailFunctionNames = [
    'normalizeGmailNotificationSettings',
    'isValidGmailRecipientEmail',
    'encodeUtf8Base64',
    'encodeBase64Url',
    'encodeRfc2047Subject',
    'buildGmailRawMessage',
    'resolveGmailDetectionSiteName',
    'buildGmailDetectionEmail',
    'isMultipleGmailTestEvent',
    'recordMultipleGmailTestOutcome',
    'finalizeGmailNotification',
    'loadGmailNotificationSettings',
    'saveGmailNotificationLastResult',
    'saveGmailNotificationTestVerification',
    'getGmailNotificationAutoTestPreflight',
    'getGmailAuthToken',
    'sendGmailNotification'
];

function loadGmailFunctions(overrides = {}) {
    const storage = {};
    const chrome = {
        storage: {
            local: {
                get: jest.fn(async (key) => ({ [key]: storage[key] })),
                set: jest.fn(async (value) => Object.assign(storage, value))
            },
            session: {
                get: jest.fn(async (key) => ({ [key]: storage[key] })),
                set: jest.fn(async (value) => Object.assign(storage, value))
            }
        },
        runtime: { lastError: null },
        identity: {
            getAuthToken: jest.fn((_options, callback) => callback('test-token'))
        }
    };
    const functions = loadScriptFunctions('../../src/background/background.js', gmailFunctionNames, {
        chrome,
        TextEncoder,
        btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
        fetch: jest.fn(async () => ({ ok: true, status: 200 })),
        bgLogInfo: jest.fn(),
        bgLogWarn: jest.fn(),
        GMAIL_NOTIFICATION_SETTINGS_KEY: 'gmailNotificationSettings',
        GMAIL_NOTIFICATION_LAST_RESULT_KEY: 'gmailNotificationLastResult',
        GMAIL_NOTIFICATION_TEST_VERIFICATION_KEY: 'gmailNotificationTestVerification',
        MULTIPLE_GMAIL_TEST_STATUS_STORAGE_KEY: 'multipleGmailTestStatus',
        GMAIL_SEND_ENDPOINT: 'https://www.googleapis.com/gmail/v1/users/me/messages/send',
        ...overrides
    });
    return { functions, chrome, storage };
}

describe('Gmail 通知基盤', () => {
    test('multiple Gmail 結果は設定IDを重複なく集計し、期待件数で合格する', async () => {
        const { functions, storage } = loadGmailFunctions();
        storage.multipleGmailTestStatus = {
            gmailTestRunId: 'run-1', expectedCount: 2, successConfigIds: [], status: 'running', active: true
        };
        const first = { testRunId: 'run-1', gmailTestConfigId: 'config-a' };
        await functions.recordMultipleGmailTestOutcome(first, { status: 'success' });
        await functions.recordMultipleGmailTestOutcome(first, { status: 'success' });
        expect(storage.multipleGmailTestStatus.successConfigIds).toEqual(['config-a']);
        await functions.recordMultipleGmailTestOutcome(
            { testRunId: 'run-1', gmailTestConfigId: 'config-b' }, { status: 'success' }
        );
        expect(storage.multipleGmailTestStatus).toMatchObject({
            successConfigIds: ['config-a', 'config-b'], status: 'passed', active: false
        });
    });

    test('multiple Gmail の認証失敗は理由付きで要確認にする', async () => {
        const { functions, storage } = loadGmailFunctions();
        storage.multipleGmailTestStatus = {
            gmailTestRunId: 'run-2', expectedCount: 1, successConfigIds: [], status: 'running', active: true
        };
        await functions.recordMultipleGmailTestOutcome(
            { testRunId: 'run-2', gmailTestConfigId: 'config-a' },
            { status: 'auth_required', message: 'Gmail の認証が必要です' }
        );
        expect(storage.multipleGmailTestStatus).toMatchObject({
            status: 'needs_review', active: false, failureReason: 'Gmail の認証が必要です'
        });
    });
    test('設定を安全な既定値へ正規化し、送信先を検証できる', () => {
        const { functions } = loadGmailFunctions();
        expect(functions.normalizeGmailNotificationSettings()).toEqual({ enabled: false, recipientEmail: '' });
        expect(functions.normalizeGmailNotificationSettings({ enabled: true, recipientEmail: ' user@example.com ' }))
            .toEqual({ enabled: true, recipientEmail: 'user@example.com' });
        expect(functions.isValidGmailRecipientEmail('user@example.com')).toBe(true);
        expect(functions.isValidGmailRecipientEmail('invalid-address')).toBe(false);
    });

    test('日本語件名を RFC 2047 と Base64URL MIME にエンコードする', () => {
        const { functions } = loadGmailFunctions();
        const subject = functions.encodeRfc2047Subject('新商品を検知');
        const raw = functions.buildGmailRawMessage({
            recipientEmail: 'user@example.com',
            subject: '新商品を検知',
            body: '本文です'
        });
        expect(subject).toMatch(/^=\?UTF-8\?B\?.+\?=$/);
        expect(raw).not.toMatch(/[+/=]/);
        const mime = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        expect(mime).toContain('To: user@example.com');
        expect(mime).toContain(`Subject: ${subject}`);
    });

    test('検知メールに必要情報と新規 URL の上限を含める', () => {
        const { functions } = loadGmailFunctions();
        const email = functions.buildGmailDetectionEmail({
            type: 'new_product_url',
            siteName: 'テスト店',
            targetUrl: 'https://example.com/list',
            previousCount: 2,
            currentCount: 14,
            newUrls: Array.from({ length: 11 }, (_, index) => `https://example.com/${index}`),
            occurredAt: '2026/09/12 09:00:00'
        });
        expect(email.subject).toContain('テスト店');
        expect(email.body).toContain('日時: 2026/09/12 09:00:00');
        expect(email.body).toContain('増加件数: 2件 → 14件');
        expect(email.body).toContain('他 1 件');
        expect(email.body).not.toContain('https://example.com/10');
    });

    test('テスト送信は interactive 認証で Gmail API の成功結果を保存する', async () => {
        const fetch = jest.fn(async () => ({ ok: true, status: 200 }));
        const { functions, chrome, storage } = loadGmailFunctions({ fetch });
        const result = await functions.sendGmailNotification({
            source: 'test',
            interactive: true,
            settings: { enabled: false, recipientEmail: 'user@example.com' },
            event: { type: 'test' }
        });
        expect(result).toMatchObject({ success: true, status: 'success', source: 'test' });
        expect(chrome.identity.getAuthToken).toHaveBeenCalledWith({ interactive: true }, expect.any(Function));
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(storage.gmailNotificationLastResult).toMatchObject({ status: 'success', source: 'test' });
        expect(storage.gmailNotificationTestVerification).toMatchObject({
            enabled: false, recipientEmail: 'user@example.com'
        });
    });

    test('テストメール成功後は検知送信が直近結果を更新しても開始前確認を維持する', async () => {
        const { functions, storage } = loadGmailFunctions();
        storage.gmailNotificationSettings = { enabled: true, recipientEmail: 'user@example.com' };
        await functions.sendGmailNotification({
            source: 'test',
            interactive: true,
            settings: { enabled: true, recipientEmail: 'user@example.com' },
            event: { type: 'test' }
        });
        await functions.sendGmailNotification({
            source: 'detection',
            settings: { enabled: true, recipientEmail: 'user@example.com' },
            event: { type: 'keyword', testRunId: 'single-8' }
        });

        expect(storage.gmailNotificationLastResult).toMatchObject({ source: 'detection', status: 'success' });
        await expect(functions.getGmailNotificationAutoTestPreflight()).resolves.toEqual({ ready: true });
    });

    test('送信先または有効状態がテストメール成功時から変わると開始前確認を拒否する', async () => {
        const { functions, storage } = loadGmailFunctions();
        storage.gmailNotificationSettings = { enabled: true, recipientEmail: 'new@example.com' };
        storage.gmailNotificationTestVerification = {
            enabled: true, recipientEmail: 'user@example.com', verifiedAt: '2026-09-20T00:00:00.000Z'
        };

        await expect(functions.getGmailNotificationAutoTestPreflight()).resolves.toEqual(
            expect.objectContaining({ ready: false, reason: expect.stringContaining('テストメール送信') })
        );
    });

    test('検知送信結果には任意のテスト実行IDだけを保存し、今回の送信を照合できる', async () => {
        const { functions, storage } = loadGmailFunctions();
        const result = await functions.sendGmailNotification({
            source: 'detection',
            settings: { enabled: true, recipientEmail: 'user@example.com' },
            event: { type: 'keyword', testRunId: 'gmail-run-123' }
        });
        expect(result).toMatchObject({ success: true, status: 'success', testRunId: 'gmail-run-123' });
        expect(storage.gmailNotificationLastResult).toMatchObject({
            source: 'detection', status: 'success', testRunId: 'gmail-run-123'
        });
        expect(storage.gmailNotificationLastResult).not.toHaveProperty('recipientEmail');
    });

    test('本番検知は認証失敗を結果化し、API 送信を行わない', async () => {
        const fetch = jest.fn();
        const { functions, chrome, storage } = loadGmailFunctions({ fetch });
        chrome.identity.getAuthToken.mockImplementation((_options, callback) => {
            chrome.runtime.lastError = { message: 'login required' };
            callback(null);
            chrome.runtime.lastError = null;
        });
        const result = await functions.sendGmailNotification({
            source: 'detection',
            settings: { enabled: true, recipientEmail: 'user@example.com' },
            event: { type: 'keyword' }
        });
        expect(result).toMatchObject({ success: false, status: 'auth_required', source: 'detection' });
        expect(chrome.identity.getAuthToken).toHaveBeenCalledWith({ interactive: false }, expect.any(Function));
        expect(fetch).not.toHaveBeenCalled();
        expect(storage.gmailNotificationLastResult).toMatchObject({ status: 'auth_required' });
    });

    test('Gmail API 失敗は api_error として保存し、呼出元へ例外を返さない', async () => {
        const { functions, storage } = loadGmailFunctions({
            fetch: jest.fn(async () => ({ ok: false, status: 500 }))
        });
        const result = await functions.sendGmailNotification({
            source: 'detection',
            settings: { enabled: true, recipientEmail: 'user@example.com' },
            event: { type: 'keyword', targetUrl: 'https://example.com' }
        });
        expect(result).toMatchObject({ success: false, status: 'api_error', source: 'detection' });
        expect(storage.gmailNotificationLastResult).toMatchObject({ status: 'api_error' });
    });

    test('無効設定またはテスト抑止では本番 Gmail API を呼ばない', async () => {
        const fetch = jest.fn();
        const { functions, chrome } = loadGmailFunctions({ fetch });
        await functions.sendGmailNotification({
            source: 'detection',
            settings: { enabled: false, recipientEmail: 'user@example.com' },
            event: { type: 'keyword' }
        });
        await functions.sendGmailNotification({
            source: 'detection',
            settings: { enabled: true, recipientEmail: 'user@example.com' },
            event: { type: 'keyword', suppressGmailNotification: true }
        });
        expect(chrome.identity.getAuthToken).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    test('A と B/C 用の共通通知ラッパーは検知ごとに 1 回だけ送信要求を作る', async () => {
        const sendGmailNotification = jest.fn(async () => ({ success: true }));
        const { createGmailKeywordDetectionEvent, notifyGmailForKeywordDetection, notifyGmailForNewProductDetection } = loadScriptFunctions(
            '../../src/background/background.js',
            [
                'createGmailKeywordDetectionEvent',
                'notifyGmailForKeywordDetection',
                'notifyGmailForNewProductDetection'
            ],
            { sendGmailNotification }
        );
        await notifyGmailForKeywordDetection(
            { monitorKeyword: '在庫あり', detectMode: 'appear', suppressGmailNotification: true },
            'https://example.com/a',
            'Aサイト'
        );
        await notifyGmailForNewProductDetection(
            { siteName: 'B/Cサイト', targetUrl: 'https://example.com/list', baselineCount: 24 },
            { count: 25 },
            ['https://example.com/new']
        );
        expect(createGmailKeywordDetectionEvent({ keyword: '在庫あり' }).keyword).toBe('在庫あり');
        expect(sendGmailNotification).toHaveBeenCalledTimes(2);
        expect(sendGmailNotification).toHaveBeenNthCalledWith(1, expect.objectContaining({
            source: 'detection',
            event: expect.objectContaining({ type: 'keyword', suppressGmailNotification: true })
        }));
        expect(sendGmailNotification).toHaveBeenNthCalledWith(2, expect.objectContaining({
            source: 'detection',
            event: expect.objectContaining({ type: 'new_product_url', previousCount: 24, currentCount: 25 })
        }));
    });

    test('A 単一・複数と B/C の検知経路だけが共通通知ラッパーを呼ぶ', () => {
        const source = fs.readFileSync(path.resolve(__dirname, '../../src/background/background.js'), 'utf8');
        // 系統Aは単一・複数とも永続セッション経路だけになり、定義と呼び出しの2か所になった。
        expect((source.match(/\bnotifyGmailForKeywordDetection\(/g) || [])).toHaveLength(2);
        expect((source.match(/await notifyGmailForNewProductDetection\(/g) || [])).toHaveLength(3);
        expect(source).toContain('suppressGmailNotification: isMultipleTestSession');
        expect(source).toContain('suppressGmailNotification: true');
        expect(source).toContain('async function runScheduledWatchDiffTestTick(session)');
        expect(source).toContain('gmailTestRunId: session.gmailTestRunId');
    });

    test('Gmail シナリオだけ Gmail 抑止なしで実行IDを検知イベントへ渡す', () => {
        const source = fs.readFileSync(path.resolve(__dirname, '../../src/background/background.js'), 'utf8');
        const helpers = fs.readFileSync(path.resolve(__dirname, '../../src/background/lib/stock-helpers.js'), 'utf8');
        expect(helpers).toMatch(/gmail_notification_check: \{[^}]*requiresGmail: true/);
        expect(source).toContain('suppressGmailNotification: !run.requiresGmail,');
        expect(source).toContain('const gmailTestRunId = run.requiresGmail ? `gmail-${runId}` : "";');
        expect(source).toContain('gmailTestRunId: settings.gmailTestRunId,');
        expect(source).toContain('testRunId: settings.gmailTestRunId || ""');
    });
});

describe('テストタブの Gmail シナリオの送信結果', () => {
    const createSessionStorage = (value) => {
        let stored = value;
        return {
            get: jest.fn(async () => ({ multipleGmailTestStatus: stored })),
            set: jest.fn(async (next) => { stored = next.multipleGmailTestStatus; })
        };
    };
    const load = (session) => loadScriptFunctions('../../src/background/background.js', [
        'waitForTestTabGmailResult'
    ], {
        chrome: { storage: { session } },
        MULTIPLE_GMAIL_TEST_STATUS_STORAGE_KEY: 'multipleGmailTestStatus',
        TEST_TAB_GMAIL_RESULT_WAIT_MS: 50,
        setTimeout: (callback) => callback()
    });

    test('期待件数ぶんの送信成功がそろえば成功を返す', async () => {
        const session = createSessionStorage({
            gmailTestRunId: 'gmail-run-1', expectedCount: 2, successConfigIds: ['a', 'b'], status: 'passed'
        });
        const { waitForTestTabGmailResult } = load(session);

        await expect(waitForTestTabGmailResult('gmail-run-1')).resolves.toEqual({ status: 'success', successCount: 2, expectedCount: 2 });
    });

    test('送信失敗が記録されたら失敗理由を返す', async () => {
        const session = createSessionStorage({
            gmailTestRunId: 'gmail-run-1', expectedCount: 2, successConfigIds: ['a'], status: 'needs_review', failureReason: '認証が必要です'
        });
        const { waitForTestTabGmailResult } = load(session);

        await expect(waitForTestTabGmailResult('gmail-run-1')).resolves.toEqual({
            status: 'needs_review', successCount: 1, expectedCount: 2, message: '認証が必要です'
        });
    });

    test('待ち時間内に期待件数がそろわなければ件数とともに未確認を返す', async () => {
        const session = createSessionStorage({
            gmailTestRunId: 'gmail-run-1', expectedCount: 2, successConfigIds: ['a'], status: 'running'
        });
        const { waitForTestTabGmailResult } = load(session);

        await expect(waitForTestTabGmailResult('gmail-run-1')).resolves.toEqual({
            status: 'not_found', successCount: 1, expectedCount: 2
        });
    });
});
