const {
    loadBackgroundFunctions,
    loadScriptFunctions
} = require('../helpers/load-source-functions');
const fs = require('fs');
const path = require('path');

describe('background.js の純粋関数', () => {
    const functions = loadBackgroundFunctions([
        'generateFilename',
        'normalizeScheduleTime',
        'scheduleTimeToMinutes',
        'resolveScheduleWindowSettings',
        'createScheduleDate',
        'getSiteAlarmName',
        'extractSiteInfoFromAlarm',
        'extractSiteIdFromAlarm',
        'getSchedulesFromSite',
        'formatJstStockTimestamp',
        'formatJstTimestampReadable',
        'extractKeywordFromUrl',
        'buildAeonStockDownloadPath',
        'buildBaselineLogText',
        'buildStockLogText',
        'normalizeStockProductUrl',
        'resolveScheduledProductUrl',
        'extractScheduledProductUrls',
        'diffStockProductUrls',
        'parseCSVLine',
        'normalizeMonitoringMode',
        'validateMonitoringModeSettings',
        'createSingleMonitoringSessionId',
        'getSingleMonitoringSessionAlarmName',
        'isSingleMonitoringSessionAlarmName',
        'createSingleMonitoringSession',
        'evaluateSingleKeywordStateTransition',
        'createLongRunningSingleMonitoringAlarmOptions',
        'canClaimSingleMonitoringSessionLease',
        'claimSingleMonitoringSessionLease',
        'releaseSingleMonitoringSessionLease',
        'getTwoTierAcceptanceScenario',
        'isTwoTierAcceptanceAlarmRun',
        'hasTwoTierAcceptanceExpectedOutcomes',
        'hasTwoTierAcceptanceInitialChecks',
        'hasTwoTierAcceptanceMinimumChecks',
        'markTwoTierAcceptanceServiceWorkerRestored',
        'getTwoTierAcceptanceRequiredCheckKeys',
        'areTwoTierAcceptanceChecksPassed',
        'calculateHighFrequencyReloadDelayMs'
    ]);

    test('JST時刻とサイト情報を含むファイル名を生成できる', () => {
        const result = functions.generateFilename(
            'Screenshot',
            'Baseline',
            { url: 'https://www.aeonretail.com/path', monitorKeyword: 'ポケモン カード' },
            '2026-06-12T00:34:56.000Z',
            { url: 'https://www.aeonretail.com/path' }
        );

        expect(result).toBe('Screenshot_Baseline_Aeonretail_ポケモンカード_2026-06-12_09-34-56');
    });

    test('複数URL監視形式の settings でも registrable domain からサイト名を生成できる', () => {
        const result = functions.generateFilename(
            'Screenshot',
            'Change',
            { targetUrl: 'https://shop.nissan.co.jp/item', keyword: '日産オンラインショップ' },
            '2026-08-31T01:02:03.000Z',
            {}
        );

        expect(result).toBe('Screenshot_Change_Nissan_日産オンラインショッ_2026-08-31_10-02-03');
    });

    test('targetTab の URL が空でも settings.targetUrl から hyphen を除いたサイト名を解決できる', () => {
        const result = functions.generateFilename(
            'PageSource',
            'Change',
            { targetUrl: 'https://shop.chocolate-inc.com/products', keyword: 'CHOCOLATE ONLINE STORE' },
            '2026-08-31T01:02:03.000Z',
            { url: '' }
        );

        expect(result).toBe('PageSource_Change_Chocolate_CHOCOLATEO_2026-08-31_10-02-03');
    });

    test('monitorKeyword が空でも keyword を使って unknown を回避できる', () => {
        const result = functions.generateFilename(
            'PageSource',
            'Baseline',
            {
                url: 'https://www.aeonretail.com/path',
                monitorKeyword: '',
                keyword: '在庫あり'
            },
            '2026-06-12T00:34:56.000Z',
            { url: 'https://www.aeonretail.com/path' }
        );

        expect(result).toBe('PageSource_Baseline_Aeonretail_在庫あり_2026-06-12_09-34-56');
    });

    test('不正な時刻入力ではデフォルト値にフォールバックする', () => {
        expect(functions.normalizeScheduleTime('09:30')).toBe('09:30');
        expect(functions.normalizeScheduleTime('9:30')).toBe('13:00');
        expect(functions.normalizeScheduleTime()).toBe('13:00');
    });

    test('時刻文字列を分単位に変換できる', () => {
        expect(functions.scheduleTimeToMinutes('01:30')).toBe(90);
    });

    test('監視時間帯設定の値と間隔上限を正規化できる', () => {
        expect(functions.resolveScheduleWindowSettings({
            scheduleTime: '11:57',
            scheduleWindowEnd: '11:50',
            scheduleReloadIntervalSec: '600'
        })).toEqual({
            scheduleWindowStart: '11:57',
            scheduleWindowEnd: '12:05',
            scheduleReloadIntervalSec: 300
        });

        expect(functions.resolveScheduleWindowSettings({
            scheduleWindowStart: '09:00',
            scheduleWindowEnd: '09:05',
            scheduleReloadIntervalSec: '2'
        })).toEqual({
            scheduleWindowStart: '09:00',
            scheduleWindowEnd: '09:05',
            scheduleReloadIntervalSec: 5
        });
    });

    test('指定時刻から今日または翌日の未来日時を生成できる', () => {
        const result = functions.createScheduleDate('13:00');

        expect(result).toBeInstanceOf(Date);
        expect(result.getTime()).toBeGreaterThan(Date.now() - 1000);
    });

    test('監視モード未指定を高頻度セッションとして正規化できる', () => {
        expect(functions.normalizeMonitoringMode()).toBe('high_frequency');
        expect(functions.normalizeMonitoringMode('high_frequency')).toBe('high_frequency');
        expect(functions.normalizeMonitoringMode('long_running')).toBe('long_running');
        expect(functions.normalizeMonitoringMode('unknown')).toBe('high_frequency');
    });

    test('高頻度と長期監視の時間・間隔制約を検証できる', () => {
        expect(functions.validateMonitoringModeSettings({
            monitoringMode: 'high_frequency', interval: 5, duration: 60
        })).toBeNull();
        expect(functions.validateMonitoringModeSettings({
            monitoringMode: 'high_frequency', interval: 30, duration: 60
        })).toContain('5〜20秒');
        expect(functions.validateMonitoringModeSettings({
            monitoringMode: 'high_frequency', interval: 5, duration: 3601
        })).toContain('1〜60分');
        expect(functions.validateMonitoringModeSettings({
            monitoringMode: 'long_running', interval: 30, duration: 1800
        })).toBeNull();
        expect(functions.validateMonitoringModeSettings({
            monitoringMode: 'long_running', interval: 20, duration: 1800
        })).toContain('30秒以上');
        expect(functions.validateMonitoringModeSettings({
            monitoringMode: 'long_running', interval: 30, duration: 1799
        })).toContain('30分〜8時間');
    });

    test('系統A永続セッションに一意なアラーム名と期限を持たせられる', () => {
        const session = functions.createSingleMonitoringSession({
            sessionId: 'single_test', tabId: 42,
            settings: { monitoringMode: 'long_running', interval: 30, duration: 1800 }, now: 1000
        });
        expect(session.alarmName).toBe('singleMonitoringSession_single_test');
        expect(session.endsAt).toBe(1801000);
        expect(session.active).toBe(true);
        expect(functions.isSingleMonitoringSessionAlarmName(session.alarmName)).toBe(true);
        expect(functions.isSingleMonitoringSessionAlarmName('stockWatchTick_site')).toBe(false);
        expect(session.keywordStateInitialized).toBe(false);
        expect(session.previousKeywordPresent).toBeNull();
    });

    test('初回OFFでは現在状態を基準保存し、出現遷移だけを検知する', () => {
        const baseline = functions.evaluateSingleKeywordStateTransition({
            currentKeywordPresent: false,
            detectMode: 'appear',
            initialKeywordDetection: false
        });
        expect(baseline).toMatchObject({
            decision: 'baseline', keywordStateInitialized: true, previousKeywordPresent: false
        });

        const detected = functions.evaluateSingleKeywordStateTransition({
            ...baseline,
            currentKeywordPresent: true,
            detectMode: 'appear'
        });
        expect(detected.decision).toBe('detected');
    });

    test('初回ONは条件一致だけを即時検知し、消失はありからなしへの遷移だけを検知する', () => {
        expect(functions.evaluateSingleKeywordStateTransition({
            currentKeywordPresent: true,
            detectMode: 'appear',
            initialKeywordDetection: true
        }).decision).toBe('detected');
        expect(functions.evaluateSingleKeywordStateTransition({
            currentKeywordPresent: false,
            detectMode: 'disappear',
            initialKeywordDetection: true
        }).decision).toBe('detected');

        expect(functions.evaluateSingleKeywordStateTransition({
            keywordStateInitialized: true,
            previousKeywordPresent: true,
            currentKeywordPresent: false,
            detectMode: 'disappear'
        }).decision).toBe('detected');
        expect(functions.evaluateSingleKeywordStateTransition({
            keywordStateInitialized: true,
            previousKeywordPresent: false,
            currentKeywordPresent: false,
            detectMode: 'disappear'
        }).decision).toBe('not_detected');
    });

    test('復元済みセッション状態は同じ状態で再通知せず、判定不能は状態を更新しない', () => {
        expect(functions.evaluateSingleKeywordStateTransition({
            keywordStateInitialized: true,
            previousKeywordPresent: true,
            currentKeywordPresent: true,
            detectMode: 'appear'
        }).decision).toBe('not_detected');
        expect(functions.evaluateSingleKeywordStateTransition({
            keywordStateInitialized: true,
            previousKeywordPresent: false,
            currentKeywordPresent: null,
            detectMode: 'appear'
        })).toMatchObject({
            decision: 'pending', keywordStateInitialized: true, previousKeywordPresent: false
        });
    });

    test('長期監視アラームは開始または復元から最短30秒後に初回発火する', () => {
        expect(functions.createLongRunningSingleMonitoringAlarmOptions(
            { interval: 30 },
            1000
        )).toEqual({ when: 31000, periodInMinutes: 0.5 });
        expect(functions.createLongRunningSingleMonitoringAlarmOptions(
            { interval: 10 },
            1000
        )).toEqual({ when: 31000, periodInMinutes: 0.5 });
    });

    test('長期監視アラームの開始時と復元時は同じ初回発火設定を使う', () => {
        const backgroundSource = fs.readFileSync(
            path.resolve(__dirname, '../../src/background/background.js'),
            'utf8'
        );
        expect(backgroundSource.match(
            /createLongRunningSingleMonitoringAlarmOptions\(/g
        )).toHaveLength(2);
    });

    test('実行リースは重複を拒否し、期限後に回収できる', () => {
        const session = functions.createSingleMonitoringSession({
            sessionId: 'single_lease', tabId: 42,
            settings: { monitoringMode: 'long_running', duration: 1800 }, now: 1000
        });
        const leased = functions.claimSingleMonitoringSessionLease(session, 2000, 100);
        expect(leased.executionLease.expiresAt).toBe(2100);
        expect(functions.canClaimSingleMonitoringSessionLease(leased, 2050)).toBe(false);
        expect(functions.canClaimSingleMonitoringSessionLease(leased, 2100)).toBe(true);
        expect(functions.releaseSingleMonitoringSessionLease(leased).executionLease).toBeNull();
    });

    test('高頻度受け入れ確認は継続・検知を別シナリオとして定義する', () => {
        expect(functions.getTwoTierAcceptanceScenario('high_frequency_single_duration')).toEqual({
            mode: 'high_frequency',
            count: 1,
            expectedDetections: 0,
            expectedExpirations: 1,
            sessionBehaviors: ['remain_unmatched']
        });
        expect(functions.getTwoTierAcceptanceScenario('high_frequency_multiple_detect')).toEqual({
            mode: 'high_frequency',
            count: 2,
            expectedDetections: 1,
            expectedExpirations: 1,
            sessionBehaviors: ['detect_after_initial', 'remain_unmatched']
        });
    });

    test('長期受け入れ確認は開始直後の基準取得をアラーム発火として数えない', () => {
        expect(functions.isTwoTierAcceptanceAlarmRun('initial')).toBe(false);
        expect(functions.isTwoTierAcceptanceAlarmRun('alarm')).toBe(true);
    });

    test('長期受け入れ確認はService Worker再起動後の復元を一度だけ記録できる', () => {
        const status = {
            scenarioId: 'long_running_single',
            recoveredSessionIds: [],
            verification: { longRunningAlarmCreated: true }
        };

        const restored = functions.markTwoTierAcceptanceServiceWorkerRestored(
            status,
            'single_restart_test',
            '2026-09-22T06:00:00.000Z'
        );

        expect(restored.recoveredSessionIds).toEqual(['single_restart_test']);
        expect(restored.serviceWorkerRestarted).toBe(true);
        expect(restored.serviceWorkerRestartedAt).toBe('2026-09-22T06:00:00.000Z');
        expect(restored.verification.serviceWorkerRestartRestored).toBe(true);
        expect(functions.markTwoTierAcceptanceServiceWorkerRestored(
            restored,
            'single_restart_test',
            '2026-09-22T06:01:00.000Z'
        ).recoveredSessionIds).toEqual(['single_restart_test']);
    });

    test('複数URL受け入れ確認は検知と継続URLの時間満了がそろうまで完了しない', () => {
        const status = {
            expectedDetectionSessionIds: ['detect-session'],
            expectedExpirationSessionIds: ['continue-session'],
            detectedSessionIds: ['detect-session'],
            expiredSessionIds: []
        };
        expect(functions.hasTwoTierAcceptanceExpectedOutcomes(status)).toBe(false);
        expect(functions.hasTwoTierAcceptanceExpectedOutcomes({
            ...status,
            expiredSessionIds: ['continue-session']
        })).toBe(true);
    });

    test('全対象の初回未検知とシナリオ必須項目がそろった場合だけ合格にできる', () => {
        expect(functions.hasTwoTierAcceptanceInitialChecks({
            sessionIds: ['first', 'second'],
            initialNotDetectedSessionIds: ['first']
        })).toBe(false);
        expect(functions.hasTwoTierAcceptanceInitialChecks({
            sessionIds: ['first', 'second'],
            initialNotDetectedSessionIds: ['first', 'second']
        })).toBe(true);
        expect(functions.hasTwoTierAcceptanceMinimumChecks({
            sessionIds: ['first', 'second'], checkCounts: { first: 2, second: 1 }
        })).toBe(false);
        expect(functions.hasTwoTierAcceptanceMinimumChecks({
            sessionIds: ['first', 'second'], checkCounts: { first: 2, second: 2 }
        })).toBe(true);

        const required = functions.getTwoTierAcceptanceRequiredCheckKeys('high_frequency_multiple_detect');
        const verification = Object.fromEntries(required.map((key) => [key, true]));
        expect(functions.areTwoTierAcceptanceChecksPassed('high_frequency_multiple_detect', verification)).toBe(true);
        expect(functions.areTwoTierAcceptanceChecksPassed('high_frequency_multiple_detect', {
            ...verification,
            continuedAndExpired: false
        })).toBe(false);

        const longRunningRequired = functions.getTwoTierAcceptanceRequiredCheckKeys('long_running_single');
        expect(longRunningRequired).not.toContain('staleReportIgnored');
        expect(functions.areTwoTierAcceptanceChecksPassed(
            'long_running_single',
            Object.fromEntries(longRunningRequired.map((key) => [key, true]))
        )).toBe(true);
    });

    test('高頻度の次回再読込は確認開始から指定間隔になるよう残り時間を返す', () => {
        expect(functions.calculateHighFrequencyReloadDelayMs(5, 1000, 1000)).toBe(5000);
        expect(functions.calculateHighFrequencyReloadDelayMs(5, 1000, 2750)).toBe(3250);
        expect(functions.calculateHighFrequencyReloadDelayMs(5, 1000, 7000)).toBe(0);
    });

    test('受け入れテストのDOM更新と変化検知を監査ログに出す', () => {
        const source = fs.readFileSync(
            path.resolve(__dirname, '../../src/background/background.js'),
            'utf8'
        );

        expect(source).toContain('🔄 [二層監視テスト] テストDOMを変化状態へ更新');
        expect(source).toContain('🎯 [二層監視テスト] 変化検知を確認');
        expect(source).toContain('const [{ result: testDomMutation }] = await chrome.scripting.executeScript');
        expect(source).toContain('if (testDomMutation?.applied)');
        expect(source).toContain('🔄 [二層監視テスト] Service Worker再起動後に長期セッションを復元');
        expect(source).toContain('chrome.storage.local.set({ [TWO_TIER_ACCEPTANCE_STATUS_KEY]: status })');
        expect(source).toContain('const legacy = await chrome.storage.session.get(TWO_TIER_ACCEPTANCE_STATUS_KEY)');
    });

    test('Change保存では変更証跡として監査ログを出す', () => {
        const source = fs.readFileSync(
            path.resolve(__dirname, '../../src/background/background.js'),
            'utf8'
        );

        expect(source).toContain('downloadType === "Change" ? "変更証跡" : "基準"');
        expect(source).toContain('📄 ${downloadLabel}ダウンロード開始:');
        expect(source).toContain('✅ ${downloadLabel}ダウンロード完了');
    });

    test('サイト監視アラーム名から siteId とインデックスを保持して扱える', () => {
        expect(functions.getSiteAlarmName('dailyStockCheck', 'aeon-pokemon')).toBe('dailyStockCheck_aeon-pokemon');
        expect(functions.extractSiteInfoFromAlarm('dailyStockCheck_aeon-pokemon_2', 'dailyStockCheck')).toEqual({
            siteId: 'aeon-pokemon',
            scheduleIndex: 2
        });
        expect(functions.extractSiteInfoFromAlarm('dailyStockCheck_aeon-pokemon', 'dailyStockCheck')).toEqual({
            siteId: 'aeon-pokemon',
            scheduleIndex: 0
        });
        expect(functions.extractSiteIdFromAlarm('stockWatchTick_toysrus', 'stockWatchTick')).toBe('toysrus');
    });

    test('schedules 配列を優先し、次に schedule、最後にデフォルト値を使う', () => {
        expect(functions.getSchedulesFromSite({
            schedules: [{ startTime: '10:00', endTime: '10:10', intervalSeconds: 30 }]
        })).toEqual([{ startTime: '10:00', endTime: '10:10', intervalSeconds: 30 }]);

        expect(functions.getSchedulesFromSite({
            schedule: { startTime: '11:00', endTime: '11:10', intervalSeconds: 45 }
        })).toEqual([{ startTime: '11:00', endTime: '11:10', intervalSeconds: 45 }]);

        expect(functions.getSchedulesFromSite({})).toEqual([
            { startTime: '11:57', endTime: '12:05', intervalSeconds: 60 }
        ]);
    });

    test('JST形式の日時文字列を現在の形式で出力できる', () => {
        const date = new Date('2026-06-12T00:34:56.000Z');

        expect(functions.formatJstStockTimestamp(date)).toEqual({
            yyMMdd: '260612',
            yyMMdd_hhmmss: '260612-093456'
        });
        expect(functions.formatJstTimestampReadable(date)).toBe('2026-06-12 09:34:56 (JST)');
    });

    test('URLからデコード済みの gspsk だけを抽出できる', () => {
        expect(functions.extractKeywordFromUrl('https://example.com/list?gspsk=pkcg-all')).toBe('pkcg-all');
        expect(functions.extractKeywordFromUrl('not-a-url')).toBe('');
    });

    test('AEON在庫ログの保存パスでサイト名を安全な文字列に整形できる', () => {
        const result = functions.buildAeonStockDownloadPath(
            'baseline',
            new Date('2026-06-12T00:34:56.000Z'),
            'txt',
            { siteName: 'AEON ポケモン/カード' }
        );

        expect(result).toBe('aeon/stock/260612/baseline_AEONポケモン_カード_260612-093456.txt');
    });

    test('ベースラインログを現在の行単位フォーマットで生成できる', () => {
        const text = functions.buildBaselineLogText(
            {
                count: 2,
                urls: ['https://example.com/a', 'https://example.com/b'],
                usedSelector: '.product',
                title: 'Title',
                textPreview: 'preview'
            },
            {
                targetUrl: 'https://example.com/list',
                comparisonKey: 'https://example.com/list'
            }
        );

        expect(text).toContain('logType: baseline');
        expect(text).toContain('count: 2');
        expect(text).toContain('https://example.com/a');
        expect(text).toContain('usedSelector: .product');
    });

    test('在庫検知ログに detected と new URL の各セクションを含められる', () => {
        const text = functions.buildStockLogText({
            timestamp: '2026-06-12T00:34:56.000Z',
            targetUrl: 'https://example.com/list',
            comparisonKey: 'https://example.com/list',
            previousCount: 1,
            currentCount: 2,
            detectedUrls: ['https://example.com/a', 'https://example.com/b'],
            newUrls: ['https://example.com/b'],
            usedSelector: '.product',
            title: 'Title',
            textPreview: 'preview'
        });

        expect(text).toContain('logType: detected');
        expect(text).toContain('previousCount: 1');
        expect(text).toContain('newUrls:');
        expect(text).toContain('detectedUrls:');
    });

    test('商品URLからクエリ文字列と末尾スラッシュを除去できる', () => {
        expect(functions.normalizeStockProductUrl('https://example.com/item/?a=1')).toBe('https://example.com/item');
        expect(functions.normalizeStockProductUrl('bad-url?x=1')).toBe('bad-url');
        expect(functions.normalizeStockProductUrl('')).toBe('');
    });

    test('相対商品URLを絶対URLに解決できる', () => {
        expect(functions.resolveScheduledProductUrl(
            '/product/0/P-12345?ref=list',
            'https://shop.example.com/list'
        )).toBe('https://shop.example.com/product/0/P-12345?ref=list');

        expect(functions.resolveScheduledProductUrl('', 'https://shop.example.com/list')).toBe('');
    });

    test('アンカー要素とカード要素の両方から商品URLを抽出できる', () => {
        const createAnchor = (href) => ({
            tagName: 'A',
            href,
            getAttribute: (name) => (name === 'href' ? href : null)
        });
        const createCard = (anchorsBySelector) => ({
            tagName: 'DIV',
            querySelector: (selector) => anchorsBySelector[selector] || null
        });

        const urls = functions.extractScheduledProductUrls([
            createAnchor('/product/0/P-100'),
            createCard({
                'a[href*="/product/0/P-"]': createAnchor('/product/0/P-200?from=card')
            }),
            createCard({
                'a[href*="/product/"]': createAnchor('/product/300')
            }),
            createCard({
                'a[href]': createAnchor('/product/300')
            })
        ], 'https://shop.example.com/list');

        expect(urls).toEqual([
            'https://shop.example.com/product/0/P-100',
            'https://shop.example.com/product/0/P-200?from=card',
            'https://shop.example.com/product/300'
        ]);
    });

    test('正規化したURLで差分比較し current 側の重複を除外できる', () => {
        expect(functions.diffStockProductUrls(
            ['https://example.com/item?a=1'],
            ['https://example.com/item?a=2', 'https://example.com/new?a=1', 'https://example.com/new?a=2']
        )).toEqual(['https://example.com/new?a=1']);

        expect(functions.diffStockProductUrls([], ['https://example.com/new'])).toEqual([]);
    });

    test('ダブルクォート内のカンマを保持してCSV行を分割できる', () => {
        expect(functions.parseCSVLine('alpha,"beta,gamma",delta')).toEqual(['alpha', 'beta,gamma', 'delta']);
    });
});

describe('background.js の証跡撮影と通知待機', () => {
    test('証跡撮影は対象タブを前面化してから撮影し、元のアクティブタブへ戻す', async () => {
        const chrome = {
            tabs: {
                get: jest.fn().mockResolvedValue({ id: 20, windowId: 3 }),
                query: jest.fn().mockResolvedValue([{ id: 10 }]),
                update: jest.fn().mockResolvedValue({}),
                captureVisibleTab: jest.fn().mockResolvedValue('data:image/png;base64,abc')
            }
        };
        const { captureEvidenceScreenshot } = loadScriptFunctions(
            '../../src/background/background.js',
            ['captureEvidenceScreenshot'],
            {
                chrome,
                screenshotLock: null,
                waitForPageReady: jest.fn().mockResolvedValue(),
                logger: { debug: jest.fn() }
            }
        );

        await expect(captureEvidenceScreenshot(20)).resolves.toBe('data:image/png;base64,abc');
        expect(chrome.tabs.update).toHaveBeenNthCalledWith(1, 20, { active: true });
        expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(3, { format: 'png' });
        expect(chrome.tabs.update).toHaveBeenNthCalledWith(2, 10, { active: true });
    });

    test('通知待機は未解決の通知をタイムアウトとして返す', async () => {
        const { waitForDetectionNotification } = loadScriptFunctions(
            '../../src/background/background.js',
            ['waitForDetectionNotification']
        );

        await expect(waitForDetectionNotification(new Promise(() => {}), 1))
            .resolves.toEqual({ timedOut: true });
    });

    test('検知時は通知より先にセッション停止を実行する', () => {
        const source = fs.readFileSync(
            path.resolve(__dirname, '../../src/background/background.js'),
            'utf8'
        );
        const start = source.indexOf('if (sessionDecision === "detected")');
        const detectedBlock = source.slice(
            start,
            source.indexOf('return {\n    continueMonitoring: true', start)
        );

        expect(detectedBlock.indexOf('await deactivateSingleMonitoringSession(session.id, "detected", aiSupportReport)'))
            .toBeLessThan(detectedBlock.indexOf('notifyGmailForKeywordDetection'));
        expect(detectedBlock).toContain('waitForDetectionNotification');
    });
});

describe('監視実行履歴', () => {
    test('対象ごとに直近実行を作成し、チェック実測間隔を保存できる', async () => {
        let stored = {};
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'buildMonitoringExecutionHistoryKey',
            'buildMonitoringExecutionRecord',
            'updateMonitoringExecutionHistory',
            'startMonitoringExecutionHistory',
            'appendMonitoringExecutionCheck',
            'completeMonitoringExecutionHistory'
        ], {
            MONITORING_EXECUTION_HISTORY_KEY: 'monitoringExecutionHistory',
            monitoringExecutionHistoryStorageLock: Promise.resolve(),
            chrome: { storage: { local: {
                get: jest.fn(async () => ({ monitoringExecutionHistory: stored })),
                set: jest.fn(async (value) => { stored = value.monitoringExecutionHistory; })
            } } }
        });

        const execution = await functions.startMonitoringExecutionHistory({
            scope: 'single', targetId: 'single', targetName: '対象A',
            targetUrl: 'https://example.com/a', sessionId: 'run-a',
            settings: { monitoringMode: 'high_frequency', captureMode: 'fetch', interval: 20 },
            startedAt: 1_000
        });
        await functions.appendMonitoringExecutionCheck(execution.historyKey, {
            startedAt: new Date(1_000).toISOString(), captureMode: 'fetch', result: 'success'
        });
        await functions.appendMonitoringExecutionCheck(execution.historyKey, {
            startedAt: new Date(21_000).toISOString(), captureMode: 'fetch', result: 'success'
        });
        await functions.completeMonitoringExecutionHistory(execution.historyKey, {
            reason: 'expired', status: 'success'
        });

        expect(stored[execution.historyKey]).toMatchObject({
            status: 'success', endReason: 'expired', intervalSeconds: 20,
            effectiveCaptureMode: 'fetch'
        });
        expect(stored[execution.historyKey].checks).toHaveLength(2);
        expect(stored[execution.historyKey].checks[1].intervalMs).toBe(20_000);
    });

    test('Fetch実行ログに実測間隔・設定間隔・結果を表示する', () => {
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'formatMonitoringExecutionIntervalForLog',
            'formatMonitoringExecutionTimeForLog',
            'buildFetchExecutionCheckLogMessage'
        ]);
        const message = functions.buildFetchExecutionCheckLogMessage({
            systemLabel: '系統A',
            targetLabel: 'https://example.com/item',
            configuredIntervalSeconds: 20,
            executionRecord: {
                checks: [{
                    startedAt: '2026-09-25T07:34:48.000Z',
                    intervalMs: 20_000,
                    durationMs: 320,
                    result: 'success',
                    detail: '検知なし'
                }]
            }
        });

        expect(message).toContain('⏰ [Fetch実行][系統A][https://example.com/item] 結果');
        expect(message).toContain('実測間隔: 20.0秒（設定: 20秒）');
        expect(message).toContain('取得所要: 0.3秒');
        expect(message).toContain('結果: success（検知なし）');
        expect(functions.formatMonitoringExecutionIntervalForLog(null)).toBe('初回');
    });
});

