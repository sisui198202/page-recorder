const { loadScriptFunctions } = require('../helpers/load-source-functions');
const ecSites = require('../../src/config/ec-sites.json');

describe('ECサイトのPageRecorder監視既定値', () => {
    const functions = loadScriptFunctions('../../src/ui/popup.js', [
        'getPrimarySelectorValue',
        'getEcSiteMonitorDefaultsFromSite'
    ]);

    test('PageRecorder専用の監視値を優先する', () => {
        expect(functions.getEcSiteMonitorDefaultsFromSite({
            selectors: { productPage: {
                pageRecorderMonitor: { selector: ' div.cart ', keyword: ' 予約する ' },
                inStock: ['button#buy:not([disabled])'],
                inStockText: ['予約する']
            } }
        })).toEqual({ selector: 'div.cart', keyword: '予約する' });
    });

    test('イオンはPageRecorder専用の監視値を使う', () => {
        const aeon = ecSites.sites.find((site) => site.id === 'aeon');

        expect(functions.getEcSiteMonitorDefaultsFromSite(aeon)).toEqual({
            selector: '#ctl00_ContentPlaceHolder1_upUpdatePanel .product__cart',
            keyword: 'カートに入れる'
        });
    });

    test('日産は一括診断に使う商品監視プロファイルを配布する', () => {
        const nissan = ecSites.sites.find((site) => site.id === 'nissan');

        expect(nissan.monitorProfiles).toContainEqual({
            id: 'product-default',
            selector: '#form1 dl.clearfix:not(.kakaku):not(.parallel) dd',
            keyword: '在庫あり',
            detectMode: 'appear'
        });
    });

    test('専用値がない既存サイトは従来の在庫あり候補へフォールバックする', () => {
        expect(functions.getEcSiteMonitorDefaultsFromSite({
            selectors: { productPage: {
                inStock: ['#stock-status'],
                inStockText: ['在庫あり']
            } }
        })).toEqual({ selector: '#stock-status', keyword: '在庫あり' });
    });

    test('専用値が片方だけのときは不完全な値を使わない', () => {
        expect(functions.getEcSiteMonitorDefaultsFromSite({
            selectors: { productPage: {
                pageRecorderMonitor: { selector: 'div.cart' },
                inStock: ['#stock-status'],
                inStockText: ['在庫あり']
            } }
        })).toEqual({ selector: '#stock-status', keyword: '在庫あり' });
    });
});
