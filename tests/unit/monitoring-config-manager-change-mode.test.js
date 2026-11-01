const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadMonitoringConfigManager(extraContext = {}) {
    const filePath = path.resolve(__dirname, '../../src/background/monitoringConfigManager.js');
    const source = fs.readFileSync(filePath, 'utf8');
    const context = {
        console,
        URL,
        Date,
        Math,
        setTimeout,
        clearTimeout,
        logger: {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {}
        },
        ...extraContext
    };

    vm.createContext(context);
    vm.runInContext(`${source}\nthis.MonitoringConfigManager = MonitoringConfigManager; this.__mcmLogger = mcmLogger; this.__mcmConsole = console;`, context, {
        filename: 'monitoringConfigManager.js'
    });

    context.MonitoringConfigManager.__mcmLogger = context.__mcmLogger;
    context.MonitoringConfigManager.__mcmConsole = context.__mcmConsole;
    return context.MonitoringConfigManager;
}

describe('MonitoringConfigManager のログレベル互換層', () => {
    test('既存の詳細 console.log は mcmLogger.debug へ転送する', () => {
        const debug = jest.fn();
        const MonitoringConfigManager = loadMonitoringConfigManager({
            logger: { debug, info: jest.fn(), warn: jest.fn(), error: jest.fn() }
        });

        MonitoringConfigManager.__mcmConsole.log('Storage キー移行チェック', { key: 'value' });

        expect(debug).toHaveBeenCalledWith('[MCM] Storage キー移行チェック', { key: 'value' });
    });

    test('WARN と ERROR は対応する mcmLogger レベルへ転送する', () => {
        const warn = jest.fn();
        const error = jest.fn();
        const MonitoringConfigManager = loadMonitoringConfigManager({
            logger: { debug: jest.fn(), info: jest.fn(), warn, error }
        });

        MonitoringConfigManager.__mcmConsole.warn('補正しました');
        MonitoringConfigManager.__mcmConsole.error('保存に失敗しました');

        expect(warn).toHaveBeenCalledWith('[MCM] 補正しました');
        expect(error).toHaveBeenCalledWith('[MCM] 保存に失敗しました');
    });
});