describe('background.js のログレベル復元関数', () => {
    function createLogLevelFunctions(storageValue) {
        const storageGet = jest.fn().mockResolvedValue(
            storageValue === undefined ? {} : { serviceWorkerLogLevel: storageValue }
        );

        const functions = loadScriptFunctions('../../src/background/background.js', [
            'isValidLogLevel',
            'loadPersistedLogLevel'
        ], {
            LogLevel: {
                NONE: 0,
                ERROR: 1,
                WARNING: 2,
                INFO: 3,
                DEBUG: 4
            },
            DEFAULT_LOG_LEVEL: 3,
            LOG_LEVEL_STORAGE_KEY: 'serviceWorkerLogLevel',
            chrome: {
                storage: {
                    local: {
                        get: storageGet
                    }
                }
            }
        });

        return { ...functions, storageGet };
    }

    test('未保存時は INFO(3) を返す', async () => {
        const { loadPersistedLogLevel } = createLogLevelFunctions(undefined);
        await expect(loadPersistedLogLevel()).resolves.toBe(3);
    });

    test('保存済み 2 / 3 / 4 をそのまま復元する', async () => {
        await expect(createLogLevelFunctions(2).loadPersistedLogLevel()).resolves.toBe(2);
        await expect(createLogLevelFunctions(3).loadPersistedLogLevel()).resolves.toBe(3);
        await expect(createLogLevelFunctions(4).loadPersistedLogLevel()).resolves.toBe(4);
    });

    test('不正値保存時は INFO(3) にフォールバックする', async () => {
        await expect(createLogLevelFunctions('3').loadPersistedLogLevel()).resolves.toBe(3);
        await expect(createLogLevelFunctions(99).loadPersistedLogLevel()).resolves.toBe(3);
        await expect(createLogLevelFunctions(-1).loadPersistedLogLevel()).resolves.toBe(3);
    });

    test.each([
        [4, 'DEBUG'],
        [3, 'INFO'],
        [1, 'ERROR']
    ])('復元したログレベル %s を起動時に一度だけ表示する', async (level, levelName) => {
        const writeBgConsole = jest.fn();
        const { restoreLogLevelFromStorage } = loadScriptFunctions('../../src/background/background.js', [
            'restoreLogLevelFromStorage'
        ], {
            loadPersistedLogLevel: jest.fn().mockResolvedValue(level),
            getLogLevelName: jest.fn().mockReturnValue(levelName),
            writeBgConsole,
            currentLogLevel: null,
            hasLoggedRestoredLogLevel: false
        });

        await restoreLogLevelFromStorage();
        await restoreLogLevelFromStorage();

        expect(writeBgConsole).toHaveBeenCalledTimes(1);
        expect(writeBgConsole).toHaveBeenCalledWith(
            'log',
            `🔧 Service Workerログレベル復元: ${levelName} (${level})`
        );
    });
});

