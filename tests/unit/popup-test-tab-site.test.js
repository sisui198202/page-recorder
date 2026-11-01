const { loadScriptFunctions } = require('../helpers/load-source-functions');
const ecSites = require('../../src/config/ec-sites.json');
const diagnosisSites = require('../../src/config/stock-fetch-diagnosis-sites.json');

describe('テストタブのテストサイト候補', () => {
    const functions = loadScriptFunctions('../../src/ui/popup.js', [
        'getPrimarySelectorValue',
        'getEcSiteMonitorDefaultsFromSite',
        'buildTestTabSiteCandidates',
        'resolveTestTabSiteCandidate',
        'findSiteByUrl',
        'formatTestTabScenarioTimestamp'
    ]);

    test('監視条件と在庫ありサンプルがあるサイトを、在庫なしサンプルの有無とともに候補にする', () => {
        const candidates = functions.buildTestTabSiteCandidates(ecSites.sites, diagnosisSites.sites);
        const nissan = candidates.find((candidate) => candidate.id === 'nissan');

        expect(nissan).toEqual({
            id: 'nissan',
            name: '日産オンラインショップ',
            selector: '#form1 dl.clearfix:not(.kakaku):not(.parallel) dd',
            keyword: '在庫あり',
            inStockUrls: [
                'https://shop.nissan.co.jp/product/detail/6810'
            ],
            outOfStockUrls: ['https://shop.nissan.co.jp/product/detail/6710']
        });
        expect(candidates.map((candidate) => candidate.id)).toEqual(
            expect.arrayContaining(['nissan', 'aeon', 'sevennet', 'toysrus'])
        );
        expect(candidates.find((candidate) => candidate.id === 'sevennet')).toMatchObject({
            inStockUrls: [
                'https://7net.omni7.jp/detail/1107382767.html'
            ],
            outOfStockUrls: [
                'https://7net.omni7.jp/detail/1107731106.html'
            ]
        });
        expect(candidates.find((candidate) => candidate.id === 'fake-sevennet-local')).toEqual({
            id: 'fake-sevennet-local',
            name: '【テスト専用】偽セブンネットショッピング（localhost）',
            selector: 'button.add-to-cart.c-btnCartin.js-add-to-cart',
            keyword: 'カートに入れる',
            inStockUrls: [
                'http://localhost:4173/sevennet/detail/1000000001.html?stock=in',
                'http://localhost:4173/sevennet/detail/1000000005.html?stock=in'
            ],
            outOfStockUrls: [
                'http://localhost:4173/sevennet/detail/1000000002.html?stock=out',
                'http://localhost:4173/sevennet/detail/1000000003.html?stock=out',
                'http://localhost:4173/sevennet/detail/1000000004.html?stock=out&out=reservation'
            ]
        });
    });

    test('状態別のサンプルURLを重複なく候補に残す', () => {
        const candidates = functions.buildTestTabSiteCandidates(
            [{ id: 'shop', name: 'ショップ', selectors: { productPage: { pageRecorderMonitor: { selector: '.cart', keyword: 'カートに入れる' } } } }],
            [{ id: 'shop', samples: [
                { state: 'in_stock', url: 'https://shop.test/in-1' },
                { state: 'in_stock', url: 'https://shop.test/in-2' },
                { state: 'out_of_stock', url: 'https://shop.test/out-1' },
                { state: 'out_of_stock', url: 'https://shop.test/out-1' }
            ] }]
        );

        expect(candidates).toEqual([{
            id: 'shop', name: 'ショップ', selector: '.cart', keyword: 'カートに入れる',
            inStockUrls: ['https://shop.test/in-1', 'https://shop.test/in-2'],
            outOfStockUrls: ['https://shop.test/out-1']
        }]);
    });

    test('監視条件か在庫ありサンプルがないサイトは候補にしない', () => {
        expect(functions.buildTestTabSiteCandidates(
            [{ id: 'no-monitor', name: '監視値なし', selectors: { productPage: {} } }],
            [{ id: 'no-monitor', samples: [{ state: 'in_stock', url: 'https://shop.test/in' }] }]
        )).toEqual([]);
        expect(functions.buildTestTabSiteCandidates(
            [{ id: 'no-sample', name: 'サンプルなし', selectors: { productPage: { pageRecorderMonitor: { selector: '.cart', keyword: 'x' } } } }],
            [{ id: 'no-sample', samples: [{ state: 'out_of_stock', url: 'https://shop.test/out' }] }]
        )).toEqual([]);
    });

    test('保存済みのサイトがなければ日産、日産もなければ先頭の候補を選ぶ', () => {
        const candidates = [{ id: 'aeon' }, { id: 'nissan' }];

        expect(functions.resolveTestTabSiteCandidate(candidates, 'aeon')).toEqual({ id: 'aeon' });
        expect(functions.resolveTestTabSiteCandidate(candidates, 'removed')).toEqual({ id: 'nissan' });
        expect(functions.resolveTestTabSiteCandidate([{ id: 'aeon' }], 'removed')).toEqual({ id: 'aeon' });
        expect(functions.resolveTestTabSiteCandidate([], 'aeon')).toBeNull();
    });

    test('localhost のテスト専用定義はポート番号付き商品URLに一致する', () => {
        const site = functions.findSiteByUrl(
            'http://localhost:4173/sevennet/detail/1000000001.html?stock=in',
            ecSites.sites
        );

        expect(site).toMatchObject({
            id: 'fake-sevennet-local',
            name: '【テスト専用】偽セブンネットショッピング（localhost）'
        });
    });

    test('テストタブの結果日時は日本時間で表示し、不正値は表示しない', () => {
        expect(functions.formatTestTabScenarioTimestamp('2026-10-25T01:44:04.505Z')).toBe('2026/10/25 10:44:04');
        expect(functions.formatTestTabScenarioTimestamp('invalid')).toBe('');
        expect(functions.formatTestTabScenarioTimestamp('')).toBe('');
    });
});
