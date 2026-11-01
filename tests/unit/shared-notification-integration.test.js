const fs = require('fs');
const path = require('path');
const { loadScriptFunctions } = require('../helpers/load-source-functions');

describe('共有通知基盤の統合', () => {
    test('共有Chrome通知は検知種別ごとの文言を使い、失敗を送出しない', async () => {
        const show = jest
            .fn()
            .mockResolvedValueOnce({ success: true, notificationId: 'notification-1' })
            .mockRejectedValueOnce(new Error('notifications_disabled'));
        const bgLogWarn = jest.fn();
        const { showInventoryDetectionNotification } = loadScriptFunctions('../../src/background/background.js', [
            'showInventoryDetectionNotification'
        ], { ChromeNotify: { show }, bgLogWarn });

        await expect(showInventoryDetectionNotification({
            type: 'keyword', detectMode: 'appear', keyword: '在庫あり', targetUrl: 'https://example.test/product'
        })).resolves.toMatchObject({ success: true });
        expect(show).toHaveBeenCalledWith(expect.objectContaining({
            title: '在庫を検知', message: expect.stringContaining('出現を検知: 在庫あり')
        }));

        await expect(showInventoryDetectionNotification({
            type: 'stock_diff', previousCount: 1, currentCount: 2, newUrlCount: 1
        })).resolves.toEqual({ success: false, error: 'notifications_disabled' });
        expect(bgLogWarn).toHaveBeenCalledWith('❌ 在庫差分を検知通知の表示に失敗しました:', 'notifications_disabled');
    });

    test('外部送信は既存の PAGE_RECORDER_STOCK_DETECTED payload を維持する', async () => {
        const send = jest.fn(async () => ({ success: true, response: { accepted: true } }));
        const bgLogInfo = jest.fn();
        const { notifyExternalExtension } = loadScriptFunctions('../../src/background/background.js', [
            'notifyExternalExtension'
        ], {
            ExternalMessaging: { send },
            bgLogInfo,
            bgLogWarn: jest.fn()
        });

        const response = await notifyExternalExtension({
            notifyExternalExtension: true,
            externalExtensionId: 'receiver-extension'
        }, ['https://example.test/product'], {
            targetUrl: 'https://example.test/list',
            title: '在庫差分',
            currentCount: 3
        }, {
            siteId: 'aeon',
            discordChannelId: 'channel-1'
        });

        expect(response).toEqual({ accepted: true });
        expect(send).toHaveBeenCalledWith({
            extensionId: 'receiver-extension',
            message: {
                type: 'PAGE_RECORDER_STOCK_DETECTED',
                source: 'PageRecorder',
                siteId: 'aeon',
                discordChannelId: 'channel-1',
                urls: ['https://example.test/product'],
                targetUrl: 'https://example.test/list',
                title: '在庫差分',
                count: 3
            }
        });
        expect(bgLogInfo).toHaveBeenCalledWith('✅ 他拡張通知処理成功', expect.any(Object));
    });

    test('外部送信失敗は結果を返して監視処理へ例外を送出しない', async () => {
        const bgLogWarn = jest.fn();
        const { notifyExternalExtension } = loadScriptFunctions('../../src/background/background.js', [
            'notifyExternalExtension'
        ], {
            ExternalMessaging: { send: jest.fn(async () => ({ success: false, error: 'receiver_unavailable' })) },
            bgLogInfo: jest.fn(),
            bgLogWarn
        });

        await expect(notifyExternalExtension({
            notifyExternalExtension: true,
            externalExtensionId: 'receiver-extension'
        }, ['https://example.test/product'], {
            targetUrl: 'https://example.test/list',
            title: '在庫差分',
            currentCount: 1
        })).resolves.toEqual({ success: false, error: 'receiver_unavailable' });

        expect(bgLogWarn).toHaveBeenCalledWith('❌ 他拡張通知失敗:', 'receiver_unavailable');
    });

    test('targetpage 通知は既存 payload に識別子を追加する', async () => {
        const send = jest.fn(async () => ({ success: true, response: { accepted: true } }));
        const { notifyExternalExtension, buildTargetpageNotificationOptions } = loadScriptFunctions('../../src/background/background.js', [
            'notifyExternalExtension', 'buildTargetpageNotificationOptions'
        ], { ExternalMessaging: { send }, bgLogInfo: jest.fn(), bgLogWarn: jest.fn() });
        const options = buildTargetpageNotificationOptions({
            targetpage: { id: 'sevennet-test', environment: 'test', siteId: 'sevennet' }
        }, 'session-1', '2026-10-14T00:00:00.000Z');

        await notifyExternalExtension({ notifyExternalExtension: true, externalExtensionId: 'receiver-extension' },
            ['https://example.test/product'], {}, options);

        expect(send.mock.calls[0][0].message).toEqual(expect.objectContaining({
            siteId: 'sevennet', targetId: 'sevennet-test', environment: 'test',
            detectedAt: '2026-10-14T00:00:00.000Z'
        }));
        expect(send.mock.calls[0][0].message.eventId).toMatch(/^sevennet-test:session-1:/);
        expect(buildTargetpageNotificationOptions({ targetpage: { id: 'bad' } }, 'session-1')).toEqual({});
    });

    test('受信側が失敗応答を返した場合も外部送信失敗として記録する', async () => {
        const bgLogWarn = jest.fn();
        const { notifyExternalExtension } = loadScriptFunctions('../../src/background/background.js', [
            'notifyExternalExtension'
        ], {
            ExternalMessaging: {
                send: jest.fn(async () => ({
                    success: true,
                    response: { success: false, error: 'missing_discord_channel_id' }
                }))
            },
            bgLogInfo: jest.fn(),
            bgLogWarn
        });

        await expect(notifyExternalExtension({
            notifyExternalExtension: true,
            externalExtensionId: 'receiver-extension'
        }, ['https://example.test/product'], {
            targetUrl: 'https://example.test/list',
            title: '在庫差分',
            currentCount: 1
        })).resolves.toEqual({ success: false, error: 'missing_discord_channel_id' });

        expect(bgLogWarn).toHaveBeenCalledWith('❌ 他拡張通知失敗:', 'missing_discord_channel_id');
    });

    test('Service Worker は共有通知モジュールと在庫差分通知を利用する', () => {
        const source = fs.readFileSync(path.resolve(__dirname, '../../src/background/background.js'), 'utf8');
        expect(source).toContain("'../lib/notification/chrome-notify.js'");
        expect(source).toContain("'../lib/notification/external-messaging.js'");
        expect(source).toContain('async function showInventoryDetectionNotification(event = {})');
        expect(source).toContain('const notification = await ChromeNotify.show({');
    });

    test('在庫検知通知は検知ファイルのダウンロードより先に作成する', () => {
        const source = fs.readFileSync(path.resolve(__dirname, '../../src/background/background.js'), 'utf8');
        const functionStart = source.indexOf('async function handleStockWatchDetection(');
        const functionEnd = source.indexOf('\nasync function runStockWatchTick()', functionStart);
        const detectionSource = source.slice(functionStart, functionEnd);

        expect(detectionSource.indexOf('await showInventoryDetectionNotification({')).toBeGreaterThanOrEqual(0);
        expect(detectionSource.indexOf('await showInventoryDetectionNotification({'))
            .toBeLessThan(detectionSource.indexOf('await saveScheduledStockLog(logEntry);'));
        expect(detectionSource.indexOf('await showInventoryDetectionNotification({'))
            .toBeLessThan(detectionSource.indexOf('await FileSave.saveScreenshot({'));
        expect(detectionSource.indexOf('await showInventoryDetectionNotification({'))
            .toBeLessThan(detectionSource.indexOf('await FileSave.saveHtml({'));
        expect(detectionSource.indexOf('await delay(1500);'))
            .toBeGreaterThan(detectionSource.indexOf('const notification = await ChromeNotify.show({'));
        expect(detectionSource.indexOf('await delay(1500);'))
            .toBeLessThan(detectionSource.indexOf('await saveScheduledStockLog(logEntry);'));
    });

    test('系統Aの監視（テストを含む）は検知直後に共有Chrome通知を作成してから Gmail 通知する', () => {
        const source = fs.readFileSync(path.resolve(__dirname, '../../src/background/background.js'), 'utf8');
        const functionStart = source.indexOf('async function evaluateSingleMonitoringSession(');
        const functionEnd = source.indexOf('\n}\n', functionStart);
        const evaluationSource = source.slice(functionStart, functionEnd);
        const notificationCall = evaluationSource.indexOf('await showInventoryDetectionNotification({');

        // 旧 setInterval 経路を削除したため、テストタブのシナリオも本番と同じこの判定を通る。
        expect(notificationCall).toBeGreaterThanOrEqual(0);
        expect(evaluationSource.indexOf('type: "keyword",', notificationCall)).toBeGreaterThan(notificationCall);
        expect(notificationCall).toBeLessThan(evaluationSource.indexOf('notifyGmailForKeywordDetection('));
    });
});