describe('background.js の複数監視共有設定ヘルパー', () => {
    const functions = loadScriptFunctions('../../src/background/background.js', [
        'resolveMultipleMonitorSharedSettings',
        'normalizeMultipleMonitorIntervalMs',
        'normalizeMultipleMonitorDurationSeconds'
    ]);

    test('複数監視の共有設定を対象設定より優先して解決できる', () => {
        expect(functions.resolveMultipleMonitorSharedSettings({
            initialKeywordDetection: false,
            settings: {
                initialKeywordDetection: false,
                interval: 30,
                duration: 120,
                reloadWaitAfterReload: 9
            }
        }, {
            initialKeywordDetection: true,
            interval: 20,
            duration: 60,
            reloadWaitAfterReload: 3,
            captureMode: 'reload',
            downloadAiSupportFile: false
        })).toEqual({
            detectMode: 'appear',
            initialKeywordDetection: true,
            interval: 20,
            duration: 60,
            reloadWaitAfterReload: 3,
            captureMode: 'reload',
            downloadAiSupportFile: false
        });
    });

    test('共有設定の false を true に上書きせず保持できる', () => {
        expect(functions.resolveMultipleMonitorSharedSettings({
            initialKeywordDetection: true,
            settings: {
                initialKeywordDetection: true,
                detectMode: 'disappear',
                interval: 30,
                duration: 120,
                reloadWaitAfterReload: 9
            }
        }, {
            initialKeywordDetection: false,
            detectMode: 'appear'
        })).toEqual({
            initialKeywordDetection: false,
            detectMode: 'appear',
            interval: 30,
            duration: 120,
            reloadWaitAfterReload: 9,
            captureMode: 'reload',
            downloadAiSupportFile: false
        });
    });

    test('共有設定の reloadWaitAfterReload: 0 を fallback せず保持できる', () => {
        expect(functions.resolveMultipleMonitorSharedSettings({
            settings: {
                reloadWaitAfterReload: 9
            }
        }, {
            reloadWaitAfterReload: 0
        })).toEqual({
            detectMode: 'appear',
            initialKeywordDetection: false,
            interval: 20,
            duration: 60,
            reloadWaitAfterReload: 0,
            captureMode: 'reload',
            downloadAiSupportFile: false
        });
    });

    test('AI判断サポートの共通設定は対象ごとの設定より優先して解決できる', () => {
        expect(functions.resolveMultipleMonitorSharedSettings({
            settings: { downloadAiSupportFile: false }
        }, {
            downloadAiSupportFile: true
        }).downloadAiSupportFile).toBe(true);

        expect(functions.resolveMultipleMonitorSharedSettings({
            settings: { downloadAiSupportFile: true }
        }, {
            downloadAiSupportFile: false
        }).downloadAiSupportFile).toBe(false);
    });

    test('取得方式は共有設定を優先し、未設定はリロード方式にする', () => {
        expect(functions.resolveMultipleMonitorSharedSettings({
            settings: { captureMode: 'fetch' }
        }, {
            captureMode: 'reload'
        }).captureMode).toBe('reload');

        expect(functions.resolveMultipleMonitorSharedSettings({
            settings: { captureMode: 'fetch' }
        }, {}).captureMode).toBe('fetch');

        expect(functions.resolveMultipleMonitorSharedSettings({ settings: {} }, {}).captureMode)
            .toBe('reload');
    });

    test('定時複数サイトの取得方式をFetch／リロードとして保存できる', async () => {
        const updateSiteFetchModeOverride = jest.fn().mockResolvedValue();
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'updateScheduledWatchCaptureMode'
        ], {
            loadScheduledWatchSites: jest.fn().mockResolvedValue([
                { id: 'site-a', name: 'サイトA' }
            ]),
            updateSiteFetchModeOverride
        });

        await expect(functions.updateScheduledWatchCaptureMode('site-a', 'fetch'))
            .resolves.toEqual({ siteId: 'site-a', siteName: 'サイトA', captureMode: 'fetch' });
        expect(updateSiteFetchModeOverride).toHaveBeenCalledWith('site-a', {
            enabled: true,
            fallbackToDom: true
        });

        await functions.updateScheduledWatchCaptureMode('site-a', 'reload');
        expect(updateSiteFetchModeOverride).toHaveBeenLastCalledWith('site-a', {
            enabled: false,
            fallbackToDom: true
        });
    });

    test('複数監視の interval と duration を UI 秒数から正規化できる', () => {
        expect(functions.normalizeMultipleMonitorIntervalMs(20)).toBe(20000);
        expect(functions.normalizeMultipleMonitorIntervalMs('15')).toBe(15000);
        expect(functions.normalizeMultipleMonitorIntervalMs(0)).toBe(20000);

        expect(functions.normalizeMultipleMonitorDurationSeconds(60)).toBe(60);
        expect(functions.normalizeMultipleMonitorDurationSeconds('90')).toBe(90);
        expect(functions.normalizeMultipleMonitorDurationSeconds(0)).toBe(60);
    });

});