describe('MonitoringConfigManager.changeMode', () => {
    test('single から multiple へ切り替えても既存 multiple_configs 2 件を維持する', async () => {
        const savedConfigs = [];
        const storedConfig = {
            mode: 'single',
            single_config: {
                url: 'https://single.example.com/item',
                settings: { monitorKeyword: 'single' }
            },
            multiple_configs: [
                { id: 'a', url: 'https://example.com/a', enabled: true, settings: { monitorKeyword: 'a' } },
                { id: 'b', url: 'https://example.com/b', enabled: false, settings: { monitorKeyword: 'b' } }
            ]
        };

        const MonitoringConfigManager = loadMonitoringConfigManager({
            chrome: {
                storage: {
                    local: {
                        get: async () => ({ monitoring_config: storedConfig }),
                        set: async (payload) => {
                            savedConfigs.push(payload.monitoring_config);
                        }
                    }
                }
            }
        });

        const manager = new MonitoringConfigManager();
        const result = await manager.changeMode('multiple');

        expect(result).toBe(true);
        expect(savedConfigs).toHaveLength(1);
        expect(savedConfigs[0].mode).toBe('multiple');
        expect(savedConfigs[0].single_config).toEqual(storedConfig.single_config);
        expect(savedConfigs[0].multiple_configs).toEqual(storedConfig.multiple_configs);
        expect(savedConfigs[0].multiple_configs).toHaveLength(2);
    });

    test('multiple から single へ切り替えても single_config と multiple_configs を勝手に変換しない', async () => {
        const savedConfigs = [];
        const storedConfig = {
            mode: 'multiple',
            single_config: {
                url: 'https://single.example.com/original',
                settings: { monitorKeyword: 'original-single' }
            },
            multiple_configs: [
                { id: 'a', url: 'https://example.com/a', enabled: true, settings: { monitorKeyword: 'a' } },
                { id: 'b', url: 'https://example.com/b', enabled: true, settings: { monitorKeyword: 'b' } }
            ]
        };

        const MonitoringConfigManager = loadMonitoringConfigManager({
            chrome: {
                storage: {
                    local: {
                        get: async () => ({ monitoring_config: storedConfig }),
                        set: async (payload) => {
                            savedConfigs.push(payload.monitoring_config);
                        }
                    }
                }
            }
        });

        const manager = new MonitoringConfigManager();
        const result = await manager.changeMode('single');

        expect(result).toBe(true);
        expect(savedConfigs).toHaveLength(1);
        expect(savedConfigs[0].mode).toBe('single');
        expect(savedConfigs[0].single_config).toEqual(storedConfig.single_config);
        expect(savedConfigs[0].multiple_configs).toEqual(storedConfig.multiple_configs);
        expect(savedConfigs[0].multiple_configs).toHaveLength(2);
    });

    test('test 相当のテスト状態が保存されていても changeMode は multiple_configs を保持する', async () => {
        const savedConfigs = [];
        const storedConfig = {
            mode: 'test',
            single_config: {
                url: 'https://single.example.com/original',
                settings: { monitorKeyword: 'original-single' }
            },
            multiple_configs: [
                { id: 'a', url: 'https://example.com/a', enabled: true, settings: { monitorKeyword: 'a' } },
                { id: 'b', url: 'https://example.com/b', enabled: false, settings: { monitorKeyword: 'b' } }
            ],
            multiple_test_scenario_state: {
                scenario_id: 'baseline_two_urls',
                scenario_mode: 'multiple',
                configs: [
                    { id: 'test-a', url: 'https://example.com/test-a' },
                    { id: 'test-b', url: 'https://example.com/test-b' }
                ],
                common_settings: { interval: 20, duration: 60 },
                saved_at: '2026-09-01T00:00:00.000Z'
            }
        };

        const MonitoringConfigManager = loadMonitoringConfigManager({
            chrome: {
                storage: {
                    local: {
                        get: async () => ({ monitoring_config: storedConfig }),
                        set: async (payload) => {
                            savedConfigs.push(payload.monitoring_config);
                        }
                    }
                }
            }
        });

        const manager = new MonitoringConfigManager();
        const result = await manager.changeMode('multiple');

        expect(result).toBe(true);
        expect(savedConfigs).toHaveLength(1);
        expect(savedConfigs[0].mode).toBe('multiple');
        expect(savedConfigs[0].multiple_configs).toEqual(storedConfig.multiple_configs);
        expect(savedConfigs[0].multiple_test_scenario_state).toEqual(storedConfig.multiple_test_scenario_state);
    });
});

