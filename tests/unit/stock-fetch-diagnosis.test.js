const { loadScriptFunctions } = require('../helpers/load-source-functions');

describe('在庫取得方式診断', () => {
    test('offscreen宛ての解析メッセージはbackgroundで処理しない', () => {
        const { isOffscreenTargetMessage } = loadScriptFunctions(
            '../../src/background/background.js',
            ['isOffscreenTargetMessage']
        );

        expect(isOffscreenTargetMessage({
            target: 'offscreen',
            type: 'OFFSCREEN_ANALYZE_STOCK_HTML'
        })).toBe(true);
        expect(isOffscreenTargetMessage({ action: 'bulkDiagnoseStockFetch' })).toBe(false);
    });

    test('診断run IDの日時部分はUTCではなく固定の日本時間にする', () => {
        const { createStockFetchDiagnosisRunId } = loadScriptFunctions(
            '../../src/background/background.js',
            ['createStockFetchDiagnosisRunId']
        );

        expect(createStockFetchDiagnosisRunId(new Date('2026-09-24T07:24:00Z')))
            .toMatch(/^stock-fetch-20260924162400-[a-z0-9]{6}$/);
    });

    test('FileSaveはダウンロードIDを含むオブジェクトを返す', async () => {
        const FileSave = {
            download: jest.fn().mockResolvedValue({ downloadId: 7 }),
            saveHtml: jest.fn().mockResolvedValue({ downloadId: 8 })
        };

        const result = await FileSave.download({
            filename: 'PageRecorder/stock-fetch-diagnosis/run/summary.json',
            textContent: '{}', mimeType: 'application/json;charset=utf-8'
        });

        expect(result.downloadId).toBe(7);
        expect(FileSave.download).toHaveBeenCalledWith(expect.objectContaining({
            filename: 'PageRecorder/stock-fetch-diagnosis/run/summary.json'
        }));
    });

    test('同期スクリプトはURL・タイトルを抽出し、日産の状態別サンプルを重複なく生成する', () => {
        const { readUrlEntries, collectSamples, mergeGeneratedSites } = require('../../scripts/sync-stock-fetch-diagnosis-samples');
        const fs = require('fs');
        const originalReadFileSync = fs.readFileSync;
        const originalExistsSync = fs.existsSync;
        const originalReaddirSync = fs.readdirSync;
        jest.spyOn(fs, 'readFileSync').mockReturnValue('title: 商品A\nurl:https://shop.nissan.co.jp/product/1\nurl:https://shop.nissan.co.jp/product/1\n');
        expect(readUrlEntries('/tmp/url.txt')).toEqual([
            { title: '商品A', url: 'https://shop.nissan.co.jp/product/1' },
            { title: '商品A', url: 'https://shop.nissan.co.jp/product/1' }
        ]);
        fs.readFileSync.mockRestore();
        jest.spyOn(fs, 'readdirSync').mockReturnValue([{ name: '日産', isDirectory: () => true }]);
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readFileSync').mockReturnValue('title: 商品A\nurl:https://shop.nissan.co.jp/product/1\nurl:https://shop.nissan.co.jp/product/1\n');
        expect(collectSamples('/target', [{ id: 'nissan', name: '日産', patterns: ['shop.nissan.co.jp'] }])).toEqual([{
            id: 'nissan', name: '日産', samples: [
                { state: 'in_stock', title: '商品A', url: 'https://shop.nissan.co.jp/product/1' },
                { state: 'out_of_stock', title: '商品A', url: 'https://shop.nissan.co.jp/product/1' }
            ]
        }]);
        fs.readFileSync.mockRestore();
        fs.existsSync.mockRestore();
        fs.readdirSync.mockRestore();
        expect(originalReadFileSync).toBeDefined();
        expect(originalExistsSync).toBeDefined();
        expect(originalReaddirSync).toBeDefined();
        expect(mergeGeneratedSites(
            [{ id: 'nissan', samples: [{ url: 'https://old.example' }] }, { id: 'other', samples: [] }],
            [{ id: 'nissan', samples: [{ url: 'https://new.example' }] }]
        )).toEqual([
            { id: 'nissan', samples: [{ url: 'https://new.example' }] },
            { id: 'other', samples: [] }
        ]);
    });

    test('一括診断は両状態の期待値から最終判定を決める', () => {
        const { diagnosisMatchesExpectedState, classifyBulkStockFetchDiagnosis } = loadScriptFunctions(
            '../../src/background/background.js',
            ['diagnosisMatchesExpectedState', 'classifyBulkStockFetchDiagnosis']
        );
        const expected = (state, fetch = true, dom = true) => ({
            state,
            fetchError: fetch ? null : { message: 'network' },
            analysis: {
                fetch: { matchCount: 1, hasKeyword: state === 'in_stock' },
                dom: { matchCount: dom ? 1 : 0, hasKeyword: state === 'in_stock' }
            }
        });
        expect(diagnosisMatchesExpectedState({ matchCount: 1, hasKeyword: false }, 'out_of_stock')).toBe(true);
        expect(classifyBulkStockFetchDiagnosis([expected('in_stock'), expected('out_of_stock')])).toBe('FETCH_SUPPORTED');
        expect(classifyBulkStockFetchDiagnosis([expected('in_stock', false), expected('out_of_stock', false)])).toBe('DOM_ONLY');
        expect(classifyBulkStockFetchDiagnosis([expected('in_stock', true, false)])).toBe('NEEDS_REVIEW');
        expect(classifyBulkStockFetchDiagnosis([])).toBe('SAMPLES_NOT_REGISTERED');
    });

    test('一括診断は人向けの判定解説とURL別結果をMarkdownへ出力する', () => {
        const { buildBulkStockFetchDiagnosisCommentary } = loadScriptFunctions(
            '../../src/background/background.js', ['buildBulkStockFetchDiagnosisCommentary']
        );
        const commentary = buildBulkStockFetchDiagnosisCommentary({
            runId: 'run-1', siteName: '日産', selector: '.status', keyword: '在庫あり',
            diagnosisCode: 'FETCH_SUPPORTED',
            states: {
                in_stock: { total: 1, fetchExpected: 1, domExpected: 1 },
                out_of_stock: { total: 1, fetchExpected: 1, domExpected: 1 }
            },
            samples: [{
                state: 'in_stock', title: '商品A', finalUrl: 'https://example.com/a',
                fetch: { status: 200 },
                analysis: { fetch: { matchCount: 1, keywordMatchCount: 1 }, dom: { matchCount: 1, keywordMatchCount: 1 } }
            }]
        });

        expect(commentary).toContain('# 在庫Fetch一括診断 解説');
        expect(commentary).toContain('最終判定: FETCH_SUPPORTED');
        expect(commentary).toContain('Fetch方式の候補です');
        expect(commentary).toContain('https://example.com/a');
        expect(commentary).toContain('在庫なし | 1/1 | 1/1');
    });

    test('summary.jsonの各値をコメント付きで解説するMarkdownを出力する', () => {
        const { buildBulkStockFetchSummaryFieldCommentary } = loadScriptFunctions(
            '../../src/background/background.js', ['buildBulkStockFetchSummaryFieldCommentary']
        );
        const commentary = buildBulkStockFetchSummaryFieldCommentary({
            runId: 'run-1', siteId: 'nissan', siteName: '日産', selector: '.status', keyword: '在庫あり',
            diagnosisCode: 'FETCH_SUPPORTED',
            states: { in_stock: { total: 1, fetchExpected: 1, domExpected: 1 }, out_of_stock: { total: 1, fetchExpected: 1, domExpected: 1 } },
            samples: [{
                state: 'out_of_stock', observedState: 'out_of_stock', title: '商品B',
                targetUrl: 'https://example.com/b', finalUrl: 'https://example.com/b', fetch: { status: 200 },
                analysis: { fetch: { matchCount: 1, keywordMatchCount: 0, hasKeyword: false }, dom: { matchCount: 1, keywordMatchCount: 0, hasKeyword: false } },
                fetchError: null, diagnosisCode: 'NO_MATCH'
            }]
        });

        expect(commentary).toContain('# summary.json 項目解説');
        expect(commentary).toContain('`states.in_stock.fetchExpected`');
        expect(commentary).toContain('`analysis.fetch.keywordMatchCount`');
        expect(commentary).toContain('`NO_MATCH`でも一括判定では成功として扱う');
    });

    test('一括診断のpopup条件は診断サイト選択かつサンプル登録時だけ実行可能にする', () => {
        const { resolveBulkStockFetchDiagnosisSite } = loadScriptFunctions(
            '../../src/ui/popup.js', ['resolveBulkStockFetchDiagnosisSite']
        );
        const sites = [{ id: 'nissan', samples: [{ state: 'in_stock', url: 'https://example.com' }] }];
        expect(resolveBulkStockFetchDiagnosisSite('nissan', sites).site.id).toBe('nissan');
        expect(resolveBulkStockFetchDiagnosisSite('', sites).reason).toContain('選択');
        expect(resolveBulkStockFetchDiagnosisSite('aeon', sites).reason).toContain('未登録');
    });

    test('一括診断の最終判定はpopupを開き直しても復元する', async () => {
        const elements = { bulkStockFetchDiagnosisResult: { textContent: '', style: {} } };
        const chrome = {
            storage: {
                local: {
                    get: jest.fn().mockResolvedValue({
                        stockFetchBulkDiagnosisResult: {
                            diagnosisCode: 'FETCH_SUPPORTED',
                            diagnosedAt: '2026-09-24T05:47:41.000Z',
                            states: {
                                in_stock: { total: 1, fetchExpected: 1, domExpected: 1 },
                                out_of_stock: { total: 1, fetchExpected: 1, domExpected: 1 }
                            }
                        }
                    })
                }
            }
        };
        const { renderBulkStockFetchDiagnosis, restoreBulkStockFetchDiagnosis } = loadScriptFunctions(
            '../../src/ui/popup.js',
            ['formatStockFetchDiagnosisTimestamp', 'renderBulkStockFetchDiagnosis', 'restoreBulkStockFetchDiagnosis'],
            { chrome, elements }
        );

        renderBulkStockFetchDiagnosis({ diagnosisCode: 'NEEDS_REVIEW', states: {} });
        await restoreBulkStockFetchDiagnosis();

        expect(chrome.storage.local.get).toHaveBeenCalledWith('stockFetchBulkDiagnosisResult');
        expect(elements.bulkStockFetchDiagnosisResult.textContent).toContain('最終判定: FETCH_SUPPORTED');
        expect(elements.bulkStockFetchDiagnosisResult.textContent).toContain('判定日時: 2026/09/24 14:47:41');
        expect(elements.bulkStockFetchDiagnosisResult.textContent).toContain('在庫あり: Fetch 1/1、DOM 1/1');
    });

    test('単件診断の結果はpopupを開き直しても復元する', async () => {
        const elements = {
            stockFetchDiagnosisResult: { textContent: '', style: {} },
            downloadStockApiInvestigationMemoButton: { hidden: true }
        };
        const chrome = {
            storage: { local: { get: jest.fn().mockResolvedValue({
                stockFetchDiagnosisResult: {
                    diagnosisCode: 'NO_MATCH', selector: 'body', keyword: '__missing__',
                    diagnosedAt: '2026-09-24T05:47:41.000Z',
                    fetch: { status: 200 }, needsApiInvestigation: true,
                    analysis: {
                        fetch: { matchCount: 1, keywordMatchCount: 0 },
                        dom: { matchCount: 1, keywordMatchCount: 0 }
                    }
                }
            }) } }
        };
        const { renderStockFetchDiagnosis, restoreStockFetchDiagnosis } = loadScriptFunctions(
            '../../src/ui/popup.js',
            ['formatStockFetchDiagnosisTimestamp', 'renderStockFetchDiagnosis', 'restoreStockFetchDiagnosis'],
            { chrome, elements, latestStockFetchDiagnosis: null }
        );

        renderStockFetchDiagnosis({ diagnosisCode: 'FETCH_COMPATIBLE_CANDIDATE', analysis: {} });
        await restoreStockFetchDiagnosis();

        expect(chrome.storage.local.get).toHaveBeenCalledWith('stockFetchDiagnosisResult');
        expect(elements.stockFetchDiagnosisResult.textContent).toContain('判定: NO_MATCH');
        expect(elements.stockFetchDiagnosisResult.textContent).toContain('判定日時: 2026/09/24 14:47:41');
        expect(elements.downloadStockApiInvestigationMemoButton.hidden).toBe(false);
    });

    test('FetchとDOMの双方で条件が一致するとFetch利用候補にする', () => {
        const { classifyStockFetchDiagnosis } = loadScriptFunctions(
            '../../src/background/background.js',
            ['classifyStockFetchDiagnosis']
        );

        expect(classifyStockFetchDiagnosis({
            fetchAnalysis: { matchCount: 1, hasKeyword: true },
            domAnalysis: { matchCount: 1, hasKeyword: true }
        })).toBe('FETCH_COMPATIBLE_CANDIDATE');
    });

    test('DOMだけで条件が一致するとDOM専用候補にする', () => {
        const { classifyStockFetchDiagnosis } = loadScriptFunctions(
            '../../src/background/background.js',
            ['classifyStockFetchDiagnosis']
        );

        expect(classifyStockFetchDiagnosis({
            fetchAnalysis: { matchCount: 0, hasKeyword: false },
            domAnalysis: { matchCount: 1, hasKeyword: true }
        })).toBe('DOM_ONLY_CANDIDATE');
    });

    test('無効セレクタとFetch失敗を優先して分類する', () => {
        const { classifyStockFetchDiagnosis } = loadScriptFunctions(
            '../../src/background/background.js',
            ['classifyStockFetchDiagnosis']
        );

        expect(classifyStockFetchDiagnosis({
            fetchError: new Error('network'),
            fetchAnalysis: { error: { code: 'INVALID_SELECTOR' } },
            domAnalysis: { matchCount: 1, hasKeyword: true }
        })).toBe('INVALID_SELECTOR');
        expect(classifyStockFetchDiagnosis({
            fetchError: new Error('network'),
            fetchAnalysis: { matchCount: 1, hasKeyword: true },
            domAnalysis: { matchCount: 1, hasKeyword: true }
        })).toBe('FETCH_ERROR');
    });

    test('offscreen解析は一致数とキーワード一致数だけを返す', () => {
        class FakeDOMParser {
            parseFromString(html) {
                return {
                    querySelectorAll(selector) {
                        if (selector === '[') {
                            throw new Error('invalid selector');
                        }
                        return html.includes('stock')
                            ? [{ textContent: '在庫あり' }, { textContent: '関連商品' }]
                            : [];
                    }
                };
            }
        }
        const { analyzeStockHtml } = loadScriptFunctions(
            '../../src/offscreen/offscreen.js',
            ['analyzeStockHtml'],
            { DOMParser: FakeDOMParser }
        );

        expect(analyzeStockHtml('stock', '.status', '在庫あり')).toEqual({
            matchCount: 2,
            keywordMatchCount: 1,
            hasKeyword: true,
            error: null
        });
        expect(analyzeStockHtml('stock', '[', '在庫あり').error.code).toBe('INVALID_SELECTOR');
        expect(analyzeStockHtml('stock', '.status', '').hasKeyword).toBe(false);
    });

    test('指定URL診断はJSTのrun IDで一時タブを閉じて4成果物を保存する', async () => {
        const FileSave = {
            saveHtml: jest.fn().mockResolvedValue({ downloadId: 1 }),
            download: jest.fn().mockResolvedValue({ downloadId: 1 })
        };
        const chrome = {
            tabs: {
                create: jest.fn().mockResolvedValue({ id: 9 }),
                get: jest.fn().mockResolvedValue({ id: 9, url: 'https://example.com/item' }),
                remove: jest.fn().mockResolvedValue()
            },
            scripting: {
                executeScript: jest.fn().mockResolvedValue([{ result: '<html>在庫あり</html>' }])
            },
            runtime: {
                sendMessage: jest.fn().mockResolvedValue({
                    success: true,
                    analysis: {
                        fetch: { matchCount: 1, keywordMatchCount: 1, hasKeyword: true, error: null },
                        dom: { matchCount: 1, keywordMatchCount: 1, hasKeyword: true, error: null }
                    }
                })
            },
            storage: { local: { set: jest.fn().mockResolvedValue() } }
        };
        const { handleDiagnoseStockFetchMessage } = loadScriptFunctions(
            '../../src/background/background.js',
            [
                'classifyStockFetchDiagnosis',
                'createStockFetchDiagnosisRunId',
                'analyzeStockFetchHtmlWithOffscreen',
                'buildStockFetchDiagnosisReadme',
                'handleDiagnoseStockFetchMessage'
            ],
            {
                chrome,
                fetch: jest.fn().mockResolvedValue({
                    text: jest.fn().mockResolvedValue('<html>在庫あり</html>'),
                    url: 'https://example.com/item', status: 200, ok: true,
                    headers: { get: jest.fn(() => 'text/html') }
                }),
                waitForPageReady: jest.fn().mockResolvedValue(),
                ensureOffscreenDocument: jest.fn().mockResolvedValue(),
                FileSave,
                bgLogError: jest.fn(),
                bgLogWarn: jest.fn()
            }
        );
        const sendResponse = jest.fn();

        await handleDiagnoseStockFetchMessage({
            monitorType: 'url', targetUrl: 'https://example.com/item',
            selector: '.status', keyword: '在庫あり', observedState: 'in_stock'
        }, sendResponse);

        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com/item', active: false });
        expect(chrome.tabs.remove).toHaveBeenCalledWith(9);
        const totalCalls = FileSave.saveHtml.mock.calls.length + FileSave.download.mock.calls.length;
        expect(totalCalls).toBe(4);
        expect(chrome.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
            stockFetchDiagnosisResult: expect.objectContaining({
                diagnosisCode: 'FETCH_COMPATIBLE_CANDIDATE',
                diagnosedAt: expect.any(String)
            })
        }));
        expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            diagnosis: expect.objectContaining({
                diagnosisCode: 'FETCH_COMPATIBLE_CANDIDATE',
                diagnosedAt: expect.any(String)
            })
        }));
        const runId = sendResponse.mock.calls[0][0].diagnosis.runId;
        expect(runId).toMatch(/^stock-fetch-\d{14}-[a-z0-9]{6}$/);
        const allCalls = [...FileSave.saveHtml.mock.calls, ...FileSave.download.mock.calls];
        expect(allCalls.every(([request]) => request.filename.includes(`/${runId}/`))).toBe(true);
    });

    test('一括診断は同じJST形式のrun IDを全成果物の保存先に使う', async () => {
        const FileSave = {
            saveHtml: jest.fn().mockResolvedValue({ downloadId: 1 }),
            download: jest.fn().mockResolvedValue({ downloadId: 1 })
        };
        const chrome = {
            tabs: {
                create: jest.fn().mockResolvedValue({ id: 9 }),
                get: jest.fn().mockResolvedValue({ id: 9, url: 'https://example.com/item' }),
                remove: jest.fn().mockResolvedValue()
            },
            scripting: {
                executeScript: jest.fn().mockResolvedValue([{ result: '<html>在庫あり</html>' }])
            },
            runtime: {
                sendMessage: jest.fn()
                    .mockResolvedValueOnce({ success: true, analysis: {
                        fetch: { matchCount: 1, keywordMatchCount: 1, hasKeyword: true, error: null },
                        dom: { matchCount: 1, keywordMatchCount: 1, hasKeyword: true, error: null }
                    } })
                    .mockResolvedValueOnce({ success: true, analysis: {
                        fetch: { matchCount: 1, keywordMatchCount: 0, hasKeyword: false, error: null },
                        dom: { matchCount: 1, keywordMatchCount: 0, hasKeyword: false, error: null }
                    } })
            },
            storage: { local: { set: jest.fn().mockResolvedValue() } }
        };
        const { handleBulkDiagnoseStockFetchMessage } = loadScriptFunctions(
            '../../src/background/background.js',
            [
                'createStockFetchDiagnosisRunId',
                'analyzeStockFetchHtmlWithOffscreen',
                'classifyStockFetchDiagnosis',
                'diagnosisMatchesExpectedState',
                'classifyBulkStockFetchDiagnosis',
                'buildBulkStockFetchDiagnosisReadme',
                'buildBulkStockFetchDiagnosisCommentary',
                'buildBulkStockFetchSummaryFieldCommentary',
                'collectStockFetchDiagnosisForUrl',
                'handleBulkDiagnoseStockFetchMessage'
            ],
            {
                chrome,
                fetch: jest.fn().mockResolvedValue({
                    text: jest.fn().mockResolvedValue('<html>在庫あり</html>'),
                    url: 'https://example.com/item', status: 200, ok: true,
                    headers: { get: jest.fn(() => 'text/html') }
                }),
                waitForPageReady: jest.fn().mockResolvedValue(),
                ensureOffscreenDocument: jest.fn().mockResolvedValue(),
                FileSave,
                bgLogError: jest.fn(),
                bgLogWarn: jest.fn()
            }
        );
        const sendResponse = jest.fn();

        await handleBulkDiagnoseStockFetchMessage({
            siteId: 'site-a', siteName: 'サイトA', selector: '.status', keyword: '在庫あり',
            samples: [
                { state: 'in_stock', url: 'https://example.com/in-stock' },
                { state: 'out_of_stock', url: 'https://example.com/out-of-stock' }
            ]
        }, sendResponse);

        const summary = sendResponse.mock.calls[0][0].summary;
        expect(summary.runId).toMatch(/^stock-fetch-\d{14}-[a-z0-9]{6}$/);
        const totalCalls = FileSave.saveHtml.mock.calls.length + FileSave.download.mock.calls.length;
        expect(totalCalls).toBe(10);
        const allCalls = [...FileSave.saveHtml.mock.calls, ...FileSave.download.mock.calls];
        expect(allCalls.every(([request]) => request.filename.includes(`/${summary.runId}/`))).toBe(true);
    });

    test('popupの単件診断は専用入力だけを使い、通常監視設定を参照しない', () => {
        const { getStockFetchDiagnosisInput } = loadScriptFunctions(
            '../../src/ui/popup.js',
            ['getStockFetchDiagnosisInput'],
            {
                elements: {
                    diagnosisActiveTab: { checked: false },
                    diagnosisTargetUrl: { value: 'https://example.com/item' },
                    diagnosisSelector: { value: '.diagnosis-status' },
                    diagnosisKeyword: { value: '販売中' }
                }
            }
        );

        expect(getStockFetchDiagnosisInput()).toEqual({
            monitorType: 'url', targetUrl: 'https://example.com/item',
            selector: '.diagnosis-status', keyword: '販売中'
        });
    });

    test('診断サイト選択時は専用のセレクタとキーワードだけに既定値を反映する', async () => {
        const elements = {
            diagnosisSelector: { value: '' },
            diagnosisKeyword: { value: '' }
        };
        const { applyDiagnosisSiteDefaults } = loadScriptFunctions(
            '../../src/ui/popup.js',
            ['applyDiagnosisSiteDefaults'],
            {
                elements,
                loadEcSites: jest.fn().mockResolvedValue([{ id: 'site-a' }]),
                getEcSiteMonitorDefaultsFromSite: jest.fn(() => ({ selector: '.status', keyword: '在庫あり' }))
            }
        );

        await applyDiagnosisSiteDefaults('site-a');
        expect(elements.diagnosisSelector.value).toBe('.status');
        expect(elements.diagnosisKeyword.value).toBe('在庫あり');
    });
});