describe('background.js 系統Aセッション停止の契約', () => {
    function loadSessionFunctions(session) {
        let storedSessions = { [session.id]: session };
        const calls = [];
        const chrome = {
            storage: {
                local: {
                    get: jest.fn(async () => {
                        calls.push('storage.get');
                        return { singleMonitoringSessions: storedSessions };
                    }),
                    set: jest.fn(async (value) => {
                        calls.push('storage.set');
                        storedSessions = value.singleMonitoringSessions;
                    })
                }
            },
            tabs: {
                sendMessage: jest.fn(async () => {
                    calls.push('tabs.sendMessage');
                })
            },
            alarms: {
                clear: jest.fn(async (name) => {
                    calls.push(`alarms.clear:${name}`);
                })
            }
        };
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'getSingleMonitoringSessions',
            'saveSingleMonitoringSessions',
            'findSingleMonitoringSessionByTab',
            'deactivateSingleMonitoringSession'
        ], {
            chrome,
            SINGLE_MONITORING_SESSIONS_KEY: 'singleMonitoringSessions',
            bgLogInfo: jest.fn()
        });

        return { functions, chrome, calls, getStoredSessions: () => storedSessions };
    }

    test('長期セッションは active:false を保存してから専用アラームだけを解除する', async () => {
        const session = {
            id: 'single-long', tabId: 101, active: true,
            monitoringMode: 'long_running', alarmName: 'singleMonitoringSession_single-long'
        };
        const context = loadSessionFunctions(session);

        await context.functions.deactivateSingleMonitoringSession(session.id, 'manual_stop');

        expect(context.getStoredSessions()[session.id]).toEqual(expect.objectContaining({
            active: false,
            stopReason: 'manual_stop',
            executionLease: null
        }));
        expect(context.calls.indexOf('storage.set')).toBeLessThan(
            context.calls.indexOf(`alarms.clear:${session.alarmName}`)
        );
        expect(context.chrome.alarms.clear).toHaveBeenCalledWith(session.alarmName);
        expect(context.chrome.alarms.clear).not.toHaveBeenCalledWith('dailyStockCheck_aeon-pokemon_0');
        expect(context.chrome.alarms.clear).not.toHaveBeenCalledWith('stockWatchTick_aeon-pokemon');
    });

    test('高頻度セッションのtab消失は停止通知後に専用アラームだけを解除する', async () => {
        const session = {
            id: 'single-high', tabId: 202, active: true,
            monitoringMode: 'high_frequency', alarmName: 'singleMonitoringSession_single-high'
        };
        const context = loadSessionFunctions(session);

        expect(await context.functions.findSingleMonitoringSessionByTab(202)).toEqual(session);
        await context.functions.deactivateSingleMonitoringSession(session.id, 'tab_removed');

        expect(context.getStoredSessions()[session.id]).toEqual(expect.objectContaining({
            active: false,
            stopReason: 'tab_removed'
        }));
        expect(context.chrome.tabs.sendMessage).toHaveBeenCalledWith(202, {
            action: 'stopHighFrequencySession'
        });
        expect(context.chrome.alarms.clear).toHaveBeenCalledWith(session.alarmName);
        expect(context.calls.indexOf('storage.set')).toBeLessThan(
            context.calls.indexOf('tabs.sendMessage')
        );
    });

    test('tab削除イベントは保存済み系統Aセッションを tab_removed として停止する', () => {
        const source = fs.readFileSync(
            path.resolve(__dirname, '../../src/background/background.js'),
            'utf8'
        );

        expect(source).toContain('chrome.tabs.onRemoved.addListener(async (tabId) => {');
        expect(source).toContain('deactivateSingleMonitoringSession(session.id, "tab_removed")');
    });

    test('高頻度結果の同時処理はセッション世代単位の実行キーで排他する', () => {
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'buildHighFrequencySessionExecutionKey'
        ]);
        const source = fs.readFileSync(
            path.resolve(__dirname, '../../src/background/background.js'),
            'utf8'
        );

        expect(functions.buildHighFrequencySessionExecutionKey('single_1', 3))
            .toBe('single_1:3');
        expect(source).toContain('const highFrequencySessionResultLocks = new Set()');
        expect(source).toContain('highFrequencySessionResultLocks.has(executionKey)');
        expect(source).toContain('highFrequencySessionResultLocks.add(executionKey)');
        expect(source).toContain('highFrequencySessionResultLocks.delete(executionKey)');
    });
});

