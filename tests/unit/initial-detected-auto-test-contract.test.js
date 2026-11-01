const fs = require('fs');
const path = require('path');
const { loadScriptFunctions } = require('../helpers/load-source-functions');

describe('開始直後に検知する自動判定の契約', () => {
    const backgroundSource = fs.readFileSync(
        path.resolve(__dirname, '../../src/background/background.js'),
        'utf8'
    );
    const popupSource = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/popup.js'),
        'utf8'
    );
    const popupHtml = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/popup.html'),
        'utf8'
    );

    test('popup は自動判定対応表示と実行中だけのポーリングを備える', () => {
        expect(popupHtml).toContain('id="initialDetectedAutoTestStatus"');
        expect(popupSource).toContain('supportsAutoJudgement: true');
        expect(popupSource).toContain("if (!test?.active) stopInitialDetectedAutoTestPolling()");
        expect(popupSource).toContain("status: 'needs_review'");
    });

    test('single の全9シナリオは自動判定対応を維持し、選択肢にバッジを表示しない', () => {
        const expectedLabels = [
            '1. テスト用キーワードの出現を確認する',
            '2. 売り切れ表示が消えることを確認する',
            '3. 在庫ありページで開始直後に一致',
            '4. テスト用キーワードで開始直後は不一致',
            '5. 空キーワード設定の反映と開始前バリデーション確認',
            '6. 異常系: 一致要素なしで error 確認',
            '7. 異常系: 無効セレクタで error 確認',
            '8. Gmail 検知通知: 検知 → メール送信確認',
            '9. 共有Chrome通知を表示する'
        ];

        expectedLabels.forEach((label) => {
            expect(popupHtml).toContain(label);
            expect(popupSource).toContain(`label: '${label}'`);
        });
        expect((popupHtml.match(/【自動判定対応】/g) || [])).toHaveLength(0);
        expect((popupSource.match(/【自動判定対応】/g) || [])).toHaveLength(0);
        expect((popupSource.match(/supportsAutoJudgement: true/g) || [])).toHaveLength(9);
        expect(popupSource).toContain("action: 'startSingleIntegrationAutoTest'");
        expect(backgroundSource).toContain('case "startSingleIntegrationAutoTest"');
        // 監視を使うシナリオは startTestTabScenario（本番経路）で実行し、旧自動テストには共有Chrome通知だけが残る。
        expect(backgroundSource).toContain('const SINGLE_INTEGRATION_AUTO_TEST_SCENARIOS = {\n  chrome_notification_check: { action: "chrome_notification" },\n};');
        expect(backgroundSource).toContain('case "startTestTabScenario"');
    });

    test('シナリオ8は設定・テスト送信成功を確認してから通常監視を開始し、今回のGmail結果だけを判定する', async () => {
        const storage = {
            gmailNotificationSettings: { enabled: true, recipientEmail: 'user@example.com' },
            gmailNotificationLastResult: { source: 'test', status: 'success' },
            gmailNotificationTestVerification: { enabled: true, recipientEmail: 'user@example.com' }
        };
        const chrome = { storage: { local: { get: jest.fn(async (key) => ({ [key]: storage[key] })) } } };
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'getGmailNotificationAutoTestPreflight',
            'getGmailNotificationAutoTestResult'
        ], {
            chrome,
            loadGmailNotificationSettings: async () => storage.gmailNotificationSettings,
            isValidGmailRecipientEmail: (email) => email === 'user@example.com',
            GMAIL_NOTIFICATION_LAST_RESULT_KEY: 'gmailNotificationLastResult',
            GMAIL_NOTIFICATION_TEST_VERIFICATION_KEY: 'gmailNotificationTestVerification'
        });
        await expect(functions.getGmailNotificationAutoTestPreflight()).resolves.toEqual({ ready: true });

        storage.gmailNotificationSettings = { enabled: false, recipientEmail: 'user@example.com' };
        await expect(functions.getGmailNotificationAutoTestPreflight()).resolves.toEqual(
            expect.objectContaining({ ready: false, reason: expect.stringContaining('有効') })
        );
        storage.gmailNotificationSettings = { enabled: true, recipientEmail: 'user@example.com' };

        storage.gmailNotificationLastResult = { source: 'detection', status: 'success', testRunId: 'current-run' };
        await expect(functions.getGmailNotificationAutoTestResult('current-run')).resolves.toEqual(
            storage.gmailNotificationLastResult
        );
        await expect(functions.getGmailNotificationAutoTestResult('old-run')).resolves.toBeNull();
        expect(backgroundSource).toContain('Gmail 検知送信');
        expect(backgroundSource).toContain('テストメール送信を成功させて Gmail の認証と設定を確認してください。');
    });

    test('通常監視の開始・停止は共通関数を直接呼び、Service Worker 自己メッセージを使わない', () => {
        expect(backgroundSource).toContain('async function startSingleMonitoring(settings, requestTabId, { allowTestTiming = false } = {})');
        expect(backgroundSource).toContain('async function stopSingleMonitoring(tabId)');
        expect(backgroundSource).toContain('sendResponse(await startSingleMonitoring(request.settings, request.tabId));');
        expect(backgroundSource).toContain('sendResponse(await stopSingleMonitoring(request.tabId));');

        const testTabStart = backgroundSource.indexOf('async function startTestTabScenario(');
        const testTabEnd = backgroundSource.indexOf('async function stopTestTabScenario(', testTabStart);
        const testTabSource = backgroundSource.slice(testTabStart, testTabEnd);
        // テストタブのシナリオも、本番と同じ開始関数を直接呼ぶ。
        expect(testTabSource).toContain('await startSingleMonitoring(');
        expect(testTabSource).toContain('await runMultipleMonitoringStartConfigs(');
        expect(testTabSource).not.toContain('chrome.runtime.sendMessage');
        expect(backgroundSource).not.toContain('function sendInternalRuntimeMessage');
        // テストも本番と同じ設定範囲で動かすため、設定範囲の検証は常に行う。
        expect(backgroundSource).toContain('// テストも本番と同じ設定範囲で動かすため、常に検証する。\nconst monitoringModeValidationError = validateMonitoringModeSettings(settings);');
    });

    test('popup の空キーワード検証は開始 message の前に共通の純粋関数で拒否する', () => {
        const { validateSingleMonitoringSettings } = loadScriptFunctions(
            '../../src/ui/popup.js',
            ['validateSingleMonitoringSettings']
        );
        expect(validateSingleMonitoringSettings({
            monitorType: 'url', targetUrl: 'https://example.com/', monitorKeyword: ''
        })).toBe('監視キーワードを入力してください');
        expect(validateSingleMonitoringSettings({
            monitorType: 'url', targetUrl: 'https://example.com/', monitorKeyword: '在庫あり'
        })).toBeNull();
        expect(popupSource).toContain("const validationError = validateSingleMonitoringSettings(settings);");
        expect(popupSource).toContain("selectedScenario.id === 'keyword_missing_check'");
        expect(popupSource).toContain('await completeKeywordMissingAutoTest();');
    });

    test('シナリオ5は開始前バリデーション後にbackgroundで完了状態・ログ・実通知を記録する', async () => {
        const log = jest.fn();
        const setStatus = jest.fn(async () => {});
        const notify = jest.fn(async (status) => {
            status.notification = { status: 'created' };
        });
        const { completeKeywordMissingAutoTest } = loadScriptFunctions(
            '../../src/background/background.js',
            ['completeKeywordMissingAutoTest'],
            {
                createInitialDetectedAutoTestStatus: (overrides) => ({
                    status: 'running', active: true, ...overrides
                }),
                setInitialDetectedAutoTestStatus: setStatus,
                writeSingleIntegrationAutoTestLog: log,
                notifyInitialDetectedAutoTestCompleted: notify
            }
        );

        const status = await completeKeywordMissingAutoTest();

        expect(status).toMatchObject({
            scenarioId: 'keyword_missing_check',
            status: 'passed',
            active: false,
            checks: { validationRejected: true, monitoringNotStarted: true },
            notification: { status: 'created' }
        });
        expect(status.runId).toMatch(/^single-keyword_missing_check-/);
        expect(setStatus).toHaveBeenCalledWith(status);
        expect(log).toHaveBeenCalledWith(
            `✅ [${status.runId}] 空キーワード開始前バリデーション確認`,
            { runId: status.runId, scenarioId: 'keyword_missing_check' }
        );
        expect(notify).toHaveBeenCalledWith(status);

        const functionStart = backgroundSource.indexOf('async function completeKeywordMissingAutoTest()');
        const functionEnd = backgroundSource.indexOf('function writeSingleIntegrationAutoTestLog(', functionStart);
        const functionSource = backgroundSource.slice(functionStart, functionEnd);
        expect(functionSource).not.toContain('startSingleMonitoring(');
        expect(functionSource).not.toContain('chrome.tabs.create');
        expect(functionSource).not.toContain('configManager.saveConfig');
        expect(backgroundSource).toContain('case "completeKeywordMissingAutoTest"');
        expect(popupSource).toContain("action: 'completeKeywordMissingAutoTest'");
        expect(popupSource).not.toContain("notification: { status: 'created' }");
    });

    test('session 状態は判定理由と確認項目を持ち、シナリオ6/7は期待したエラー種別だけを成功として示す', () => {
        const { buildInitialDetectedAutoTestEvidence } = loadScriptFunctions(
            '../../src/background/background.js',
            ['buildInitialDetectedAutoTestEvidence'],
            {
                SINGLE_INTEGRATION_AUTO_TEST_SCENARIOS: {
                    element_not_found_check: { expectedErrorReason: 'element_not_found' },
                    pending_error_check: { expectedErrorReason: 'selector_syntax_error' }
                }
            }
        );
        const commonChecks = {
            monitoringStopped: true,
            configRestored: true,
            tabClosed: true,
            errorTypeMatched: true,
            errorStopCompleted: true
        };

        const scenario6 = buildInitialDetectedAutoTestEvidence({
            scenarioId: 'element_not_found_check', status: 'passed', checks: commonChecks,
            checkSummary: 'element_not_found を確認しました。'
        });
        expect(scenario6.decisionReason).toBe('element_not_found を確認しました。');
        expect(scenario6.verificationItems).toEqual(expect.arrayContaining([
            expect.objectContaining({ label: '期待エラー種別', passed: true, reason: 'decision: error / element_not_found を確認' }),
            expect.objectContaining({ label: '安全な停止', passed: true })
        ]));

        const scenario7Failure = buildInitialDetectedAutoTestEvidence({
            scenarioId: 'pending_error_check', status: 'failed', checks: {
                ...commonChecks, errorTypeMatched: false
            }, failureReason: '期待したエラー種別を確認できませんでした: selector_syntax_error'
        });
        expect(scenario7Failure.decisionReason).toContain('selector_syntax_error');
        expect(scenario7Failure.verificationItems[0]).toEqual(expect.objectContaining({
            label: '期待エラー種別', passed: false,
            reason: 'decision: error / selector_syntax_error を確認できていない'
        }));

        const notificationScenario = buildInitialDetectedAutoTestEvidence({
            scenarioId: 'chrome_notification_check', status: 'passed', checks: {
                sharedNotificationShown: true,
                noMonitoringStarted: true,
                noGmailNotification: true,
                noExternalNotification: true
            },
            checkSummary: '共有Chrome通知を表示しました。'
        });
        expect(notificationScenario.verificationItems).toEqual([
            expect.objectContaining({ label: '共有Chrome通知', passed: true }),
            expect.objectContaining({ label: '通常監視未開始', passed: true }),
            expect.objectContaining({ label: 'Gmail未送信', passed: true }),
            expect.objectContaining({ label: '外部拡張未送信', passed: true })
        ]);
    });

    test('共有Chrome通知シナリオは通常監視用のfinally処理と完了通知を実行しない', () => {
        const runnerStart = backgroundSource.indexOf('async function runSingleIntegrationAutoTest(scenarioId)');
        const runnerEnd = backgroundSource.indexOf('async function startSingleIntegrationAutoTest(scenarioId)');
        const runnerSource = backgroundSource.slice(runnerStart, runnerEnd);
        // 監視を使うシナリオはテストタブの本番経路へ移ったため、ここは共有Chrome通知だけを扱う。
        expect(runnerSource).toContain('await showInventoryDetectionNotification({');
        expect(runnerSource).toContain('noMonitoringStarted: true');
        expect(runnerSource).toContain('return status;');
        expect(runnerSource).not.toContain('startSingleMonitoring(');
        expect(runnerSource).not.toContain('finally {');
        expect(runnerSource).not.toContain('notifyInitialDetectedAutoTestCompleted');
    });

    test('popup は結果カードで合格理由または判定理由と全確認項目を session 復元値から表示する', () => {
        expect(popupSource).toContain("const reasonLabel = test.status === 'passed' ? '合格理由' : '判定理由';");
        expect(popupHtml).toContain('width: 420px;');
        expect(popupHtml).toContain('.auto-test-result-card');
        expect(popupHtml).toContain('.auto-test-verification-item.is-pending');
        expect(popupSource).toContain('test.verificationItems');
        expect(popupSource).toContain('orderInitialDetectedVerificationItems(verificationItems, test.status)');
        expect(popupSource).toContain("item?.passed === true ? '✓' : itemStatus === 'pending' ? '–' : '!'");
        expect(popupSource).toContain('container.replaceChildren();');
    });

    test('未達項目は不合格・要確認・実行中で先頭にし、合格時は確認項目の順序を維持する', () => {
        const { orderInitialDetectedVerificationItems } = loadScriptFunctions(
            '../../src/ui/popup.js',
            ['orderInitialDetectedVerificationItems']
        );
        const items = [
            { label: '完了済み', passed: true },
            { label: '未達1', passed: false },
            { label: '未達2', passed: false }
        ];

        expect(orderInitialDetectedVerificationItems(items, 'failed').map((item) => item.label)).toEqual([
            '未達1', '未達2', '完了済み'
        ]);
        expect(orderInitialDetectedVerificationItems(items, 'needs_review').map((item) => item.label)).toEqual([
            '未達1', '未達2', '完了済み'
        ]);
        expect(orderInitialDetectedVerificationItems(items, 'running').map((item) => item.label)).toEqual([
            '未達1', '未達2', '完了済み'
        ]);
        expect(orderInitialDetectedVerificationItems(items, 'passed')).toEqual(items);
    });

    test.each([
        ['passed', false, 'status-passed'],
        ['failed', false, 'status-failed'],
        ['needs_review', false, 'status-needs-review'],
        ['running', true, 'status-running']
    ])('結果カードは %s のバッジ・確認項目・通知状態を分離して描画する', (status, active, expectedClass) => {
        const createElement = () => ({
            className: '',
            textContent: '',
            children: [],
            append(...nodes) { this.children.push(...nodes); },
            replaceChildren(...nodes) { this.children = [...nodes]; }
        });
        const container = createElement();
        const { renderInitialDetectedAutoTestStatus } = loadScriptFunctions(
            '../../src/ui/popup.js',
            ['resolveInitialDetectedNotificationDisplay', 'resolveInitialDetectedAutoTestStatusPresentation',
                'orderInitialDetectedVerificationItems', 'renderInitialDetectedAutoTestStatus'],
            {
                elements: { initialDetectedAutoTestStatus: container },
                document: { createElement }
            }
        );

        renderInitialDetectedAutoTestStatus({
            status,
            active,
            decisionReason: '判定の根拠です。',
            verificationItems: [
                { label: '完了済み', passed: true, reason: '確認済み' },
                { label: '未達項目', passed: false, reason: '確認中または未達' }
            ],
            notification: { status: 'created' }
        });

        expect(container.className).toContain(expectedClass);
        expect(container.children).toHaveLength(active ? 4 : 5);
        const verificationList = container.children[3];
        expect(verificationList.children).toHaveLength(2);
        if (status === 'passed') {
            expect(verificationList.children[0].children[1].textContent).toBe('完了済み');
        } else {
            expect(verificationList.children[0].children[1].textContent).toBe('未達項目');
        }
        if (!active) {
            expect(container.children[4].textContent).toBe('完了通知: 送信済み');
        }
    });

    test('状態を session storage に保存し、メモリ消失後は保存済み状態を返す', async () => {
        const session = {
            set: jest.fn(async () => {}),
            get: jest.fn(async () => ({
                initialDetectedAutoTestStatus: { status: 'passed', active: false }
            }))
        };
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'setInitialDetectedAutoTestStatus',
            'getStoredInitialDetectedAutoTestStatus'
        ], {
            chrome: { storage: { session } },
            initialDetectedAutoTestStatus: null,
            INITIAL_DETECTED_AUTO_TEST_STATUS_STORAGE_KEY: 'initialDetectedAutoTestStatus',
            INITIAL_DETECTED_AUTO_TEST_SCENARIO_ID: 'initial_detected'
        });

        const running = { status: 'running', active: true };
        await functions.setInitialDetectedAutoTestStatus(running);
        expect(session.set).toHaveBeenCalledWith({ initialDetectedAutoTestStatus: running });

        // Service Worker 再起動を模擬するため、別コンテキストで取得する。
        const restored = loadScriptFunctions('../../src/background/background.js', [
            'getStoredInitialDetectedAutoTestStatus'
        ], {
            chrome: { storage: { session } },
            initialDetectedAutoTestStatus: null,
            INITIAL_DETECTED_AUTO_TEST_STATUS_STORAGE_KEY: 'initialDetectedAutoTestStatus',
            INITIAL_DETECTED_AUTO_TEST_SCENARIO_ID: 'initial_detected'
        });
        await expect(restored.getStoredInitialDetectedAutoTestStatus()).resolves.toEqual({
            status: 'passed', active: false
        });
    });

    test.each([
        ['passed', null, '結果: 合格'],
        ['failed', 'DOM再現に失敗しました', '結果: 不合格（DOM再現に失敗しました）'],
        ['needs_review', 'タイムアウトしました', '結果: 要確認（タイムアウトしました）']
    ])('完了通知は %s の結果と理由を同一IDで作成する', (status, failureReason, message) => {
        const { buildInitialDetectedAutoTestNotification } = loadScriptFunctions(
            '../../src/background/background.js',
            ['buildInitialDetectedAutoTestNotification'],
            { INITIAL_DETECTED_AUTO_TEST_NOTIFICATION_ID: 'initial-detected-auto-test-result' }
        );
        const notification = buildInitialDetectedAutoTestNotification({ status, failureReason });

        expect(notification.notificationId).toBe('initial-detected-auto-test-result');
        expect(notification.options.title).toContain('自動判定が完了');
        expect(notification.options.message).toBe(message);
        expect(notification.options.silent).toBe(false);
        expect(notification.options.requireInteraction).toBe(true);
    });

    test.each([
        ['granted', {}, 'created'],
        ['denied', {}, 'permission_denied'],
        ['granted', {}, 'not_found_after_create'],
        ['granted', { create: new Error('create failed') }, 'error']
    ])('完了通知の状態 %s を session に保存する', async (permissionLevel, failure, expectedStatus) => {
        const notifications = {
            getPermissionLevel: jest.fn(async () => permissionLevel),
            clear: jest.fn(async () => true),
            create: jest.fn(async () => {
                if (failure.create) throw failure.create;
            }),
            getAll: jest.fn(async () => expectedStatus === 'created'
                ? { 'initial-detected-auto-test-result': { type: 'basic' } }
                : {})
        };
        const session = { set: jest.fn(async () => {}) };
        const { notifyInitialDetectedAutoTestCompleted } = loadScriptFunctions(
            '../../src/background/background.js',
            [
                'setInitialDetectedAutoTestStatus',
                'buildInitialDetectedAutoTestNotification',
                'notifyInitialDetectedAutoTestCompleted'
            ],
            {
                chrome: { notifications, storage: { session } },
                initialDetectedAutoTestStatus: null,
                INITIAL_DETECTED_AUTO_TEST_STATUS_STORAGE_KEY: 'initialDetectedAutoTestStatus',
                INITIAL_DETECTED_AUTO_TEST_NOTIFICATION_ID: 'initial-detected-auto-test-result'
            }
        );
        const test = { status: 'passed', active: false };

        await expect(notifyInitialDetectedAutoTestCompleted(test)).resolves.toEqual({ status: expectedStatus });
        expect(test.notification).toEqual({ status: expectedStatus });
        expect(session.set).toHaveBeenLastCalledWith({ initialDetectedAutoTestStatus: test });
        if (['created', 'not_found_after_create'].includes(expectedStatus)) {
            expect(notifications.clear).toHaveBeenCalledWith('initial-detected-auto-test-result');
            expect(notifications.create).toHaveBeenCalledWith(
                'initial-detected-auto-test-result',
                expect.objectContaining({ silent: false, requireInteraction: true })
            );
            expect(notifications.getAll).toHaveBeenCalledTimes(1);
        } else if (expectedStatus === 'permission_denied') {
            expect(notifications.clear).not.toHaveBeenCalled();
            expect(notifications.create).not.toHaveBeenCalled();
        }
    });

    test('連続完了時も固定IDを clear 後に1件ずつ作成する', async () => {
        const notifications = {
            getPermissionLevel: jest.fn(async () => 'granted'),
            clear: jest.fn(async () => true),
            create: jest.fn(async () => {}),
            getAll: jest.fn(async () => ({
                'initial-detected-auto-test-result': { type: 'basic' }
            }))
        };
        const session = { set: jest.fn(async () => {}) };
        const { notifyInitialDetectedAutoTestCompleted } = loadScriptFunctions(
            '../../src/background/background.js',
            [
                'setInitialDetectedAutoTestStatus',
                'buildInitialDetectedAutoTestNotification',
                'notifyInitialDetectedAutoTestCompleted'
            ],
            {
                chrome: { notifications, storage: { session } },
                initialDetectedAutoTestStatus: null,
                INITIAL_DETECTED_AUTO_TEST_STATUS_STORAGE_KEY: 'initialDetectedAutoTestStatus',
                INITIAL_DETECTED_AUTO_TEST_NOTIFICATION_ID: 'initial-detected-auto-test-result'
            }
        );

        await notifyInitialDetectedAutoTestCompleted({ status: 'passed', active: false });
        await notifyInitialDetectedAutoTestCompleted({ status: 'failed', active: false });

        expect(notifications.clear).toHaveBeenCalledTimes(2);
        expect(notifications.create.mock.calls.map(([id]) => id)).toEqual([
            'initial-detected-auto-test-result',
            'initial-detected-auto-test-result'
        ]);
    });

    test('popup は通知状態と設定確認案内を完了結果に表示する', () => {
        const { resolveInitialDetectedNotificationDisplay } = loadScriptFunctions(
            '../../src/ui/popup.js',
            ['resolveInitialDetectedNotificationDisplay']
        );

        expect(resolveInitialDetectedNotificationDisplay({ status: 'created' })).toEqual({
            text: '完了通知: 送信済み', needsSettingsGuide: false
        });
        expect(resolveInitialDetectedNotificationDisplay({ status: 'permission_denied' })).toEqual({
            text: '完了通知: 許可されていない', needsSettingsGuide: true
        });
        expect(resolveInitialDetectedNotificationDisplay({ status: 'not_found_after_create' })).toEqual({
            text: '完了通知: 確認できない', needsSettingsGuide: true
        });
        expect(popupSource).toContain('macOSのChrome通知、集中モードを確認してください');
    });

    test('popup 初期化時に保存済み状態を復元し、実行中だけポーリングする', () => {
        expect(popupSource).toContain('await restoreInitialDetectedAutoTestStatus();');
        expect(popupSource).toContain("selectedTestScenarioId = test.scenarioId || 'initial_detected';");
        expect(popupSource).toContain('if (test.active) startInitialDetectedAutoTestPolling();');
        expect(popupSource).toContain('if (!isSelectedInitialDetectedAutoJudgement()) {');
    });
});
