const { loadBackgroundFunctions } = require('../helpers/load-source-functions');

describe('テストタブのシナリオ定義', () => {
    const functions = loadBackgroundFunctions([
        'getTestTabScenarioDefinition',
        'buildTestTabScenarioRun',
        'evaluateTestTabScenarioOutcome',
        'buildTestTabManualReproductionCode',
        'buildTestTabManualWindowLogMessage'
    ]);
    const site = {
        id: 'sevennet',
        name: 'セブンネットショッピング',
        selector: 'button.add-to-cart.c-btnCartin.js-add-to-cart',
        keyword: 'カートに入れる',
        inStockUrls: ['https://7net.test/detail/in-1.html', 'https://7net.test/detail/in-2.html'],
        outOfStockUrls: ['https://7net.test/detail/out-1.html', 'https://7net.test/detail/out-2.html']
    };

    describe('セッション設定の生成', () => {
        test('出現シナリオは在庫なしサンプルとサイトの本当のキーワードで本番の高頻度設定を作る', () => {
            const run = functions.buildTestTabScenarioRun({ scenarioId: 'appear', site, reproductionMode: 'auto' });

            expect(run.ok).toBe(true);
            expect(run.scope).toBe('single');
            expect(run.configs).toHaveLength(1);
            expect(run.configs[0]).toMatchObject({
                url: site.outOfStockUrls[0],
                selector: site.selector,
                keyword: site.keyword,
                start: 'out_of_stock',
                expected: 'detected',
                twoTierTestBehavior: 'detect_after_initial',
                settings: {
                    monitoringMode: 'high_frequency',
                    interval: 5,
                    duration: 60,
                    detectMode: 'appear',
                    initialKeywordDetection: false,
                    captureMode: 'reload',
                    downloadSource: true,
                    downloadScreenshot: true
                }
            });
        });

        test('消失シナリオは在庫ありサンプルで始め、基準取得後にキーワードを削除する', () => {
            const run = functions.buildTestTabScenarioRun({ scenarioId: 'disappear', site, reproductionMode: 'auto' });

            expect(run.configs[0]).toMatchObject({
                url: site.inStockUrls[0],
                start: 'in_stock',
                expected: 'detected',
                twoTierTestBehavior: 'disappear_after_initial',
                settings: { detectMode: 'disappear', initialKeywordDetection: false }
            });
        });

        test('手動モードでは変化があるシナリオだけ受付時間の動作になる', () => {
            const appear = functions.buildTestTabScenarioRun({ scenarioId: 'appear', site, reproductionMode: 'manual' });
            const expire = functions.buildTestTabScenarioRun({ scenarioId: 'initial_not_detected', site, reproductionMode: 'manual' });

            expect(appear.configs[0].twoTierTestBehavior).toBe('manual_after_initial');
            expect(appear.configs[0].manualAction).toBe('append');
            expect(expire.configs[0].twoTierTestBehavior).toBe('none');
        });

        test('即座検知と満了のシナリオは変化させず、期待結果を持つ', () => {
            const detected = functions.buildTestTabScenarioRun({ scenarioId: 'initial_detected', site, reproductionMode: 'auto' });
            const expired = functions.buildTestTabScenarioRun({ scenarioId: 'initial_not_detected', site, reproductionMode: 'auto' });

            expect(detected.configs[0]).toMatchObject({
                url: site.inStockUrls[0], expected: 'detected', twoTierTestBehavior: 'none',
                settings: { initialKeywordDetection: true }
            });
            expect(expired.configs[0]).toMatchObject({
                url: site.outOfStockUrls[0], expected: 'expired', twoTierTestBehavior: 'none',
                settings: { initialKeywordDetection: true }
            });
        });

        test('異常系シナリオはサイトに依存しない専用セレクタでセレクタエラーを期待する', () => {
            const notFound = functions.buildTestTabScenarioRun({ scenarioId: 'element_not_found_check', site, reproductionMode: 'auto' });
            const invalid = functions.buildTestTabScenarioRun({ scenarioId: 'pending_error_check', site, reproductionMode: 'auto' });

            expect(notFound.configs[0]).toMatchObject({
                url: site.inStockUrls[0], selector: '.page-recorder-test-valid-but-not-found', expected: 'selector_error'
            });
            expect(invalid.configs[0]).toMatchObject({ selector: '[', expected: 'selector_error' });
        });

        test('複数URLシナリオは開始状態の異なる商品URL 2件を使う', () => {
            const run = functions.buildTestTabScenarioRun({ scenarioId: 'auto_appear_two_urls', site, reproductionMode: 'auto' });

            expect(run.scope).toBe('multiple');
            expect(run.configs.map((config) => config.url)).toEqual([
                site.outOfStockUrls[0],
                site.outOfStockUrls[1]
            ]);
            expect(run.configs.every((config) => config.expected === 'detected')).toBe(true);
            expect(new Set(run.configs.map((config) => config.id)).size).toBe(2);
        });

        test('複数URLシナリオは必要な開始状態のサンプルが2件未満なら開始しない', () => {
            const run = functions.buildTestTabScenarioRun({
                scenarioId: 'baseline_two_urls',
                site: { ...site, outOfStockUrls: [site.outOfStockUrls[0]] },
                reproductionMode: 'auto'
            });

            expect(run).toMatchObject({ ok: false, reason: 'multiple_samples_missing' });
            expect(run.message).toContain('在庫なしサンプルが2件必要');
        });

        test('Gmailシナリオは通知を有効にする印を持つ', () => {
            const run = functions.buildTestTabScenarioRun({ scenarioId: 'gmail_notification_check', site, reproductionMode: 'auto' });

            expect(run.requiresGmail).toBe(true);
            expect(run.configs[0]).toMatchObject({ expected: 'detected', twoTierTestBehavior: 'detect_after_initial' });
        });

        test('在庫なしサンプルがないサイトでは在庫なし開始のシナリオを作らず収集を促す', () => {
            const run = functions.buildTestTabScenarioRun({
                scenarioId: 'appear',
                site: { ...site, outOfStockUrls: [] },
                reproductionMode: 'auto'
            });

            expect(run.ok).toBe(false);
            expect(run.reason).toBe('out_of_stock_sample_missing');
            expect(run.message).toContain('在庫なしサンプル');
            expect(run.message).toContain('docs/在庫Fetch診断_サイト追加手順.md');
        });

        test('在庫なしサンプルがなくても在庫ありで始めるシナリオは作れる', () => {
            const run = functions.buildTestTabScenarioRun({
                scenarioId: 'disappear',
                site: { ...site, outOfStockUrls: [] },
                reproductionMode: 'auto'
            });

            expect(run.ok).toBe(true);
        });

        test('未知のシナリオはエラーとして扱う', () => {
            expect(functions.getTestTabScenarioDefinition('unknown')).toBeNull();
            expect(functions.buildTestTabScenarioRun({ scenarioId: 'unknown', site }).ok).toBe(false);
            expect(functions.getTestTabScenarioDefinition('duration_elapsed_during_reload_wait')).toBeNull();
        });
    });

    describe('結果の判定', () => {
        const sessions = (entries) => entries.map(([id, expected, start, reason]) => ({ id, expected, start, reason }));

        test('全セッションが期待どおりに終われば成功になる', () => {
            const outcome = functions.evaluateTestTabScenarioOutcome({
                reproductionMode: 'auto',
                sessions: sessions([['a', 'detected', 'out_of_stock', 'detected'], ['b', 'expired', 'out_of_stock', 'expired']])
            });

            expect(outcome).toEqual({ status: 'passed', failures: [] });
        });

        test('終わっていないセッションがあれば実行中のまま', () => {
            const outcome = functions.evaluateTestTabScenarioOutcome({
                reproductionMode: 'auto',
                sessions: sessions([['a', 'detected', 'out_of_stock', 'detected'], ['b', 'detected', 'out_of_stock', null]])
            });

            expect(outcome.status).toBe('running');
        });

        test('在庫なし開始でセレクタエラーになったら監視条件の見直しを理由にする', () => {
            const outcome = functions.evaluateTestTabScenarioOutcome({
                reproductionMode: 'auto',
                sessions: sessions([['a', 'detected', 'out_of_stock', 'selector_error']])
            });

            expect(outcome.status).toBe('failed');
            expect(outcome.failures[0].message).toBe('在庫なしページに監視要素がない（監視条件の見直しが必要）');
        });

        test('手動モードで検知を期待したのに満了したら手動変更が確認できなかったことを理由にする', () => {
            const outcome = functions.evaluateTestTabScenarioOutcome({
                reproductionMode: 'manual',
                sessions: sessions([['a', 'detected', 'out_of_stock', 'expired']])
            });

            expect(outcome.failures[0].message).toBe('手動変更が確認できませんでした');
        });

        test('その他の不一致は期待と結果を理由に表示する', () => {
            const outcome = functions.evaluateTestTabScenarioOutcome({
                reproductionMode: 'auto',
                sessions: sessions([['a', 'expired', 'in_stock', 'detected']])
            });

            expect(outcome.status).toBe('failed');
            expect(outcome.failures[0]).toMatchObject({ sessionId: 'a', expected: 'expired', actual: 'detected' });
            expect(outcome.failures[0].message).toContain('期待: expired');
            expect(outcome.failures[0].message).toContain('結果: detected');
        });

        test('セッションが1件もなければ失敗にする', () => {
            expect(functions.evaluateTestTabScenarioOutcome({ reproductionMode: 'auto', sessions: [] }).status).toBe('failed');
        });
    });

    describe('手動用の再現コード', () => {
        test('出現は一致したすべての要素の末尾にキーワードを追記するコードになる', () => {
            const code = functions.buildTestTabManualReproductionCode({ selector: site.selector, keyword: site.keyword, action: 'append' });

            expect(code).toContain('querySelectorAll(' + JSON.stringify(site.selector) + ')');
            expect(code).toContain(JSON.stringify(site.keyword));
            expect(code).toContain('textContent');
            expect(() => new Function(code)).not.toThrow();
        });

        test('消失は一致したすべての要素からキーワードを削除するコードになる', () => {
            const code = functions.buildTestTabManualReproductionCode({ selector: site.selector, keyword: site.keyword, action: 'remove' });

            expect(code).toContain('split(' + JSON.stringify(site.keyword) + ')');
            expect(() => new Function(code)).not.toThrow();
        });
    });

    describe('手動の受付時間のログ', () => {
        test('開始・残り時間・終了を受付時間中とわかる文言で出す', () => {
            expect(functions.buildTestTabManualWindowLogMessage('セブンネット appear 1', 'start', 20))
                .toBe('🧪 [セブンネット appear 1] 手動変更の受付時間中です（残り20秒）。監視タブの DevTools でテストタブのコードを実行してください');
            expect(functions.buildTestTabManualWindowLogMessage('セブンネット appear 1', 'progress', 10))
                .toBe('🧪 [セブンネット appear 1] 手動変更の受付時間中です（残り10秒）');
            expect(functions.buildTestTabManualWindowLogMessage('セブンネット appear 1', 'end', 0))
                .toBe('⏰ [セブンネット appear 1] 手動変更の受付時間が終わりました。これからキーワードを確認します');
        });

        test('未知の段階は文言を作らない', () => {
            expect(functions.buildTestTabManualWindowLogMessage('x', 'unknown', 0)).toBeNull();
        });
    });
});