describe('background.js の複数監視開始デバッグ補助', () => {
    test('startAllMonitoring の結果集計で total が 2 件になる', () => {
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'summarizeStartAllMonitoringResults'
        ]);

        const summary = functions.summarizeStartAllMonitoringResults([
            { success: true, name: 'site-a' },
            { success: false, name: 'site-b', error: 'failed' }
        ]);

        expect(summary).toEqual({
            total: 2,
            successCount: 1,
            failureCount: 1
        });
    });

    test('requestId が未指定でも startAllMonitoring ログ用メタを作れる', () => {
        const RealDate = Date;
        class FixedDate extends RealDate {
            constructor(...args) {
                if (args.length === 0) {
                    super('2026-08-31T10:00:00.000Z');
                    return;
                }
                super(...args);
            }

            static now() {
                return new RealDate('2026-08-31T10:00:00.000Z').getTime();
            }
        }

        const functions = loadScriptFunctions('../../src/background/background.js', [
            'resolveStartAllMonitoringRequestMeta'
        ], {
            Date: FixedDate
        });

        const meta = functions.resolveStartAllMonitoringRequestMeta({
            configs: [{ id: 'nissan' }, { id: 'chocolate' }],
            commonSettings: { initialKeywordDetection: true }
        });

        expect(meta.requestId).toBe('bgStartAll_2026-08-31T10:00:00.000Z_2');
        expect(meta.receivedAt).toBe('2026-08-31T10:00:00.000Z');
        expect(meta.configCount).toBe(2);
        expect(meta.configIds).toEqual(['nissan', 'chocolate']);
        expect(meta.commonSettings).toEqual({ initialKeywordDetection: true });
    });
});

describe('background.js の AEON baseline 補助関数', () => {
    test('1ページ目指定では元URLを維持する', () => {
        const { buildAeonProductListPageUrl } = loadScriptFunctions('../../src/background/background.js', [
            'buildAeonProductListPageUrl'
        ]);

        const url = 'https://www.aeonretail.com/Form/Product/ProductList.aspx?gspsk=pkcg-all';
        expect(buildAeonProductListPageUrl(url, 1)).toBe(url);
    });

    test('2ページ目以降では psc と gspsp を上書きして生成する', () => {
        const { buildAeonProductListPageUrl } = loadScriptFunctions('../../src/background/background.js', [
            'buildAeonProductListPageUrl'
        ]);

        const second = new URL(buildAeonProductListPageUrl(
            'https://www.aeonretail.com/Form/Product/ProductList.aspx?gspsk=pkcg-all',
            2
        ));
        const third = new URL(buildAeonProductListPageUrl(
            'https://www.aeonretail.com/Form/Product/ProductList.aspx?gspsp=1&psc=1&gspsk=%E3%83%86%E3%82%B9%E3%83%88',
            3
        ));

        expect(second.searchParams.get('psc')).toBe('2');
        expect(second.searchParams.get('gspsp')).toBe('2');
        expect(second.searchParams.get('gspsk')).toBe('pkcg-all');

        expect(third.searchParams.get('psc')).toBe('3');
        expect(third.searchParams.get('gspsp')).toBe('3');
        expect(third.searchParams.get('gspsk')).toBe('テスト');
    });
});

describe('background.js の single キーワード判定補助関数', () => {
    test('複数一致のうち1件だけ在庫ありでも appear で検知する', () => {
        const { evaluateSingleKeywordDetection } = loadScriptFunctions('../../src/background/background.js', [
            'summarizeSingleKeywordMatches',
            'evaluateSingleKeywordDetection'
        ]);

        expect(evaluateSingleKeywordDetection([
            '在庫なし',
            '在庫あり',
            '販売準備中'
        ], '在庫あり', 'appear')).toEqual({
            texts: ['在庫なし', '在庫あり', '販売準備中'],
            count: 3,
            matchedIndexes: [1],
            representativeText: '在庫あり',
            hasAnyKeyword: true,
            detected: true
        });
    });

    test('複数一致の一部に在庫なしが残る限り disappear では未検知にする', () => {
        const { evaluateSingleKeywordDetection } = loadScriptFunctions('../../src/background/background.js', [
            'summarizeSingleKeywordMatches',
            'evaluateSingleKeywordDetection'
        ]);

        expect(evaluateSingleKeywordDetection([
            '販売準備中',
            '在庫なし',
            '販売終了'
        ], '在庫なし', 'disappear')).toEqual({
            texts: ['販売準備中', '在庫なし', '販売終了'],
            count: 3,
            matchedIndexes: [1],
            representativeText: '在庫なし',
            hasAnyKeyword: true,
            detected: false
        });
    });

    test('一致要素が0件なら disappear でも未検知のまま扱う', () => {
        const { evaluateSingleKeywordDetection } = loadScriptFunctions('../../src/background/background.js', [
            'summarizeSingleKeywordMatches',
            'evaluateSingleKeywordDetection'
        ]);

        expect(evaluateSingleKeywordDetection([], '在庫なし', 'disappear')).toEqual({
            texts: [],
            count: 0,
            matchedIndexes: [],
            representativeText: '',
            hasAnyKeyword: false,
            detected: false
        });
    });
});

describe('background.js の waitForTabComplete', () => {
    test('開始時点で complete なら onUpdated を待たずに完了する', async () => {
        const addListener = jest.fn();
        const removeListener = jest.fn();
        const get = jest.fn().mockResolvedValue({ status: 'complete' });

        const { waitForTabComplete } = loadScriptFunctions('../../src/background/background.js', [
            'waitForTabComplete'
        ], {
            chrome: {
                tabs: {
                    get,
                    onUpdated: {
                        addListener,
                        removeListener
                    }
                }
            }
        });

        await expect(waitForTabComplete(123, 10)).resolves.toBeUndefined();
        expect(get).toHaveBeenCalledWith(123);
        expect(addListener).not.toHaveBeenCalled();
        expect(removeListener).not.toHaveBeenCalled();
    });
});

describe('background.js の waitForPageReady', () => {
    test('固定セレクタがなくても readyState と body content があれば完了する', async () => {
        const chrome = {
            tabs: {
                get: jest.fn().mockResolvedValue({ status: 'complete' })
            },
            scripting: {
                executeScript: jest.fn().mockResolvedValue([{
                    result: {
                        readyState: 'complete',
                        isReady: true,
                        hasContent: true,
                        hasTargetSelector: false,
                        bodyChildrenCount: 2
                    }
                }])
            }
        };

        const { waitForPageReady } = loadScriptFunctions('../../src/background/background.js', [
            'resolveWaitForPageReadyOptions',
            'waitForPageReady'
        ], {
            chrome,
            pageReadyLocks: new Map(),
            logger: {
                debug: () => {},
                info: () => {},
                warn: () => {},
                error: () => {}
            }
        });

        await expect(waitForPageReady(123)).resolves.toBe(true);
        expect(chrome.scripting.executeScript).toHaveBeenCalledTimes(1);
        expect(chrome.scripting.executeScript.mock.calls[0][0].args).toEqual(['']);
    });

    test('オプション指定時は targetSelector を診断用に executeScript へ渡す', async () => {
        const chrome = {
            tabs: {
                get: jest.fn().mockResolvedValue({ status: 'complete' })
            },
            scripting: {
                executeScript: jest.fn().mockResolvedValue([{
                    result: {
                        readyState: 'complete',
                        isReady: true,
                        hasContent: true,
                        hasTargetSelector: true,
                        bodyChildrenCount: 2
                    }
                }])
            }
        };

        const { waitForPageReady } = loadScriptFunctions('../../src/background/background.js', [
            'resolveWaitForPageReadyOptions',
            'waitForPageReady'
        ], {
            chrome,
            pageReadyLocks: new Map(),
            logger: {
                debug: () => {},
                info: () => {},
                warn: () => {},
                error: () => {}
            }
        });

        await expect(waitForPageReady(456, {
            maxWaitTime: 1000,
            targetSelector: '#form1 dd'
        })).resolves.toBe(true);
        expect(chrome.scripting.executeScript.mock.calls[0][0].args).toEqual(['#form1 dd']);
    });
});