describe('MonitoringConfigManager の単一URL定時監視設定移行', () => {
    test('新規B設定は固定の時刻初期値を持つ', () => {
        const MonitoringConfigManager = loadMonitoringConfigManager();
        const manager = new MonitoringConfigManager();

        expect(manager.getDefaultSingleScheduledWatch()).toMatchObject({ startTime: '11:57', endTime: '12:05', immediateDurationMinutes: 3 });
    });

    test('旧 single_config の予約情報だけをBへ移し、Aの商品ページURL・セレクタは転用しない', async () => {
        const savedConfigs = [];
        const storedConfig = {
            mode: 'single',
            single_config: {
                url: 'https://example.com/list',
                settings: {
                    monitorSelector: '.legacy-product',
                    monitorKeyword: '在庫あり',
                    scheduleEnabled: true,
                    scheduleWindowStart: '09:30',
                    scheduleWindowEnd: '10:00',
                    scheduleReloadIntervalSec: 45,
                    openDetectedUrl: true,
                    notifyExternalExtension: true,
                    externalExtensionId: 'abcdefghijklmnop'
                }
            }
        };
        const MonitoringConfigManager = loadMonitoringConfigManager({
            chrome: {
                storage: {
                    local: {
                        get: async () => ({ monitoring_config: storedConfig }),
                        set: async (payload) => { savedConfigs.push(payload.monitoring_config); }
                    }
                }
            }
        });

        const config = await new MonitoringConfigManager().loadConfig();

        expect(config.single_scheduled_watch).toMatchObject({
            url: '',
            monitorSelector: '',
            siteId: '',
            profileId: '',
            enabled: false,
            startTime: '09:30',
            endTime: '10:00',
            intervalSeconds: 45,
            openDetectedUrl: true,
            notifyExternalExtension: true,
            externalExtensionId: 'abcdefghijklmnop'
        });
        expect(config.single_config.settings.monitorKeyword).toBe('在庫あり');
        expect(config.single_config.settings).not.toHaveProperty('scheduleEnabled');
        expect(config.single_config.settings).not.toHaveProperty('scheduleWindowStart');
        expect(savedConfigs).toHaveLength(1);
    });

    test('既存 single_scheduled_watch は旧A設定で上書きしない', async () => {
        const storedConfig = {
            mode: 'single',
            single_config: {
                url: 'https://a.example.com',
                settings: { monitorSelector: '.a', scheduleEnabled: true }
            },
            single_scheduled_watch: {
                url: 'https://b.example.com/list',
                monitorSelector: '.b',
                siteId: 'aeon',
                profileId: 'pokemon-card-game',
                enabled: false,
                startTime: '12:00'
            }
        };
        const MonitoringConfigManager = loadMonitoringConfigManager({
            chrome: { storage: { local: { get: async () => ({ monitoring_config: storedConfig }), set: async () => {} } } }
        });

        const config = await new MonitoringConfigManager().loadConfig();

        expect(config.single_scheduled_watch).toMatchObject({
            url: 'https://b.example.com/list', monitorSelector: '.b', siteId: 'aeon', profileId: 'pokemon-card-game', enabled: false, startTime: '12:00'
        });
    });

    test('項目順が異なる移行済みB設定の状態取得では保存しない', async () => {
        const savedConfigs = [];
        const storedConfig = {
            mode: 'single',
            single_config: { url: 'https://a.example.com', settings: { monitorKeyword: '在庫あり' } },
            // 意図的に既定値とは異なる順序で設定する。
            single_scheduled_watch: {
                intervalSeconds: 20,
                enabled: true,
                url: 'https://b.example.com/list',
                monitorSelector: '.product-link',
                siteId: 'sevennet',
                profileId: 'pokemon-card-game',
                startTime: '16:06',
                endTime: '16:07',
                openDetectedUrl: false,
                notifyExternalExtension: false,
                externalExtensionId: ''
            }
        };
        const MonitoringConfigManager = loadMonitoringConfigManager({
            chrome: {
                storage: {
                    local: {
                        get: async () => ({ monitoring_config: storedConfig }),
                        set: async (payload) => { savedConfigs.push(payload.monitoring_config); }
                    }
                }
            }
        });

        const manager = new MonitoringConfigManager();
        await manager.loadConfig();
        await manager.loadConfig();

        expect(savedConfigs).toHaveLength(0);
    });

    test('旧B設定は初回だけ移行して保存する', async () => {
        const savedConfigs = [];
        let storedConfig = {
            mode: 'single',
            single_config: {
                url: 'https://a.example.com',
                settings: { monitorKeyword: '在庫あり', scheduleWindowStart: '09:30' }
            }
        };
        const MonitoringConfigManager = loadMonitoringConfigManager({
            chrome: {
                storage: {
                    local: {
                        get: async () => ({ monitoring_config: storedConfig }),
                        set: async (payload) => {
                            storedConfig = payload.monitoring_config;
                            savedConfigs.push(storedConfig);
                        }
                    }
                }
            }
        });

        const manager = new MonitoringConfigManager();
        await manager.loadConfig();
        await manager.loadConfig();

        expect(savedConfigs).toHaveLength(1);
        expect(storedConfig.single_config.settings).not.toHaveProperty('scheduleWindowStart');
    });
});

