const { loadScriptFunctions } = require('../helpers/load-source-functions');
const targetsConfig = require('../../src/config/page-recorder-targetpages.json');

describe('共有targetpageの商品名UI', () => {
    const {
        getSharedTargetpageSites,
        filterSharedTargetpages,
        getSharedTargetpageDisplayName,
        normalizeTargetpageProfile,
        normalizeMonitoringTargetUrl,
        filterUnregisteredSharedTargetpages,
        getAvailableMultipleSharedTargetpages,
        groupMultipleSharedTargetpagesByState,
        buildSharedTargetpageMultipleMonitoringTarget
    } = loadScriptFunctions(
        '../../src/ui/popup.js',
        [
            'getSharedTargetpageSites',
            'filterSharedTargetpages',
            'getSharedTargetpageDisplayName',
            'normalizeTargetpageProfile',
            'normalizeMonitoringTargetUrl',
            'filterUnregisteredSharedTargetpages',
            'getAvailableMultipleSharedTargetpages',
            'groupMultipleSharedTargetpagesByState',
            'buildSharedTargetpageMultipleMonitoringTarget'
        ]
    );

    test('共有正本の全商品ターゲットを状態付きで配布する', () => {
        expect(targetsConfig.targets).toHaveLength(12);
        expect(targetsConfig.targets.every((target) => ['in_stock', 'out_of_stock'].includes(target.state))).toBe(true);
    });

    test('環境とサイト名で商品候補を絞り込む', () => {
        const targets = [
            { id: 'nissan-test', environment: 'test', siteId: 'nissan' },
            { id: 'sevennet-test', environment: 'test', siteId: 'sevennet' },
            { id: 'sevennet-prod', environment: 'prod', siteId: 'sevennet' }
        ];

        expect(getSharedTargetpageSites(targets, 'test')).toEqual(['nissan', 'sevennet']);
        expect(filterSharedTargetpages(targets, 'test', 'sevennet').map((target) => target.id)).toEqual(['sevennet-test']);
    });

    test('商品名に在庫状態ラベルを付ける', () => {
        expect(getSharedTargetpageDisplayName({ title: '商品A', state: 'in_stock' })).toBe('🟢 在庫あり｜商品A');
        expect(getSharedTargetpageDisplayName({ title: '商品B', state: 'out_of_stock' })).toBe('⚪ 在庫なし｜商品B');
        expect(getSharedTargetpageDisplayName({ name: '旧商品' })).toBe('旧商品');
    });

    test('複数URL監視へ追加済みの商品URLは候補から除外する', () => {
        const targets = [
            { id: 'first', url: 'https://example.com/products/1' },
            { id: 'second', url: 'https://example.com/products/2' }
        ];
        const monitoringConfigs = [
            { id: 'configured', url: 'https://example.com/products/1' }
        ];

        expect(normalizeMonitoringTargetUrl(targets[0].url)).toBe('https://example.com/products/1');
        expect(filterUnregisteredSharedTargetpages(targets, monitoringConfigs).map((target) => target.id)).toEqual(['second']);
    });

    test('共通ECサイト選択で共有targetpage候補を絞り、未選択では全サイトを残す', () => {
        const targets = [
            { id: 'nissan', environment: 'test', siteId: 'nissan', url: 'https://nissan.test/1' },
            { id: 'sevennet', environment: 'test', siteId: 'sevennet', url: 'https://sevennet.test/1' },
            { id: 'sevennet-prod', environment: 'prod', siteId: 'sevennet', url: 'https://sevennet.test/2' }
        ];

        expect(getAvailableMultipleSharedTargetpages(targets, [], 'test', 'sevennet').map((target) => target.id)).toEqual(['sevennet']);
        expect(getAvailableMultipleSharedTargetpages(targets, [], 'test').map((target) => target.id)).toEqual(['nissan', 'sevennet']);
    });

    test('複数URL監視の商品候補を在庫状態ごとにまとめる', () => {
        const targets = [
            { id: 'out-1', state: 'out_of_stock' },
            { id: 'in-1', state: 'in_stock' },
            { id: 'in-2', state: 'in_stock' }
        ];

        expect(groupMultipleSharedTargetpagesByState(targets)).toEqual([
            { state: 'in_stock', label: '🟢 在庫あり', targets: [targets[1], targets[2]] },
            { state: 'out_of_stock', label: '⚪ 在庫なし', targets: [targets[0]] }
        ]);
    });

    test('共有 targetpage の監視条件と通知プロファイルを複数URL監視設定へ引き継ぐ', () => {
        const target = {
            id: 'sevennet-test',
            environment: 'test',
            siteId: 'sevennet',
            title: '商品A',
            url: 'https://example.com/products/1',
            monitor: { selector: '.add-to-cart', keyword: 'カートに入れる', detectMode: 'appear' },
            notification: { externalExtensionId: 'extension-id' }
        };

        const result = buildSharedTargetpageMultipleMonitoringTarget(target, {
            initialKeywordDetection: false,
            interval: 5,
            duration: 60,
            reloadWaitAfterReload: 2
        });

        expect(result).toMatchObject({
            name: '商品A',
            url: target.url,
            selector: '.add-to-cart',
            keyword: 'カートに入れる',
            detection_mode: 'appear',
            enabled: true,
            settings: {
                monitorSelector: '.add-to-cart',
                monitorKeyword: 'カートに入れる',
                detectMode: 'appear',
                notifyExternalExtension: true,
                externalExtensionId: 'extension-id',
                targetpage: {
                    id: 'sevennet-test',
                    environment: 'test',
                    siteId: 'sevennet',
                    externalExtensionId: 'extension-id'
                }
            }
        });
    });
});