describe('background.js の判定正規化関数', () => {
    test('appear モードでキーワード検出時は detected を返す', () => {
        const { normalizeSingleKeywordDetectionResult } = loadScriptFunctions('../../src/background/background.js', [
            'resolveSingleKeywordDetectMode',
            'classifySingleKeywordDetectionError',
            'normalizeSingleKeywordDetectionResult'
        ]);

        const result = normalizeSingleKeywordDetectionResult({
            hasKeyword: true,
            detectMode: 'appear',
            keyword: '在庫あり'
        });

        expect(result.hasKeyword).toBe(true);
        expect(result.decision).toBe('detected');
    });

    test('appear モードでキーワード未検出時は not_detected を返す', () => {
        const { normalizeSingleKeywordDetectionResult } = loadScriptFunctions('../../src/background/background.js', [
            'resolveSingleKeywordDetectMode',
            'classifySingleKeywordDetectionError',
            'normalizeSingleKeywordDetectionResult'
        ]);

        const result = normalizeSingleKeywordDetectionResult({
            hasKeyword: false,
            detectMode: 'appear',
            keyword: '在庫あり'
        });

        expect(result.hasKeyword).toBe(false);
        expect(result.decision).toBe('not_detected');
    });

    test('disappear モードでキーワード検出時は not_detected を返す', () => {
        const { normalizeSingleKeywordDetectionResult } = loadScriptFunctions('../../src/background/background.js', [
            'resolveSingleKeywordDetectMode',
            'classifySingleKeywordDetectionError',
            'normalizeSingleKeywordDetectionResult'
        ]);

        const result = normalizeSingleKeywordDetectionResult({
            hasKeyword: true,
            detectMode: 'disappear',
            keyword: '在庫なし'
        });

        expect(result.hasKeyword).toBe(true);
        expect(result.decision).toBe('not_detected');
    });

    test('disappear モードでキーワード未検出時は detected を返す', () => {
        const { normalizeSingleKeywordDetectionResult } = loadScriptFunctions('../../src/background/background.js', [
            'resolveSingleKeywordDetectMode',
            'classifySingleKeywordDetectionError',
            'normalizeSingleKeywordDetectionResult'
        ]);

        const result = normalizeSingleKeywordDetectionResult({
            hasKeyword: false,
            detectMode: 'disappear',
            keyword: '在庫なし'
        });

        expect(result.hasKeyword).toBe(false);
        expect(result.decision).toBe('detected');
    });

    test('detectMode 未指定時は appear 扱いとする', () => {
        const { normalizeSingleKeywordDetectionResult } = loadScriptFunctions('../../src/background/background.js', [
            'resolveSingleKeywordDetectMode',
            'classifySingleKeywordDetectionError',
            'normalizeSingleKeywordDetectionResult'
        ]);

        const result = normalizeSingleKeywordDetectionResult({
            hasKeyword: true,
            keyword: '在庫あり'
        });

        expect(result.decision).toBe('detected');
    });

    test('hasKeyword 未指定時は pending を返す', () => {
        const { normalizeSingleKeywordDetectionResult } = loadScriptFunctions('../../src/background/background.js', [
            'resolveSingleKeywordDetectMode',
            'classifySingleKeywordDetectionError',
            'normalizeSingleKeywordDetectionResult'
        ]);

        const result = normalizeSingleKeywordDetectionResult({
            detectMode: 'appear',
            keyword: '在庫あり'
        });

        expect(result.hasKeyword).toBeNull();
        expect(result.decision).toBe('pending');
    });

    test('追加フィールドは結果に引き継がれる', () => {
        const { normalizeSingleKeywordDetectionResult } = loadScriptFunctions('../../src/background/background.js', [
            'resolveSingleKeywordDetectMode',
            'classifySingleKeywordDetectionError',
            'normalizeSingleKeywordDetectionResult'
        ]);

        const result = normalizeSingleKeywordDetectionResult({
            hasKeyword: true,
            detectMode: 'appear',
            keyword: '在庫あり',
            text: '在庫あり',
            fullText: '在庫あり',
            texts: ['在庫あり', '販売準備中']
        });

        expect(result.text).toBe('在庫あり');
        expect(result.fullText).toBe('在庫あり');
        expect(result.count).toBe(2);
    });
});

describe('background.js startAllMonitoring 設定保持', () => {
    test('開始要求が 1 件でも保存済み multiple_configs は 2 件のまま維持する', () => {
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'buildPersistedConfigForStartAllMonitoring'
        ]);

        const currentConfig = {
            mode: 'multiple',
            single_config: {},
            multiple_configs: [{ id: 'a', enabled: true }, { id: 'b', enabled: true }],
            multiple_common_settings: { interval: 20 }
        };
        const request = {
            configs: [{ id: 'a', enabled: true }],
            commonSettings: { interval: 30 }
        };

        const result = functions.buildPersistedConfigForStartAllMonitoring(
            currentConfig,
            request,
            '2026-08-31T12:00:00.000Z'
        );

        expect(result.multiple_configs).toEqual(currentConfig.multiple_configs);
        expect(result.multiple_configs).toHaveLength(2);
        expect(result).not.toHaveProperty('multiple_targets');
        expect(result.multiple_common_settings).toEqual({ interval: 30 });
        expect(result.last_updated).toBe('2026-08-31T12:00:00.000Z');
    });

    test('disabled を含む保存済み一覧を開始要求 subset で欠落させない', () => {
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'buildPersistedConfigForStartAllMonitoring'
        ]);

        const disabledConfig = { id: 'b', enabled: false };
        const currentConfig = {
            mode: 'multiple',
            multiple_configs: [{ id: 'a', enabled: true }, disabledConfig],
            multiple_common_settings: { duration: 60 }
        };
        const request = {
            configs: [{ id: 'a', enabled: true }],
            commonSettings: { duration: 120 }
        };

        const result = functions.buildPersistedConfigForStartAllMonitoring(currentConfig, request);

        expect(result.multiple_configs).toHaveLength(2);
        expect(result.multiple_configs[1]).toEqual(disabledConfig);
        expect(result.multiple_common_settings).toEqual({ duration: 120 });
    });

});

// Note: resolveBgLogHighlight テストは共有 LogHighlight への移行に伴い削除
// ログハイライトは shared/lib/logging/log-highlight.js のパターンで処理される