describe('MonitoringConfigManager のExcel設定正本化', () => {
    test('getStatus は正本 multiple_configs だけを返す', async () => {
        const storedConfig = {
            mode: 'multiple',
            multiple_configs: [{ id: 'canonical-a' }, { id: 'canonical-b' }],
            multiple_common_settings: { interval: 20 }
        };
        const MonitoringConfigManager = loadMonitoringConfigManager({
            chrome: {
                storage: {
                    local: {
                        get: async () => ({ monitoring_config: storedConfig }),
                        set: async () => {}
                    }
                }
            }
        });

        const status = await new MonitoringConfigManager().getStatus();

        expect(status.success).toBe(true);
        expect(status.multiple_configs).toEqual(storedConfig.multiple_configs);
        expect(status).not.toHaveProperty('multiple_targets');
    });

    test('旧 multiple_targets だけの設定を移行してExcel出力できる', async () => {
        const savedConfigs = [];
        const storedConfig = {
            mode: 'multiple',
            multiple_configs: [],
            multiple_targets: [
                {
                    id: 'legacy-a',
                    name: '旧設定A',
                    url: 'https://example.com/a',
                    enabled: true,
                    settings: { monitorKeyword: '在庫' }
                },
                {
                    id: 'legacy-b',
                    name: '旧設定B',
                    url: 'https://example.com/b',
                    enabled: true,
                    settings: { monitorKeyword: '予約' }
                }
            ]
        };
        const MonitoringConfigManager = loadMonitoringConfigManager({
            Blob,
            XLSX: {
                utils: {
                    book_new: () => ({ SheetNames: [], Sheets: {} }),
                    json_to_sheet: (data) => ({ data }),
                    sheet_add_aoa: () => {},
                    book_append_sheet: (workbook, worksheet, name) => {
                        workbook.SheetNames.push(name);
                        workbook.Sheets[name] = worksheet;
                    }
                },
                write: () => new Uint8Array([1, 2, 3])
            },
            chrome: {
                storage: {
                    local: {
                        get: async () => ({ monitoring_config: storedConfig }),
                        set: async (payload) => {
                            savedConfigs.push(payload.monitoring_config);
                        }
                    }
                }
            }
        });

        const result = await new MonitoringConfigManager().exportToExcel();

        expect(result.success).toBe(true);
        expect(savedConfigs).toHaveLength(1);
        expect(savedConfigs[0].multiple_configs).toHaveLength(2);
        expect(savedConfigs[0]).not.toHaveProperty('multiple_targets');
    });

    test('正本がある場合は旧 multiple_targets で上書きせず削除する', async () => {
        const savedConfigs = [];
        const storedConfig = {
            mode: 'multiple',
            multiple_configs: [{ id: 'canonical', url: 'https://example.com/current' }],
            multiple_targets: [{ id: 'legacy', url: 'https://example.com/old' }]
        };
        const MonitoringConfigManager = loadMonitoringConfigManager({
            chrome: {
                storage: {
                    local: {
                        get: async () => ({ monitoring_config: storedConfig }),
                        set: async (payload) => {
                            savedConfigs.push(payload.monitoring_config);
                        }
                    }
                }
            }
        });

        const config = await new MonitoringConfigManager().migrateLegacyMultipleTargetsToConfigs();

        expect(config.multiple_configs).toEqual([
            { id: 'canonical', url: 'https://example.com/current' }
        ]);
        expect(config).not.toHaveProperty('multiple_targets');
        expect(savedConfigs).toHaveLength(1);
    });

    test('取込保存後に旧 multiple_targets を再作成しない', async () => {
        const savedConfigs = [];
        const storedConfig = {
            mode: 'multiple',
            multiple_configs: [],
            multiple_targets: [{ id: 'legacy', url: 'https://example.com/legacy' }]
        };
        const MonitoringConfigManager = loadMonitoringConfigManager({
            chrome: {
                storage: {
                    local: {
                        get: async () => ({ monitoring_config: storedConfig }),
                        set: async (payload) => {
                            savedConfigs.push(payload.monitoring_config);
                        }
                    }
                }
            }
        });
        const manager = new MonitoringConfigManager();
        const config = await manager.migrateLegacyMultipleTargetsToConfigs();

        await manager.processImportData([
            {
                '監視名': '取込設定',
                'URL': 'https://example.com/imported',
                '有効状態': '有効'
            }
        ], config, false);

        const latest = savedConfigs.at(-1);
        expect(latest.multiple_configs).toHaveLength(2);
        expect(latest).not.toHaveProperty('multiple_targets');
    });
});
