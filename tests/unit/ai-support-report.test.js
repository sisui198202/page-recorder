const fs = require('fs');
const path = require('path');
const { loadScriptFunctions } = require('../helpers/load-source-functions');

describe('AI判断サポートレポート', () => {
    const functions = loadScriptFunctions('../../src/background/background.js', [
        'formatAiSupportTimestamp',
        'getAiSupportOutcome',
        'createAiSupportReport',
        'createAiSupportTerminalReport',
        'generateAiSupportFileContent',
        'sanitizeAiSupportFilenamePart',
        'buildAiSupportFilename'
    ]);

    test('単一監視の開始情報を他の設定を含めずに保持する', () => {
        const report = functions.createAiSupportReport({
            id: 'single_test',
            startedAt: Date.parse('2026-09-25T00:00:00.000Z'),
            settings: {
                targetUrl: 'https://example.test/item',
                monitorSelector: '#stock',
                monitorKeyword: '在庫あり',
                detectMode: 'appear',
                interval: 20,
                duration: 60,
                initialKeywordDetection: true,
                externalExtensionId: 'must-not-be-exported'
            }
        });

        expect(report).toEqual(expect.objectContaining({
            sessionId: 'single_test',
            targetUrl: 'https://example.test/item',
            settings: expect.not.objectContaining({ externalExtensionId: expect.anything() })
        }));
        expect(report.stages[0]).toEqual(expect.objectContaining({ name: '監視開始', status: '成功' }));
    });

    test('終了理由と証跡をAIが読めるMarkdownに出力する', () => {
        const content = functions.generateAiSupportFileContent({
            sessionId: 'single_test',
            startedAt: '2026-09-25T00:00:00.000Z',
            completedAt: '2026-09-25T00:01:00.000Z',
            terminalReason: 'detected',
            targetUrl: 'https://example.test/item',
            settings: {
                monitorSelector: '#stock', monitorKeyword: '在庫あり', detectMode: 'appear',
                interval: 20, duration: 60, initialKeywordDetection: true
            },
            stages: [{ at: '2026-09-25T00:00:10.000Z', name: '基準取得', status: '成功', detail: '初回判定で検知なし' }],
            artifacts: [{ type: 'スクリーンショット', status: '成功', filename: 'Screenshot.png', downloadId: 42 }]
        });

        expect(content).toContain('成功（キーワード検知）');
        expect(content).toContain('single_test');
        expect(content).toContain('Screenshot.png');
        expect(content).toContain('| 基準取得 | 成功 | 初回判定で検知なし |');
        expect(content).not.toContain('externalExtensionId');
    });

    test('Fetchの実測チェック間隔をAI判断サポートへ出力する', () => {
        const content = functions.generateAiSupportFileContent({
            sessionId: 'single_fetch', terminalReason: 'expired',
            settings: { monitoringMode: 'high_frequency', captureMode: 'fetch', interval: 20 },
            execution: {
                checks: [
                    { startedAt: '2026-09-25T00:00:00.000Z', intervalMs: null, captureMode: 'fetch', result: 'success', detail: '検知なし' },
                    { startedAt: '2026-09-25T00:00:20.000Z', intervalMs: 20000, captureMode: 'fetch', result: 'success', detail: '検知なし' }
                ]
            }
        });

        expect(content).toContain('| 取得方式 | fetch |');
        expect(content).toContain('## 実行チェック履歴');
        expect(content).toContain('20.0秒');
    });

    test('複数URL監視では開始グループ・設定ID・設定名・終了理由をレポートとファイル名に含める', () => {
        const report = functions.createAiSupportReport({
            id: 'multiple_session',
            startedAt: Date.parse('2026-09-25T00:00:00.000Z'),
            monitoringScope: 'multiple',
            settings: {
                targetUrl: 'https://shop.example.test/item',
                aiSupportContext: {
                    requestId: 'startAll_123',
                    configId: 'nissan-item',
                    configName: '日産 / 商品A'
                }
            }
        });

        const content = functions.generateAiSupportFileContent({
            ...report,
            terminalReason: 'expired',
            completedAt: '2026-09-25T00:01:00.000Z'
        });
        const filename = functions.buildAiSupportFilename({
            ...report,
            terminalReason: 'expired'
        }, 'shop', new Date(2026, 8, 25, 9, 54, 44));

        expect(content).toContain('開始グループID | startAll_123');
        expect(content).toContain('監視設定ID | nissan-item');
        expect(content).toContain('監視名 | 日産 / 商品A');
        expect(filename).toBe('PageRecorder/AI_Support_startAll_123_nissan-item_日産_商品A_shop_expired_20260925_095444.md');
    });

    test('検知直後の工程・証跡は古いStorage状態に関係なく終端レポートへ残す', () => {
        const detectedReport = {
            sessionId: 'single_detected',
            stages: [
                { name: '監視開始', status: '成功' },
                { name: 'キーワード判定', status: '検知' }
            ],
            artifacts: [
                { type: 'スクリーンショット', status: '成功', filename: 'change.png', downloadId: 1 },
                { type: 'HTMLソース', status: '成功', filename: 'change.html', downloadId: 2 }
            ]
        };

        const terminalReport = functions.createAiSupportTerminalReport({
            id: 'single_detected',
            aiSupportReport: { sessionId: 'single_detected', stages: [{ name: '監視開始', status: '成功' }], artifacts: [] }
        }, 'detected', detectedReport);

        expect(terminalReport.stages).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'キーワード判定', status: '検知' }),
            expect.objectContaining({ name: '監視終了', detail: 'detected' })
        ]));
        expect(terminalReport.artifacts).toEqual(detectedReport.artifacts);
    });

    test('通常の単一監視は停止処理だけからAI判断サポートを出力する', () => {
        const source = fs.readFileSync(path.resolve(__dirname, '../../src/background/background.js'), 'utf8');
        expect(source.match(/downloadAiSupportFileForSession\(/g)).toHaveLength(2);
        expect(source).not.toContain('downloadAiSupportFile({');
        expect(source).toContain('const aiSupportReport = buildAiSupportReportWithStage');
        expect(source).toContain('deactivateSingleMonitoringSession(session.id, "detected", aiSupportReport)');
    });

    test('複数URL B は開始時に固定した設定で、終了時にAI判断サポートを出力する', () => {
        const source = fs.readFileSync(path.resolve(__dirname, '../../src/background/background.js'), 'utf8');
        expect(source).toContain('async function downloadAiSupportFileForMultiSiteSession(session, terminalReason)');
        expect(source).toContain('await downloadAiSupportFileForMultiSiteSession(session, reason);');
        expect(source).toContain('downloadAiSupportFile: siteConfig.notification?.downloadAiSupportFile === true');
        expect(source).toContain('session.aiSupportReport = createAiSupportReport(session);');
        expect(source).toContain('scope: isImmediate ? "immediate" : "scheduled"');
    });

    test('複数URL B のレポートはキーワードを対象外とし、時間終了と新商品検知を成功と判定する', () => {
        const report = functions.createAiSupportReport({
            id: 'list-watch',
            monitoringScope: 'multiple',
            settings: {
                targetUrl: 'https://example.test/list',
                monitoringKind: 'list-diff',
                monitorSelector: '.product',
                monitoringMode: 'immediate',
                interval: 30,
                duration: 120
            }
        });
        const content = functions.generateAiSupportFileContent({
            ...report,
            terminalReason: 'window_end',
            completedAt: '2026-10-09T01:00:00.000Z'
        });

        expect(functions.getAiSupportOutcome('window_end')).toBe('成功（監視時間終了・未検知）');
        expect(functions.getAiSupportOutcome('new_product_detected')).toBe('成功（新商品検知）');
        expect(content).toContain('| キーワード | 対象外（一覧差分監視） |');
        expect(content).toContain('| 検知モード | URL差分（新規商品URL） |');
        expect(content).toContain('| 初回キーワード検知 | 対象外 |');
    });

    test('複数URL B の終了時レポートは実行履歴を含めてダウンロードする', async () => {
        const download = jest.fn(async () => ({ downloadId: 42 }));
        const bgLogInfo = jest.fn();
        const { downloadAiSupportFileForMultiSiteSession } = loadScriptFunctions('../../src/background/background.js', [
            'downloadAiSupportFileForMultiSiteSession'
        ], {
            getMonitoringExecutionHistory: jest.fn(async () => ({ history_1: { checks: [{ result: 'success' }] } })),
            createAiSupportTerminalReport: jest.fn(() => ({ targetUrl: 'https://example.test/list', monitoringScope: 'multiple' })),
            extractSiteNameFromUrl: jest.fn(() => 'example'),
            buildAiSupportFilename: jest.fn(() => 'PageRecorder/AI_Support_B.md'),
            generateAiSupportFileContent: jest.fn(() => '# report'),
            FileSave: { download },
            bgLogInfo,
            bgLogError: jest.fn()
        });

        await downloadAiSupportFileForMultiSiteSession({
            id: 'b-session',
            siteId: 'popup-list-list_1',
            trigger: 'immediate',
            executionHistoryKey: 'history_1',
            settings: { downloadAiSupportFile: true }
        }, 'window_end');

        expect(download).toHaveBeenCalledWith(expect.objectContaining({
            filename: 'PageRecorder/AI_Support_B.md',
            textContent: '# report',
            mimeType: 'text/markdown;charset=utf-8'
        }));
        expect(bgLogInfo).toHaveBeenCalledWith(
            expect.stringContaining('[popup-list-list_1][immediate] AI判断サポートファイル保存完了'),
            expect.objectContaining({ sessionId: 'b-session', downloadId: 42 })
        );
    });
});