describe('background.js の抽出対象 message handler', () => {
    const loadHandlers = (extraContext) => loadScriptFunctions(
        '../../src/background/background.js',
        [
            'handleQuickCaptureMessage',
            'handleStartAllMonitoringMessage',
            'handleExportMonitoringSettingsMessage',
            'handleImportMonitoringSettingsMessage'
        ],
        {
            bgLogInfo: jest.fn(),
            bgLogError: jest.fn(),
            logger: { debug: jest.fn() },
            ...extraContext
        }
    );

    test('quickCapture はPNGとHTMLを保存して既存の成功応答を返す', async () => {
        const FileSave = {
            saveScreenshot: jest.fn().mockResolvedValue({ downloadId: 1, filename: 'Screenshot.png' }),
            saveHtml: jest.fn().mockResolvedValue({ downloadId: 2, filename: 'PageSource.html' })
        };
        const sendResponse = jest.fn();
        const chrome = {
            tabs: {
                get: jest.fn().mockResolvedValue({ id: 7, url: 'https://example.com', windowId: 3 }),
                captureVisibleTab: jest.fn().mockResolvedValue('data:image/png;base64,abc')
            },
            scripting: {
                executeScript: jest.fn().mockResolvedValue([{ result: '<html>page</html>' }])
            }
        };
        const { handleQuickCaptureMessage } = loadHandlers({
            chrome,
            FileSave,
            generateFilename: jest.fn((type) => type)
        });

        await handleQuickCaptureMessage({ tabId: 7, settings: {} }, sendResponse);

        expect(FileSave.saveScreenshot).toHaveBeenCalledWith({
            dataUrl: 'data:image/png;base64,abc',
            filename: 'Screenshot.png'
        });
        expect(FileSave.saveHtml).toHaveBeenCalledWith({
            html: '<html>page</html>',
            filename: 'PageSource.html'
        });
        expect(sendResponse).toHaveBeenCalledWith({
            status: 'success',
            message: '即座取得完了',
            files: { screenshot: 'Screenshot.png', html: 'PageSource.html' }
        });
    });

    test('quickCapture は指定URLを一時タブで取得後に元タブへ戻して閉じる', async () => {
        const FileSave = {
            saveScreenshot: jest.fn().mockResolvedValue({ downloadId: 1, filename: 'Screenshot.png' }),
            saveHtml: jest.fn().mockResolvedValue({ downloadId: 2, filename: 'PageSource.html' })
        };
        const sendResponse = jest.fn();
        const waitForPageReady = jest.fn().mockResolvedValue(true);
        const chrome = {
            tabs: {
                query: jest.fn().mockResolvedValue([{ id: 1 }]),
                create: jest.fn().mockResolvedValue({ id: 9 }),
                get: jest.fn().mockResolvedValue({ id: 9, url: 'https://example.com/item', windowId: 3 }),
                update: jest.fn().mockResolvedValue({}),
                remove: jest.fn().mockResolvedValue(),
                captureVisibleTab: jest.fn().mockResolvedValue('data:image/png;base64,abc')
            },
            scripting: {
                executeScript: jest.fn().mockResolvedValue([{ result: '<html>page</html>' }])
            }
        };
        const { handleQuickCaptureMessage } = loadHandlers({
            chrome,
            waitForPageReady,
            FileSave,
            generateFilename: jest.fn((type) => type)
        });

        await handleQuickCaptureMessage({
            tabId: null,
            settings: { monitorType: 'url', targetUrl: 'https://example.com/item' }
        }, sendResponse);

        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com/item', active: true });
        expect(waitForPageReady).toHaveBeenCalledWith(9);
        expect(chrome.scripting.executeScript).toHaveBeenCalledWith(expect.objectContaining({ target: { tabId: 9 } }));
        expect(chrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
        expect(chrome.tabs.remove).toHaveBeenCalledWith(9);
        expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    test('quickCapture はChrome内部ページを分かりやすく拒否する', async () => {
        const sendResponse = jest.fn();
        const { handleQuickCaptureMessage } = loadHandlers({
            chrome: {
                tabs: {
                    get: jest.fn().mockResolvedValue({ id: 7, url: 'chrome://extensions/', windowId: 3 })
                }
            }
        });

        await handleQuickCaptureMessage({ tabId: 7, settings: {} }, sendResponse);

        expect(sendResponse).toHaveBeenCalledWith({
            status: 'error',
            error: 'Chrome内部ページは即座取得できません。通常のWebページを選択してください'
        });
    });

    test('quickCapture はChrome API失敗時に既存のエラー応答を返す', async () => {
        const sendResponse = jest.fn();
        const { handleQuickCaptureMessage } = loadHandlers({
            chrome: { tabs: { get: jest.fn().mockRejectedValue(new Error('tab not found')) } }
        });

        await handleQuickCaptureMessage({ tabId: 7, settings: {} }, sendResponse);

        expect(sendResponse).toHaveBeenCalledWith({ status: 'error', error: 'tab not found' });
    });

    const createStartAllMonitoringContext = (overrides = {}) => {
        const requestMeta = {
            requestId: 'request-1',
            receivedAt: '2026-09-08T00:00:00.000Z',
            configCount: 2,
            configIds: ['a', 'b'],
            commonSettings: { interval: 30 }
        };
        const persistedConfig = {
            mode: 'multiple',
            multiple_configs: [{ id: 'a' }, { id: 'b' }]
        };

        return {
            resolveStartAllMonitoringRequestMeta: jest.fn(() => requestMeta),
            buildPersistedConfigForStartAllMonitoring: jest.fn(() => persistedConfig),
            summarizeStartAllMonitoringResults: jest.fn((results) => ({
                total: results.length,
                successCount: results.filter((result) => result.success).length,
                failureCount: results.filter((result) => !result.success).length
            })),
            runMultipleMonitoringStartConfigs: jest.fn(),
            configManager: {
                loadConfig: jest.fn().mockResolvedValue({ multiple_configs: [{ id: 'a' }, { id: 'b' }] }),
                saveConfig: jest.fn().mockResolvedValue(true)
            },
            requestMeta,
            persistedConfig,
            ...overrides
        };
    };

    test('startAllMonitoring は設定なしで保存・開始せず既存の失敗応答を返す', async () => {
        const context = createStartAllMonitoringContext();
        const sendResponse = jest.fn();
        const { handleStartAllMonitoringMessage } = loadHandlers(context);

        await handleStartAllMonitoringMessage({ configs: [] }, sendResponse);

        expect(context.configManager.loadConfig).not.toHaveBeenCalled();
        expect(context.configManager.saveConfig).not.toHaveBeenCalled();
        expect(context.runMultipleMonitoringStartConfigs).not.toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledWith({
            success: false,
            error: '複数監視設定が提供されていないか、空です',
            message: '複数監視の開始に失敗しました'
        });
    });

    test('startAllMonitoring は設定保存失敗時に開始せず既存の失敗応答を返す', async () => {
        const context = createStartAllMonitoringContext({
            configManager: {
                loadConfig: jest.fn().mockResolvedValue({ multiple_configs: [{ id: 'a' }, { id: 'b' }] }),
                saveConfig: jest.fn().mockResolvedValue(false)
            }
        });
        const sendResponse = jest.fn();
        const { handleStartAllMonitoringMessage } = loadHandlers(context);

        await handleStartAllMonitoringMessage({ configs: [{ id: 'a' }] }, sendResponse);

        expect(context.configManager.saveConfig).toHaveBeenCalledWith(context.persistedConfig);
        expect(context.runMultipleMonitoringStartConfigs).not.toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledWith({
            success: false,
            error: '複数監視設定の保存に失敗しました',
            message: '複数監視の開始に失敗しました'
        });
    });

    test('startAllMonitoring は全件成功の開始結果と保存処理を返す', async () => {
        const results = [{ success: true, tabId: 1 }, { success: true, tabId: 2 }];
        const context = createStartAllMonitoringContext({
            runMultipleMonitoringStartConfigs: jest.fn().mockResolvedValue(results)
        });
        const sendResponse = jest.fn();
        const request = { configs: [{ id: 'a' }, { id: 'b' }], commonSettings: { interval: 30 } };
        const { handleStartAllMonitoringMessage } = loadHandlers(context);

        await handleStartAllMonitoringMessage(request, sendResponse);

        expect(context.configManager.saveConfig).toHaveBeenCalledWith(context.persistedConfig);
        expect(context.runMultipleMonitoringStartConfigs).toHaveBeenCalledWith(request, context.requestMeta);
        expect(sendResponse).toHaveBeenCalledWith({
            success: true,
            message: '複数監視を開始しました（成功: 2件、失敗: 0件）',
            results,
            successCount: 2,
            failureCount: 0,
            requestId: 'request-1'
        });
    });

    test('startAllMonitoring は部分成功の開始結果を返す', async () => {
        const results = [{ success: true, tabId: 1 }, { success: false, error: 'tab create failed' }];
        const context = createStartAllMonitoringContext({
            runMultipleMonitoringStartConfigs: jest.fn().mockResolvedValue(results)
        });
        const sendResponse = jest.fn();
        const { handleStartAllMonitoringMessage } = loadHandlers(context);

        await handleStartAllMonitoringMessage({ configs: [{ id: 'a' }, { id: 'b' }] }, sendResponse);

        expect(context.configManager.saveConfig).toHaveBeenCalledWith(context.persistedConfig);
        expect(context.runMultipleMonitoringStartConfigs).toHaveBeenCalledTimes(1);
        expect(sendResponse).toHaveBeenCalledWith({
            success: true,
            message: '複数監視を開始しました（成功: 1件、失敗: 1件）',
            results,
            successCount: 1,
            failureCount: 1,
            requestId: 'request-1'
        });
    });

    test('exportMonitoringSettings はCSVをダウンロードして既存の成功応答を返す', async () => {
        const sendResponse = jest.fn();
        const FileSave = {
            download: jest.fn().mockResolvedValue({ downloadId: 42 })
        };
        const { handleExportMonitoringSettingsMessage } = loadHandlers({
            btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
            configManager: {
                exportToExcel: jest.fn().mockResolvedValue({
                    success: true,
                    filename: 'settings.csv',
                    format: 'csv',
                    message: 'exported',
                    blob: { size: 1, arrayBuffer: async () => new Uint8Array([65]).buffer }
                })
            },
            FileSave,
            chrome: { downloads: { onChanged: { addListener: jest.fn() } } }
        });

        await handleExportMonitoringSettingsMessage(sendResponse);

        expect(FileSave.download).toHaveBeenCalledWith({
            url: 'data:text/csv;charset=utf-8;base64,QQ==',
            filename: 'settings.csv',
            saveAs: false
        });
        expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            download_id: 42,
            filename: 'settings.csv',
            download_method: 'chrome_downloads_api',
            format: 'csv',
            message: 'exported'
        }));
    });

    test('exportMonitoringSettings はexport失敗時に既存のエラー応答を返す', async () => {
        const sendResponse = jest.fn();
        const { handleExportMonitoringSettingsMessage } = loadHandlers({
            configManager: { exportToExcel: jest.fn().mockResolvedValue({ success: false, error: 'export failed' }) }
        });

        await handleExportMonitoringSettingsMessage(sendResponse);

        expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'export failed' });
    });

    test('importMonitoringSettings は入力不足時に既存のエラー応答を返す', async () => {
        const sendResponse = jest.fn();
        const { handleImportMonitoringSettingsMessage } = loadHandlers({});

        await handleImportMonitoringSettingsMessage({ file_data: [] }, sendResponse);

        expect(sendResponse).toHaveBeenCalledWith({
            success: false,
            error: 'ファイルデータまたはファイル名が指定されていません'
        });
    });

    test('importMonitoringSettings は成功後にA定時予約を再同期し、結果を返す', async () => {
        class MockFile {
            constructor(parts, name) {
                this.parts = parts;
                this.name = name;
                this.size = parts[0].length;
                this.type = '';
            }
        }
        const sendResponse = jest.fn();
        const importFromExcel = jest.fn()
            .mockResolvedValueOnce({ success: true, imported_count: 2, warnings: ['warning'], errors: [] })
            .mockResolvedValueOnce({ success: false, errors: ['invalid csv'], warnings: ['warning'] });
        const importedConfig = { mode: 'multiple', multiple_configs: [{ id: 'a', enabled: true }] };
        const syncMultipleMonitoringSchedule = jest.fn().mockResolvedValue({
            enabled: true,
            scheduleEnabled: true,
            scheduleTime: '15:30',
            targetCount: 1,
            nextRunAt: 123,
            reason: null
        });
        const { handleImportMonitoringSettingsMessage } = loadHandlers({
            File: MockFile,
            configManager: { importFromExcel, loadConfig: jest.fn().mockResolvedValue(importedConfig) },
            syncMultipleMonitoringSchedule
        });

        await handleImportMonitoringSettingsMessage({ file_data: [65], filename: 'settings.csv' }, sendResponse);
        await handleImportMonitoringSettingsMessage({ file_data: [66], filename: 'settings.csv' }, sendResponse);

        expect(sendResponse).toHaveBeenNthCalledWith(1, {
            success: true,
            imported_count: 2,
            warnings: ['warning'],
            errors: [],
            message: '2件の監視設定をインポートしました',
            multipleSchedule: {
                enabled: true,
                scheduleEnabled: true,
                scheduleTime: '15:30',
                targetCount: 1,
                nextRunAt: 123,
                reason: null
            }
        });
        expect(syncMultipleMonitoringSchedule).toHaveBeenCalledWith(importedConfig);
        expect(sendResponse).toHaveBeenNthCalledWith(2, {
            success: false,
            error: 'invalid csv',
            errors: ['invalid csv'],
            warnings: ['warning']
        });
    });
});

describe('定時監視の共有ファイル保存', () => {
    test('基準・検知保存は旧ダウンロードAPIを参照せず、FileSave APIを使用する', () => {
        const source = fs.readFileSync(
            path.resolve(__dirname, '../../src/background/background.js'),
            'utf8'
        );
        const scheduledStart = source.indexOf('async function handleMultiSiteDetection(');
        const scheduledEnd = source.indexOf('// ============================================================\n// スケジュール監視（単一サイト）', scheduledStart);
        const scheduledSource = source.slice(scheduledStart, scheduledEnd);

        expect(scheduledSource).not.toMatch(/\bdownload(?:WithFilename|DataUrl)\b/);
        expect(scheduledSource).toContain('FileSave.saveScreenshot');
        expect(scheduledSource).toContain('FileSave.saveHtml');
        expect(scheduledSource).toContain('FileSave.download');
    });

    test('基準証跡はPNG・HTML・テキストをFileSaveへ保存する', async () => {
        const FileSave = {
            saveScreenshot: jest.fn().mockResolvedValue({ downloadId: 1 }),
            saveHtml: jest.fn().mockResolvedValue({ downloadId: 2 }),
            download: jest.fn().mockResolvedValue({ downloadId: 3 })
        };
        const { saveScheduledStockBaselineArtifacts } = loadScriptFunctions(
            '../../src/background/background.js',
            ['saveScheduledStockBaselineArtifacts'],
            {
                FileSave,
                buildAeonStockDownloadPath: jest.fn((kind, _date, ext) => `${kind}/artifact.${ext}`),
                captureWatchTabScreenshot: jest.fn().mockResolvedValue('data:image/png;base64,abc'),
                captureTabHtml: jest.fn().mockResolvedValue('<html>baseline</html>'),
                buildBaselineLogText: jest.fn().mockReturnValue('baseline log'),
                logger: { info: jest.fn(), warn: jest.fn() }
            }
        );

        await saveScheduledStockBaselineArtifacts(
            { siteName: 'テストサイト', targetUrl: 'https://example.com/item' },
            { count: 1 },
            7
        );

        expect(FileSave.saveScreenshot).toHaveBeenCalledWith({
            filename: 'baseline/artifact.png',
            dataUrl: 'data:image/png;base64,abc'
        });
        expect(FileSave.saveHtml).toHaveBeenCalledWith({
            filename: 'baseline/artifact.html',
            html: '<html>baseline</html>'
        });
        expect(FileSave.download).toHaveBeenCalledWith({
            filename: 'baseline/artifact.txt',
            textContent: 'baseline log',
            mimeType: 'text/plain;charset=utf-8'
        });
    });

    test('基準PNG保存に失敗してもHTMLとテキストの保存を継続する', async () => {
        const FileSave = {
            saveScreenshot: jest.fn().mockRejectedValue(new Error('PNG保存失敗')),
            saveHtml: jest.fn().mockResolvedValue({ downloadId: 2 }),
            download: jest.fn().mockResolvedValue({ downloadId: 3 })
        };
        const logger = { info: jest.fn(), warn: jest.fn() };
        const { saveScheduledStockBaselineArtifacts } = loadScriptFunctions(
            '../../src/background/background.js',
            ['saveScheduledStockBaselineArtifacts'],
            {
                FileSave,
                buildAeonStockDownloadPath: jest.fn((kind, _date, ext) => `${kind}/artifact.${ext}`),
                captureWatchTabScreenshot: jest.fn().mockResolvedValue('data:image/png;base64,abc'),
                captureTabHtml: jest.fn().mockResolvedValue('<html>baseline</html>'),
                buildBaselineLogText: jest.fn().mockReturnValue('baseline log'),
                logger
            }
        );

        await saveScheduledStockBaselineArtifacts(
            { siteName: 'テストサイト', targetUrl: 'https://example.com/item' },
            { count: 1 },
            7
        );

        expect(logger.warn).toHaveBeenCalledWith('baseline PNG 保存失敗:', 'PNG保存失敗');
        expect(FileSave.saveHtml).toHaveBeenCalledTimes(1);
        expect(FileSave.download).toHaveBeenCalledTimes(1);
    });
});

describe('background.js のログ重複抑止分類', () => {
    const LogLevel = {
        ERROR: 1,
        WARNING: 2,
        INFO: 3,
        DEBUG: 4
    };

    function loadLogFunctions(extraContext = {}) {
        return loadScriptFunctions('../../src/background/background.js', [
            'normalizeLogScope',
            'buildLogSuppressionKey',
            'shouldSuppressLog',
            'bgLogInfo',
            'bgLogProgress'
        ], {
            LogLevel,
            LogCategory: {
                RESULT: 'result',
                OPERATION: 'operation',
                PROGRESS: 'progress',
                DIAGNOSTIC: 'diagnostic'
            },
            lastLogCache: new Map(),
            logCacheTimeout: 5000,
            getEffectiveLogLevel: () => LogLevel.DEBUG,
            writeBgConsole: jest.fn(),
            ...extraContext
        });
    }

    test('同一イベント・同一scopeの周期進捗だけを5秒間抑止する', () => {
        const { shouldSuppressLog } = loadLogFunctions();
        const entry = {
            level: LogLevel.INFO,
            category: 'progress',
            event: 'scheduled-watch-tick',
            scope: { siteId: 'aeon-pokemon', scheduleIndex: 0 }
        };

        expect(shouldSuppressLog(entry, 1000)).toBe(false);
        expect(shouldSuppressLog(entry, 5999)).toBe(true);
        expect(shouldSuppressLog(entry, 6000)).toBe(false);
    });

    test('scopeのキー順は安定化し、対象が異なれば同一イベントでも抑止しない', () => {
        const { buildLogSuppressionKey, shouldSuppressLog } = loadLogFunctions();
        const first = {
            level: LogLevel.INFO,
            category: 'progress',
            event: 'periodic-reload-start',
            scope: { tabId: 101, monitoringSystem: 'A' }
        };
        const reordered = {
            ...first,
            scope: { monitoringSystem: 'A', tabId: 101 }
        };
        const differentTab = {
            ...first,
            scope: { tabId: 102, monitoringSystem: 'A' }
        };
        const differentSchedule = {
            ...first,
            event: 'scheduled-watch-tick',
            scope: { siteId: 'aeon-pokemon', scheduleIndex: 1 }
        };

        expect(buildLogSuppressionKey(first)).toBe(buildLogSuppressionKey(reordered));
        expect(shouldSuppressLog(first, 1000)).toBe(false);
        expect(shouldSuppressLog(reordered, 1001)).toBe(true);
        expect(shouldSuppressLog(differentTab, 1001)).toBe(false);
        expect(shouldSuppressLog(differentSchedule, 1001)).toBe(false);
    });

    test('終端・結果・操作・設定、およびWARN / ERRORは抑止しない', () => {
        const { shouldSuppressLog } = loadLogFunctions();
        const terminal = {
            level: LogLevel.INFO,
            category: 'result',
            event: 'single-session-stopped',
            scope: { sessionId: 'session-1' }
        };
        const operation = {
            level: LogLevel.INFO,
            category: 'operation',
            event: 'config-saved',
            scope: { configId: 'config-1' }
        };
        const warning = {
            level: LogLevel.WARNING,
            category: 'progress',
            event: 'scheduled-watch-tick',
            scope: { siteId: 'aeon-pokemon', scheduleIndex: 0 }
        };
        const error = { ...warning, level: LogLevel.ERROR };

        expect(shouldSuppressLog(terminal, 1000)).toBe(false);
        expect(shouldSuppressLog(terminal, 1001)).toBe(false);
        expect(shouldSuppressLog(operation, 1000)).toBe(false);
        expect(shouldSuppressLog(operation, 1001)).toBe(false);
        expect(shouldSuppressLog(warning, 1000)).toBe(false);
        expect(shouldSuppressLog(warning, 1001)).toBe(false);
        expect(shouldSuppressLog(error, 1000)).toBe(false);
        expect(shouldSuppressLog(error, 1001)).toBe(false);
    });

    test('通常INFOは抑止せず、周期進捗だけが専用ヘルパーで抑止される', () => {
        const writeBgConsole = jest.fn();
        const { bgLogInfo, bgLogProgress } = loadLogFunctions({ writeBgConsole });

        bgLogInfo('🛑 系統Aセッション停止完了', { sessionId: 'session-1' });
        bgLogInfo('🛑 系統Aセッション停止完了', { sessionId: 'session-2' });
        bgLogProgress('⏰ Tick実行', {
            event: 'scheduled-watch-tick',
            scope: { siteId: 'aeon-pokemon', scheduleIndex: 0 }
        });
        bgLogProgress('⏰ Tick実行', {
            event: 'scheduled-watch-tick',
            scope: { siteId: 'aeon-pokemon', scheduleIndex: 0 }
        });

        expect(writeBgConsole).toHaveBeenCalledTimes(3);
        expect(writeBgConsole).toHaveBeenNthCalledWith(
            1,
            'log',
            '🛑 系統Aセッション停止完了',
            { sessionId: 'session-1' }
        );
        expect(writeBgConsole).toHaveBeenNthCalledWith(
            2,
            'log',
            '🛑 系統Aセッション停止完了',
            { sessionId: 'session-2' }
        );
    });
});
