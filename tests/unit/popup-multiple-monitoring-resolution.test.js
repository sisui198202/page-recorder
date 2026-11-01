const { loadScriptFunctions } = require('../helpers/load-source-functions');
const fs = require('fs');
const path = require('path');

describe('popup.js 複数監視データ解決', () => {
    test('getStatus とStorage取得が失敗した場合は空設定の成功応答にしない', async () => {
        const chrome = {
            runtime: {
                sendMessage: (_request, callback) => callback(undefined)
            },
            storage: {
                local: {
                    get: (_keys, callback) => callback({})
                }
            }
        };
        const {
            normalizeGetStatusResponse,
            readMonitoringConfigFromChromeStorage,
            getMonitoringDataDirect,
            getStatusWithFallback
        } = loadScriptFunctions(
            '../../src/ui/popup.js',
            [
                'normalizeGetStatusResponse',
                'readMonitoringConfigFromChromeStorage',
                'getMonitoringDataDirect',
                'getStatusWithFallback'
            ],
            { chrome, DEFAULT_POPUP_MODE: 'multiple' }
        );

        await expect(getStatusWithFallback()).resolves.toMatchObject({
            success: false,
            error: '監視設定を取得できませんでした',
            multiple_configs: []
        });
        expect(normalizeGetStatusResponse).toBeDefined();
        expect(readMonitoringConfigFromChromeStorage).toBeDefined();
        expect(getMonitoringDataDirect).toBeDefined();
    });

    test('ECサイト選択は1件だけを保持し、既存の複数選択は解除する', () => {
        const { normalizeSingleEcSiteSelection } = loadScriptFunctions('../../src/ui/popup.js', [
            'normalizeSingleEcSiteSelection'
        ]);

        expect(normalizeSingleEcSiteSelection({ sevennet: true, aeon: true })).toEqual({
            ecSiteEnabled: { sevennet: false, aeon: false },
            didNormalize: true
        });
    });

    test('単一URLのECサイト選択UIはA内の単一選択プルダウンに統一する', () => {
        const popupHtml = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.html'),
            'utf8'
        );
        const singleModeStart = popupHtml.indexOf('<div id="singleModeUI"');
        const singleModeEnd = popupHtml.indexOf('<div id="testModeUI"');
        const singleModeHtml = popupHtml.slice(singleModeStart, singleModeEnd);

        const keywordSectionStart = singleModeHtml.indexOf('<h3>A: キーワード監視（単一URL）</h3>');
        const keywordSectionHtml = singleModeHtml.slice(keywordSectionStart);

        expect(keywordSectionHtml).toContain('id="ecSiteSelectKeyword"');
        expect(singleModeHtml).not.toContain('id="ecSiteSelectionSection"');
        expect(singleModeHtml).not.toContain('id="ecSiteSelectDiagnosis"');
    });

    test('永続セッションは監視スコープを優先し、旧multiple形式もtab指定から分類する', () => {
        const { getMonitoringSessionScope } = loadScriptFunctions('../../src/background/background.js', [
            'getMonitoringSessionScope'
        ]);

        expect(getMonitoringSessionScope({ monitoringScope: 'single' })).toBe('single');
        expect(getMonitoringSessionScope({ monitoringScope: 'multiple' })).toBe('multiple');
        expect(getMonitoringSessionScope({ settings: { monitorType: 'tab' } })).toBe('multiple');
        expect(getMonitoringSessionScope({ settings: { monitorType: 'url' } })).toBe('single');
    });

    test('単一URL監視は入力欄保存の完了後に開始する', async () => {
        const callOrder = [];
        const { runSingleStartAfterSettingsSave } = loadScriptFunctions('../../src/ui/popup.js', [
            'runSingleStartAfterSettingsSave'
        ]);

        const started = await runSingleStartAfterSettingsSave({
            save: async () => {
                callOrder.push('save');
                return true;
            },
            start: async () => callOrder.push('start')
        });

        expect(started).toBe(true);
        expect(callOrder).toEqual(['save', 'start']);
    });

    test('単一URL監視は保存失敗時に開始しない', async () => {
        const start = jest.fn();
        const { runSingleStartAfterSettingsSave } = loadScriptFunctions('../../src/ui/popup.js', [
            'runSingleStartAfterSettingsSave'
        ]);

        const started = await runSingleStartAfterSettingsSave({
            save: async () => false,
            start
        });

        expect(started).toBe(false);
        expect(start).not.toHaveBeenCalled();
    });

    test('AI判断サポート設定は選択中モードへ即時保存する', async () => {
        const saveMultipleModeCommonSettings = jest.fn().mockResolvedValue(true);
        const flushSingleSettingsSave = jest.fn().mockResolvedValue(true);
        const { persistAiSupportFilePreference } = loadScriptFunctions('../../src/ui/popup.js', [
            'persistAiSupportFilePreference'
        ], {
            saveMultipleModeCommonSettings,
            flushSingleSettingsSave
        });

        await expect(persistAiSupportFilePreference('multiple')).resolves.toBe(true);
        await expect(persistAiSupportFilePreference('single')).resolves.toBe(true);

        expect(saveMultipleModeCommonSettings).toHaveBeenCalledTimes(1);
        expect(flushSingleSettingsSave).toHaveBeenCalledTimes(1);
    });

    test('単一監視設定は選択した監視・取得方式を保存する', () => {
        const { buildSingleConfigFromUISettings } = loadScriptFunctions('../../src/ui/popup.js', [
            'buildSingleConfigFromUISettings'
        ]);

        const config = buildSingleConfigFromUISettings({
            monitorType: 'url',
            targetUrl: 'https://example.com/item',
            monitoringMode: 'long_running',
            captureMode: 'fetch',
            interval: 30,
            duration: 1800
        });

        expect(config).toEqual(expect.objectContaining({
            url: 'https://example.com/item',
            settings: expect.objectContaining({
                monitoringMode: 'long_running',
                captureMode: 'fetch',
                interval: 30,
                duration: 1800
            })
        }));
    });

    test('保存済みの選択肢にある取得期間はカスタム表示へ変換しない', () => {
        const elements = {
            duration: { value: 'custom' },
            customDurationContainer: { style: { display: 'block' } },
            customDuration: { value: 1 },
            customDurationValue: { textContent: '1' }
        };
        const { updateDurationUI } = loadScriptFunctions('../../src/ui/popup.js', [
            'updateDurationUI'
        ], { elements });

        updateDurationUI(1800);

        expect(elements.duration.value).toBe(1800);
        expect(elements.customDurationContainer.style.display).toBe('none');

        updateDurationUI(120);

        expect(elements.duration.value).toBe('custom');
        expect(elements.customDuration.value).toBe(2);
        expect(elements.customDurationContainer.style.display).toBe('block');
    });

    test('複数監視の保存済み30分は通常の取得期間選択肢として表示する', () => {
        const elements = {
            multiMonitoringMode: { value: 'high_frequency' },
            downloadAiSupportFile: { checked: false },
            multiInterval: { value: '20' },
            multiCustomIntervalContainer: { style: { display: 'block' } },
            multiCustomInterval: { value: 20 },
            multiCustomIntervalValue: { textContent: '20' },
            multiDuration: { value: 'custom' },
            multiCustomDurationContainer: { style: { display: 'block' } },
            multiCustomDuration: { value: 1 },
            multiCustomDurationValue: { textContent: '1' }
        };
        const { loadMultipleModeCommonSettings } = loadScriptFunctions('../../src/ui/popup.js', [
            'loadMultipleModeCommonSettings'
        ], {
            elements,
            toggleMultiManualTestSettings: jest.fn(),
            applyMultipleMonitoringModeConstraints: jest.fn()
        });

        loadMultipleModeCommonSettings({
            multiple_common_settings: {
                monitoringMode: 'long_running',
                downloadAiSupportFile: true,
                interval: 30,
                duration: 1800
            }
        });

        expect(elements.multiMonitoringMode.value).toBe('long_running');
        expect(elements.downloadAiSupportFile.checked).toBe(true);
        expect(elements.multiInterval.value).toBe('30');
        expect(elements.multiDuration.value).toBe('1800');
        expect(elements.multiCustomDurationContainer.style.display).toBe('none');
    });

    test('保存済み multiple シナリオIDは6/7を含めて復元し、不正値は既定へ戻す', () => {
        const { resolveStoredMultipleTestScenarioId } = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveStoredMultipleTestScenarioId'
        ], {
            getTestScenarioModeDefinition: () => ({
                defaultScenarioId: 'baseline_two_urls',
                scenarios: {
                    baseline_two_urls: {},
                    gmail_notification_one_url: {},
                    gmail_notification_two_urls: {}
                }
            })
        });

        expect(resolveStoredMultipleTestScenarioId({ scenario_id: 'gmail_notification_one_url' }))
            .toBe('gmail_notification_one_url');
        expect(resolveStoredMultipleTestScenarioId({ scenario_id: 'gmail_notification_two_urls' }))
            .toBe('gmail_notification_two_urls');
        expect(resolveStoredMultipleTestScenarioId({ scenario_id: 'removed_scenario' }))
            .toBe('baseline_two_urls');
        expect(resolveStoredMultipleTestScenarioId(null)).toBe('baseline_two_urls');
    });

    test('multiple テストシナリオ文言は正常系 3 本を保持する', () => {
        const popupSource = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.js'),
            'utf8'
        );

        expect(popupSource).toContain("label: '1. 在庫なし2件で継続監視を開始する'");
        expect(popupSource).toContain("label: '2. 在庫あり2件で開始直後に一致する'");
        expect(popupSource).toContain("label: '3. 在庫なし2件で開始直後に未一致のまま継続する'");
        expect(popupSource).toContain("value: '0秒（待機なし）'");
        expect((popupSource.match(/reloadWaitAfterReload: 0/g) || []).length).toBeGreaterThanOrEqual(9);
    });

    test('multiple の在庫状態変化シナリオは 6710 の2件に15秒待機と再現コードの表示値を持つ', () => {
        const popupSource = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.js'),
            'utf8'
        );
        const manualScenarioStart = popupSource.indexOf("auto_appear_two_urls: {");
        const nextScenarioStart = popupSource.indexOf("gmail_notification_one_url: createMultipleGmailTestScenario(");
        const manualScenarioSource = popupSource.slice(manualScenarioStart, nextScenarioStart);
        const existingMultipleScenarioSource = popupSource.slice(
            popupSource.indexOf('const MULTIPLE_TEST_SCENARIOS = {'),
            manualScenarioStart
        );

        expect(manualScenarioStart).toBeGreaterThan(-1);
        expect(manualScenarioSource).toContain("label: '4. 在庫なし2件で在庫状態を変えて検知する'");
        expect(manualScenarioSource).toContain("id: 'test-multi-6710-manual-appear-a'");
        expect(manualScenarioSource).toContain("id: 'test-multi-6710-manual-appear-b'");
        expect(manualScenarioSource).toContain('reloadWaitAfterReload: 15');
        expect((manualScenarioSource.match(/reloadWaitAfterReload: 15/g) || [])).toHaveLength(3);
        expect(manualScenarioSource).toContain('extraDevtoolsCode: NISSAN_TEST_MANUAL_APPEAR_CODE');
        expect(manualScenarioSource).toContain('監視タブ 2 件のそれぞれで再現コードを実行する');
        expect(manualScenarioSource).toContain('2 件ともスクリーンショットと HTML が保存される');
        expect(existingMultipleScenarioSource).not.toContain('extraDevtoolsCode:');
    });

    test('multiple 共通設定の待機秒数は 0 を 3 に戻さず保持する', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'buildMultipleModeCommonSettingsFromUI',
            'syncMonitorWithMultipleCommonSettings'
        ], {
            elements: {
                multiDetectAppear: { checked: true },
                multiDetectDisappear: { checked: false },
                multiInitialKeywordDetection: { checked: true },
                multiCaptureMode: { value: 'fetch' },
                downloadAiSupportFile: { checked: true },
                multiReloadWaitAfterReload: { value: '0' },
                multiInterval: { value: '20' },
                multiCustomInterval: { value: '' },
                multiDuration: { value: '60' },
                multiCustomDuration: { value: '' }
            }
        });

        const commonSettings = functions.buildMultipleModeCommonSettingsFromUI();
        expect(commonSettings.reloadWaitAfterReload).toBe(0);
        expect(commonSettings.captureMode).toBe('fetch');
        expect(commonSettings.downloadAiSupportFile).toBe(true);

        const synced = functions.syncMonitorWithMultipleCommonSettings({
            settings: {
                reloadWaitAfterReload: 9
            }
        }, {
            reloadWaitAfterReload: 0
        });

        expect(synced.settings.reloadWaitAfterReload).toBe(0);
    });

    test('popup のログレベル選択肢は KEY と用途説明を併記する', () => {
        const popupHtml = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.html'),
            'utf8'
        );

        expect(popupHtml).toContain('<option value="1">ERROR | 失敗時だけ確認したい時</option>');
        expect(popupHtml).toContain('<option value="3" selected>INFO | 通常の手動テスト時</option>');
        expect(popupHtml).toContain('<option value="4">DEBUG | 切り分けで詳細確認したい時</option>');
    });

    test('Excel取込は同期 native file input 起動用のボタンと非表示 input を持つ', () => {
        const popupHtml = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.html'),
            'utf8'
        );
        const popupSource = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.js'),
            'utf8'
        );

        expect(popupHtml).toContain('<button id="importExcelBtn" type="button"');
        expect(popupHtml).toContain('📥 Excel取込');
        expect(popupHtml).toContain('<input type="file" id="excelFileInput" accept=".xlsx,.xls,.csv" style="display: none;">');
        expect(popupHtml).not.toContain('file-input-control');
        expect(popupHtml.indexOf('id="excelFileInput"')).toBeGreaterThan(popupHtml.indexOf('id="addMonitorModal"'));
        expect(popupSource).not.toContain('showOpenFilePicker');
        expect(popupSource).toContain("importExcelBtn.addEventListener('click', selectExcelFile)");
        expect(popupSource).toContain("excelFileInput.addEventListener('change', handleFileSelect)");
        expect(popupSource).toContain('await importSelectedFile(file)');
    });

    test('取込ボタンは同期的に native file input を起動する', () => {
        const input = { click: jest.fn() };
        const { selectExcelFile } = loadScriptFunctions('../../src/ui/popup.js', ['selectExcelFile'], {
            elements: { excelFileInput: input }
        });

        const result = selectExcelFile();

        expect(result).toBeUndefined();
        expect(input.click).toHaveBeenCalledTimes(1);
    });

    test('native input の選択は共通取込処理へ渡す', async () => {
        const importSelectedFile = jest.fn().mockResolvedValue(undefined);
        const selectedFile = { name: 'settings.xlsx' };
        const { handleFileSelect } = loadScriptFunctions('../../src/ui/popup.js', ['handleFileSelect'], {
            importSelectedFile
        });
        const event = { target: { files: [selectedFile], value: 'settings.xlsx' } };

        await handleFileSelect(event);

        expect(importSelectedFile).toHaveBeenCalledWith(selectedFile);
        expect(event.target.value).toBe('');
    });

    test('ファイル選択のキャンセル時は取込処理を呼ばない', async () => {
        const importSelectedFile = jest.fn();
        const { handleFileSelect } = loadScriptFunctions('../../src/ui/popup.js', ['handleFileSelect'], {
            importSelectedFile
        });
        const event = { target: { files: [], value: 'settings.xlsx' } };

        await handleFileSelect(event);
        expect(importSelectedFile).not.toHaveBeenCalled();
        expect(event.target.value).toBe('');
    });

    test('正本の multiple_configs が空でも、空一覧を正常状態として扱う', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveMultipleMonitoringCollections',
            'hasCompleteMultipleConfigList',
            'resolveMultipleMonitoringConfigForPopup'
        ]);

        expect(functions.hasCompleteMultipleConfigList({ multiple_configs: [] })).toBe(true);
        expect(functions.hasCompleteMultipleConfigList({ multiple_configs: [], ultra_optimized: true })).toBe(false);
        expect(functions.hasCompleteMultipleConfigList({ multiple_configs_summary: {} })).toBe(false);
        expect(functions.resolveMultipleMonitoringConfigForPopup(
            { success: true, multiple_configs_summary: {} },
            { multiple_configs: [{ id: 'saved-target' }] }
        )).toEqual(expect.objectContaining({
            source: 'persisted',
            selectedTargets: [{ id: 'saved-target' }]
        }));
    });

    test('test タブのサブ切替は A系シナリオとB/C定時監視を localStorage から復元する', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'normalizeTestScenarioMode',
            'readStoredTestScenarioMode'
        ], {
            TEST_SCENARIO_MODE_STORAGE_KEY: 'popupTestScenarioMode',
            localStorage: {
                getItem: () => 'multiple'
            }
        });

        expect(functions.normalizeTestScenarioMode('multiple')).toBe('multiple');
        expect(functions.normalizeTestScenarioMode('scheduled')).toBe('scheduled');
        expect(functions.normalizeTestScenarioMode('acceptance')).toBe('acceptance');
        expect(functions.normalizeTestScenarioMode('unexpected')).toBe('acceptance');
        expect(functions.readStoredTestScenarioMode()).toBe('multiple');
    });

    test('テスト開始ボタンは popup HTML に含まれる', () => {
        const popupHtml = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.html'),
            'utf8'
        );

        expect(popupHtml).toContain('id="startTestScenarioButton"');
    });

    test('受け入れ確認は用途別カードで全シナリオIDを維持する', () => {
        const popupHtml = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.html'),
            'utf8'
        );
        const acceptancePanel = popupHtml.slice(
            popupHtml.indexOf('id="twoTierAcceptanceTestPanel"'),
            popupHtml.indexOf('id="scheduledWatchTestPanel"')
        );

        expect(acceptancePanel).toContain('two-tier-acceptance-layout');
        expect(acceptancePanel).toContain('two-tier-acceptance-grid');
        expect(acceptancePanel).toContain('data-two-tier-scenario="high_frequency_single_duration"');
        expect(acceptancePanel).toContain('data-two-tier-scenario="high_frequency_single_detect"');
        expect(acceptancePanel).toContain('data-two-tier-scenario="high_frequency_multiple_duration"');
        expect(acceptancePanel).toContain('data-two-tier-scenario="high_frequency_multiple_detect"');
        expect(acceptancePanel).toContain('data-two-tier-scenario="long_running_single"');
        expect(acceptancePanel).toContain('専用アラームを作成し、開始時の基準保存後に30秒周期で発火');
        expect(acceptancePanel).toContain('初回アラーム発火で終了');
    });

    test('test タブの静的文言はテストコード欄の役割を示す', () => {
        const popupHtml = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.html'),
            'utf8'
        );

        expect(popupHtml).toContain('`multiple に適用` は保存のみ。開始は `multiple テスト開始`');
        expect(popupHtml).toContain('固定設定を反映');
        expect(popupHtml).toContain('ページ状態の確認コード');
        expect(popupHtml).toContain('検知を再現するコード');
        expect(popupHtml).toContain('id="copyDevtoolsCodeButton" class="btn-secondary action-btn" type="button">コピー</button>');
        expect(popupHtml).toContain('id="copyExtraDevtoolsCodeButton" class="btn-secondary action-btn" type="button">コピー</button>');
        expect(popupHtml).not.toContain('ページ状態の確認コードをコピー');
        expect(popupHtml).not.toContain('検知を再現するコードをコピー');
        expect(popupHtml).toContain('id="testScenarioDevtoolsDescription"');
        expect(popupHtml).toContain('id="testScenarioExtraDevtoolsDescription"');
        expect(popupHtml).not.toContain('今のページ状態を確認');
        expect(popupHtml).not.toContain('一時的に状態を作る');
        expect(popupHtml).toContain('<li>拡張をリロードしてから開始</li>');
        expect(popupHtml).toContain('<li>Service Worker Console を開いてログ確認</li>');
        expect(popupHtml).not.toContain('このタブは空欄補完ではなく、日産オンラインショップ向けの固定テスト設定を `single` にそのまま流し込む入口です。');
        expect(popupHtml).not.toContain('popup では確認ゴール、前提条件、固定設定値、期待結果に加え、必要なシナリオでは DevToolsコード と補助コードも見られます。');
    });

    test('ページ状態の確認コードは非破壊である説明を表示する', () => {
        const section = { style: {} };
        const description = { textContent: '' };
        const renderCodeBlock = jest.fn();
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'renderTestScenarioDevtoolsCode'
        ], {
            elements: {
                testScenarioDevtoolsSection: section,
                testScenarioDevtoolsDescription: description,
                testScenarioDevtoolsLabel: {},
                testScenarioDevtoolsCode: {},
                copyDevtoolsCodeButton: {}
            },
            renderCodeBlock
        });

        functions.renderTestScenarioDevtoolsCode({
            devtoolsLabel: 'ページ状態の確認コード',
            devtoolsDescription: 'DevTools Consoleで実行すると、一致件数と対象テキストを表示する。ページ内容は変更しない。',
            devtoolsCode: 'inspect()'
        });

        expect(section.style.display).toBe('block');
        expect(description.textContent).toContain('ページ内容は変更しない');
        expect(renderCodeBlock).toHaveBeenCalledWith({}, {}, {}, 'ページ状態の確認コード', 'inspect()');
    });

    test('再現コードがあるシナリオは変更対象・実行タイミング・復元方法を表示する', () => {
        const section = { style: {} };
        const description = { textContent: '' };
        const renderCodeBlock = jest.fn();
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'renderTestScenarioExtraDevtoolsCode'
        ], {
            elements: {
                testScenarioExtraDevtoolsSection: section,
                testScenarioExtraDevtoolsDescription: description,
                testScenarioExtraDevtoolsLabel: {},
                testScenarioExtraDevtoolsCode: {},
                copyExtraDevtoolsCodeButton: {}
            },
            renderCodeBlock
        });

        functions.renderTestScenarioExtraDevtoolsCode({
            extraDevtoolsLabel: '検知を再現するコード',
            extraDevtoolsDescription: '変更対象: 対象テキストを「在庫あり」へ変更する。実行タイミング: 監視開始後。ページを再読み込みすると元に戻る。',
            extraDevtoolsCode: 'reproduce()'
        });

        expect(section.style.display).toBe('block');
        expect(description.textContent).toContain('変更対象');
        expect(description.textContent).toContain('実行タイミング');
        expect(description.textContent).toContain('再読み込みすると元に戻る');
        expect(renderCodeBlock).toHaveBeenCalledWith({}, {}, {}, '検知を再現するコード', 'reproduce()');
    });

    test('再現コードがないシナリオは再現コード欄とコピー操作を表示しない', () => {
        const section = { style: {} };
        const renderCodeBlock = jest.fn();
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'renderTestScenarioExtraDevtoolsCode'
        ], {
            elements: {
                testScenarioExtraDevtoolsSection: section,
                testScenarioExtraDevtoolsDescription: { textContent: '' },
                testScenarioExtraDevtoolsLabel: {},
                testScenarioExtraDevtoolsCode: {},
                copyExtraDevtoolsCodeButton: {}
            },
            renderCodeBlock
        });

        functions.renderTestScenarioExtraDevtoolsCode({
            extraDevtoolsDescription: 'このシナリオでは再現コードを使わない。'
        });

        expect(section.style.display).toBe('none');
        expect(renderCodeBlock).not.toHaveBeenCalled();
    });

    test('全シナリオは確認コードの非破壊説明を持ち、再現コードは必要なものだけ定義する', () => {
        const popupSource = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.js'),
            'utf8'
        );

        // 「待機中に監視時間が満了する」シナリオを削除したため 13 → 12（design D-005）。
        expect((popupSource.match(/devtoolsDescription: TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION/g) || [])).toHaveLength(12);
        expect((popupSource.match(/extraDevtoolsDescription:/g) || [])).toHaveLength(5);
    });

    test('multiple Gmail シナリオは実行する Gmail・監視・保存設定をすべて表示する', () => {
        const { createMultipleGmailTestScenario } = loadScriptFunctions('../../src/ui/popup.js', [
            'createMultipleGmailTestScenario'
        ], {
            NISSAN_TEST_URL_OUT_OF_STOCK: 'https://example.com/out-of-stock',
            NISSAN_TEST_KEYWORD_IN_STOCK: '在庫あり',
            NISSAN_TEST_SELECTOR_PRODUCT_STATUS: '#stock',
            TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION: '確認用',
            NISSAN_TEST_SELECTOR_INSPECT_CODE: 'document.querySelector("#stock")'
        });

        const scenario = createMultipleGmailTestScenario('gmail_notification_one_url', 1, 'notifications');
        expect(scenario.groupId).toBe('notifications');
        expect(scenario.popupSettings).toEqual(expect.arrayContaining([
            { label: 'Gmail 通知', value: '有効' },
            { label: '送信先', value: '設定済み' },
            { label: '認証状態', value: '認証済み（テストメール送信成功）' },
            { label: '監視対象1', value: 'https://example.com/out-of-stock / 在庫あり / 出現検知' },
            { label: 'セレクタ', value: '#stock' },
            { label: '開始直後判定', value: 'OFF（リロード後に自動再現）' },
            { label: 'リロード後待機', value: '2秒（自動DOM再現）' },
            { label: '共通監視間隔 / 時間', value: '2秒 / 60秒' },
            { label: '保存内容', value: 'ページソースON / フッター除外OFF / スクリーンショットON' },
            { label: '期待 Gmail API 成功', value: '1 件' }
        ]));
    });

    test('テスト開始ボタンはサブ切替に応じて表示内容を切り替える', () => {
        const startButton = { textContent: '', hidden: true, disabled: true };
        const restoreButton = { disabled: false, hidden: false };
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'renderTestScenarioModeUI'
        ], {
            elements: {
                testScenarioModeOptions: [],
                testScenarioModeDescription: { textContent: '' },
                applyTestScenarioButton: { textContent: '' },
                startTestScenarioButton: startButton,
                testBackupNote: { textContent: '' },
                restoreTestScenarioButton: restoreButton
            },
            TEST_SCENARIO_START_BUTTON_LABELS: {
                single: 'single テスト開始',
                multiple: 'multiple テスト開始'
            },
            getTestScenarioModeDefinition: (mode) => ({
                modeDescription: mode,
                applyButtonLabel: mode,
                backupNote: mode
            })
        });

        functions.renderTestScenarioModeUI('multiple');
        expect(startButton.textContent).toBe('multiple テスト開始');
        expect(startButton.hidden).toBe(false);
        expect(startButton.disabled).toBe(false);
        expect(restoreButton.hidden).toBe(true);
        expect(restoreButton.disabled).toBe(true);

        functions.renderTestScenarioModeUI('single');
        expect(startButton.textContent).toBe('single テスト開始');
        expect(restoreButton.hidden).toBe(false);
        expect(restoreButton.disabled).toBe(false);
    });

    test('renderTestBackupState は single backup を 2 行の要約で表示する', () => {
        const summary = { textContent: '' };
        const restoreButton = { disabled: true };
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'renderTestBackupState'
        ], {
            elements: {
                testBackupSummary: summary,
                restoreTestScenarioButton: restoreButton
            },
            selectedTestScenarioMode: 'single',
            getTestScenarioLabelByModeAndId: () => '1. 在庫なしページで継続監視'
        });

        functions.renderTestBackupState({
            config: { url: 'https://example.com' },
            saved_at: '2026-09-03T00:00:00.000Z',
            source_scenario_id: 'appear',
            source_scenario_mode: 'single'
        });

        expect(summary.textContent).toBe(
            '保存時刻: 2026-09-03T00:00:00.000Z\n適用元: 1. 在庫なしページで継続監視'
        );
        expect(restoreButton.disabled).toBe(false);
    });

    test('renderTestBackupState は backup 未保存を短く表示する', () => {
        const summary = { textContent: '' };
        const restoreButton = { disabled: false };
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'renderTestBackupState'
        ], {
            elements: {
                testBackupSummary: summary,
                restoreTestScenarioButton: restoreButton
            },
            selectedTestScenarioMode: 'single',
            getTestScenarioLabelByModeAndId: () => ''
        });

        functions.renderTestBackupState(null);

        expect(summary.textContent).toBe('backup: 未保存');
        expect(restoreButton.disabled).toBe(true);
    });

    test('renderMultipleTestScenarioState は multiple 状態を要点表示する', () => {
        const summary = { textContent: '' };
        const restoreButton = { disabled: false };
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'renderMultipleTestScenarioState'
        ], {
            elements: {
                testBackupSummary: summary,
                restoreTestScenarioButton: restoreButton
            },
            getTestScenarioLabelByModeAndId: () => '1. 在庫なし2件で継続監視を開始する'
        });

        functions.renderMultipleTestScenarioState({
            scenario_id: 'baseline_two_urls',
            configs: [{ id: 'a' }, { id: 'b' }],
            saved_at: '2026-09-03T00:00:00.000Z'
        });

        expect(summary.textContent).toBe(
            '保存済み: 1. 在庫なし2件で継続監視を開始する\n件数: 2 / 本番一覧: 未変更 / 保存時刻: 2026-09-03T00:00:00.000Z'
        );
        expect(restoreButton.disabled).toBe(true);
    });

    test('renderMultipleTestScenarioState は未保存時も短い要約を表示する', () => {
        const summary = { textContent: '' };
        const restoreButton = { disabled: false };
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'renderMultipleTestScenarioState'
        ], {
            elements: {
                testBackupSummary: summary,
                restoreTestScenarioButton: restoreButton
            },
            getTestScenarioLabelByModeAndId: () => ''
        });

        functions.renderMultipleTestScenarioState(null);

        expect(summary.textContent).toBe('保存済み: 未保存\n本番一覧: 未変更');
        expect(restoreButton.disabled).toBe(true);
    });

    test('resolveVisibleLogLevel は UI の 3 段階へ正規化する', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveVisibleLogLevel'
        ]);

        expect(functions.resolveVisibleLogLevel(1)).toBe('1');
        expect(functions.resolveVisibleLogLevel(3)).toBe('3');
        expect(functions.resolveVisibleLogLevel(4)).toBe('4');
        expect(functions.resolveVisibleLogLevel(0)).toBe('3');
        expect(functions.resolveVisibleLogLevel(2)).toBe('3');
    });

    test.each([
        [4, '4'],
        [3, '3'],
        [1, '1']
    ])('getLogLevel の保存値 %i を popup へ復元する', async (currentLevel, expectedValue) => {
        const logLevelSelect = { value: '3' };
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveVisibleLogLevel',
            'loadLogLevel'
        ], {
            chrome: {
                runtime: {
                    lastError: null,
                    sendMessage: (_request, callback) => callback({
                        success: true,
                        currentLevel
                    })
                }
            },
            document: {
                getElementById: (id) => id === 'logLevel' ? logLevelSelect : null
            }
        });

        await functions.loadLogLevel();

        expect(logLevelSelect.value).toBe(expectedValue);
    });

    test('multiple_configs を複数監視の唯一の表示元として採用する', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveMultipleMonitoringCollections'
        ]);

        const result = functions.resolveMultipleMonitoringCollections({
            multiple_configs: [{ id: 'a' }, { id: 'b' }]
        });

        expect(result.selectedSource).toBe('multiple_configs');
        expect(result.selectedTargets).toEqual([{ id: 'a' }, { id: 'b' }]);
    });

    test('multiple_configs が空なら空の一覧を返す', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveMultipleMonitoringCollections'
        ]);

        const result = functions.resolveMultipleMonitoringCollections({
            multiple_configs: []
        });

        expect(result.selectedSource).toBe('multiple_configs');
        expect(result.selectedTargets).toHaveLength(0);
    });

    test('有効な multiple_configs だけを開始対象として解決する', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveMultipleMonitoringCollections',
            'getMultipleMonitoringTargets',
            'resolveEnabledMultipleMonitoringTargets'
        ]);

        const result = functions.resolveEnabledMultipleMonitoringTargets({
            multiple_configs: [
                { id: 'a', enabled: true },
                { id: 'b', enabled: true }
            ]
        });

        expect(result).toEqual([
            { id: 'a', enabled: true },
            { id: 'b', enabled: true }
        ]);
    });

    test('multiple_test_scenario_state があっても通常開始対象は multiple_configs を優先する', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveMultipleMonitoringCollections',
            'getMultipleMonitoringTargets',
            'resolveEnabledMultipleMonitoringTargets'
        ]);

        const result = functions.resolveEnabledMultipleMonitoringTargets({
            multiple_configs: [
                { id: 'prod-a', enabled: true },
                { id: 'prod-b', enabled: true }
            ],
            multiple_test_scenario_state: {
                scenario_id: 'baseline_two_urls',
                configs: [
                    { id: 'test-a', enabled: true },
                    { id: 'test-b', enabled: true }
                ],
                common_settings: { interval: 20 }
            }
        });

        expect(result).toEqual([
            { id: 'prod-a', enabled: true },
            { id: 'prod-b', enabled: true }
        ]);
    });

    test('buildSingleTestScenarioAppliedConfig は backup を退避して single_config を上書きする', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'buildSingleTestScenarioAppliedConfig'
        ], {
            deepClone: (value) => JSON.parse(JSON.stringify(value)),
            mergeSingleScenarioConfig: (overrides = {}) => ({
                url: overrides.url || 'default-url',
                settings: {
                    monitorKeyword: 'default-keyword',
                    ...(overrides.settings || {})
                }
            })
        });

        const result = functions.buildSingleTestScenarioAppliedConfig({
            mode: 'multiple',
            single_config: {
                url: 'https://before.example.com',
                settings: { monitorKeyword: 'before' }
            },
            multiple_configs: [{ id: 'prod-a' }]
        }, {
            id: 'appear',
            config: {
                url: 'https://after.example.com',
                settings: { monitorKeyword: 'after' }
            }
        }, '2026-09-03T00:00:00.000Z');

        expect(result.mode).toBe('single');
        expect(result.single_config).toEqual({
            url: 'https://after.example.com',
            settings: { monitorKeyword: 'after' }
        });
        expect(result.single_config_backup).toEqual({
            config: {
                url: 'https://before.example.com',
                settings: { monitorKeyword: 'before' }
            },
            saved_at: '2026-09-03T00:00:00.000Z',
            source_scenario_id: 'appear',
            source_scenario_mode: 'single'
        });
        expect(result.multiple_configs).toEqual([{ id: 'prod-a' }]);
    });

    test('buildMultipleTestScenarioAppliedConfig は本番一覧を保持したままテスト状態だけ更新する', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'buildMultipleTestScenarioAppliedConfig'
        ], {
            deepClone: (value) => JSON.parse(JSON.stringify(value)),
            mergeSingleScenarioConfig: () => ({ url: '', settings: {} })
        });

        const result = functions.buildMultipleTestScenarioAppliedConfig({
            mode: 'single',
            single_config: { url: 'https://single.example.com' },
            multiple_configs: [{ id: 'prod-a' }, { id: 'prod-b' }],
            multiple_common_settings: { interval: 99 }
        }, {
            id: 'baseline_two_urls',
            config: {
                multiple_configs: [{ id: 'test-a' }, { id: 'test-b' }],
                multiple_common_settings: { interval: 20, duration: 60 }
            }
        }, '2026-09-03T00:00:00.000Z');

        expect(result.mode).toBe('multiple');
        expect(result.multiple_configs).toEqual([{ id: 'prod-a' }, { id: 'prod-b' }]);
        expect(result.multiple_common_settings).toEqual({ interval: 99 });
        expect(result.multiple_test_scenario_state).toEqual({
            scenario_id: 'baseline_two_urls',
            scenario_mode: 'multiple',
            configs: [{ id: 'test-a' }, { id: 'test-b' }],
            common_settings: { interval: 20, duration: 60 },
            saved_at: '2026-09-03T00:00:00.000Z'
        });
    });

    test('二層セッションで動くシナリオは本番設定を保存せずテストタブの開始処理だけを呼ぶ', async () => {
        const saveConfig = jest.fn(async () => ({ success: true }));
        const tryStartTestTabScenario = jest.fn(async () => true);
        const context = {
            configManager: { loadConfig: async () => ({ config: {} }), saveConfig },
            resolveSelectedTestScenarioId: (mode) => (mode === 'single' ? 'appear' : 'auto_appear_two_urls'),
            tryStartTestTabScenario,
            showMessage: jest.fn()
        };
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'startSelectedSingleTestScenario',
            'startSelectedMultipleTestScenario'
        ], context);

        await functions.startSelectedSingleTestScenario();
        await functions.startSelectedMultipleTestScenario();

        expect(tryStartTestTabScenario).toHaveBeenNthCalledWith(1, 'appear');
        expect(tryStartTestTabScenario).toHaveBeenNthCalledWith(2, 'auto_appear_two_urls');
        expect(saveConfig).not.toHaveBeenCalled();
    });

    test('自動再現トグルは4番だけに表示し、表示のたびにOFFへ戻す', () => {
        const section = { style: {} };
        const checkbox = { checked: true };
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'renderTestScenarioAutoReproduce'
        ], {
            elements: {
                testScenarioAutoReproduceSection: section,
                testScenarioAutoReproduce: checkbox
            }
        });

        functions.renderTestScenarioAutoReproduce({ supportsAutoReproduce: true });
        expect(section.style.display).toBe('block');
        expect(checkbox.checked).toBe(false);

        checkbox.checked = true;
        functions.renderTestScenarioAutoReproduce({});
        expect(section.style.display).toBe('none');
        expect(checkbox.checked).toBe(false);
    });

    test('resolveSelectedTestScenarioId は multiple の既知 ID を保持し、不正値は baseline_two_urls に戻す', () => {
        const functions = loadScriptFunctions(
            '../../src/ui/popup.js',
            [
                'getTestScenarioModeDefinition',
                'resolveSelectedTestScenarioId'
            ],
            {
                selectedTestScenarioMode: 'multiple',
                selectedTestScenarioId: 'initial_detected_two_urls',
                MULTIPLE_TEST_SCENARIOS: {
                    baseline_two_urls: { id: 'baseline_two_urls' },
                    initial_detected_two_urls: { id: 'initial_detected_two_urls' },
                    initial_not_detected_two_urls: { id: 'initial_not_detected_two_urls' }
                },
                SINGLE_TEST_SCENARIOS: {
                    appear: { id: 'appear' }
                },
                TEST_SCENARIO_APPLY_BUTTON_LABELS: {
                    single: 'single に適用',
                    multiple: 'multiple に適用'
                },
                TEST_SCENARIO_BACKUP_NOTES: {
                    single: 'single',
                    multiple: 'multiple'
                },
                TEST_SCENARIO_MODE_DESCRIPTIONS: {
                    single: 'single',
                    multiple: 'multiple'
                }
            }
        );

        expect(functions.resolveSelectedTestScenarioId('multiple')).toBe('initial_detected_two_urls');
        expect(functions.resolveSelectedTestScenarioId('single')).toBe('appear');

        const fallbackFunctions = loadScriptFunctions(
            '../../src/ui/popup.js',
            [
                'getTestScenarioModeDefinition',
                'resolveSelectedTestScenarioId'
            ],
            {
                selectedTestScenarioMode: 'multiple',
                selectedTestScenarioId: 'unknown',
                MULTIPLE_TEST_SCENARIOS: {
                    baseline_two_urls: { id: 'baseline_two_urls' },
                    initial_detected_two_urls: { id: 'initial_detected_two_urls' },
                    initial_not_detected_two_urls: { id: 'initial_not_detected_two_urls' }
                },
                SINGLE_TEST_SCENARIOS: {
                    appear: { id: 'appear' }
                },
                TEST_SCENARIO_APPLY_BUTTON_LABELS: {
                    single: 'single に適用',
                    multiple: 'multiple に適用'
                },
                TEST_SCENARIO_BACKUP_NOTES: {
                    single: 'single',
                    multiple: 'multiple'
                },
                TEST_SCENARIO_MODE_DESCRIPTIONS: {
                    single: 'single',
                    multiple: 'multiple'
                }
            }
        );

        expect(fallbackFunctions.resolveSelectedTestScenarioId('multiple')).toBe('baseline_two_urls');
    });

    test('getMonitoringDataDirect は Chrome Storage の monitoring_config を同じ優先順位で返す', async () => {
        const functions = loadScriptFunctions(
            '../../src/ui/popup.js',
            [
                'readMonitoringConfigFromChromeStorage',
                'resolveMultipleMonitoringCollections',
                'getMonitoringDataDirect'
            ],
            {
                DEFAULT_POPUP_MODE: 'single',
                chrome: {
                    storage: {
                        local: {
                            get: (_keys, callback) => callback({
                                monitoring_config: {
                                    mode: 'multiple',
                                    multiple_configs: [{ id: 'a' }, { id: 'b' }],
                                    multiple_test_scenario_state: {
                                        scenario_id: 'baseline_two_urls',
                                        scenario_mode: 'multiple',
                                        configs: [{ id: 'test-a' }, { id: 'test-b' }],
                                        common_settings: { interval: 20 }
                                    }
                                }
                            })
                        }
                    }
                }
            }
        );

        const result = await functions.getMonitoringDataDirect();

        expect(result.success).toBe(true);
        expect(result.selected_source).toBe('multiple_configs');
        expect(result.multiple_configs).toHaveLength(2);
        expect(result).not.toHaveProperty('multiple_targets');
        expect(result.multiple_test_scenario_state).toEqual({
            scenario_id: 'baseline_two_urls',
            scenario_mode: 'multiple',
            configs: [{ id: 'test-a' }, { id: 'test-b' }],
            common_settings: { interval: 20 }
        });
        expect(result.targets_count).toBe(2);
    });

    test('fallback loadConfig は background 通信失敗時でも Chrome Storage を localStorage より優先する', async () => {
        const localStorageState = new Map([
            ['fallback_mode', 'multiple'],
            ['fallback_monitoring_targets', JSON.stringify([{ id: 'legacy-local' }])]
        ]);

        const localStorage = {
            getItem: (key) => localStorageState.get(key) ?? null,
            setItem: (key, value) => localStorageState.set(key, value)
        };

        const functions = loadScriptFunctions(
            '../../src/ui/popup.js',
            [
                'readMonitoringConfigFromChromeStorage',
                'resolveMultipleMonitoringCollections',
                'getFallbackConfigManager'
            ],
            {
                chrome: {
                    storage: {
                        local: {
                            get: (_keys, callback) => callback({
                                monitoring_config: {
                                    mode: 'multiple',
                                    multiple_configs: [{ id: 'a' }, { id: 'b' }]
                                }
                            })
                        }
                    }
                },
                localStorage,
                showMessage: () => {}
            }
        );

        const manager = functions.getFallbackConfigManager();
        const result = await manager.loadConfig();

        expect(result.success).toBe(true);
        expect(result.config.multiple_configs).toEqual([{ id: 'a' }, { id: 'b' }]);
        expect(result.config).not.toHaveProperty('multiple_targets');
    });

    test('buildPopupConfigFromStatus は multiple_test_scenario_state を引き継ぐ', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveMultipleMonitoringCollections',
            'buildPopupConfigFromStatus'
        ]);

        const state = {
            scenario_id: 'baseline_two_urls',
            scenario_mode: 'multiple',
            configs: [{ id: 'test-a' }, { id: 'test-b' }],
            common_settings: { interval: 20, duration: 60 },
            saved_at: '2026-09-01T00:00:00.000Z',
        };

        const config = functions.buildPopupConfigFromStatus({
            mode: 'multiple',
            multiple_configs: [{ id: 'a' }, { id: 'b' }],
            multiple_test_scenario_state: state
        });

        expect(config.multiple_test_scenario_state).toEqual(state);
    });

    test('multiple テスト状態が保存されても通常 multiple_configs の表示元は変わらない', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveMultipleMonitoringCollections',
            'buildPopupConfigFromStatus'
        ]);

        const config = functions.buildPopupConfigFromStatus({
            mode: 'multiple',
            multiple_configs: [{ id: 'prod-a' }, { id: 'prod-b' }, { id: 'prod-c' }],
            multiple_test_scenario_state: {
                scenario_id: 'baseline_two_urls',
                configs: [{ id: 'test-a' }, { id: 'test-b' }],
                common_settings: { interval: 20 },
                saved_at: '2026-09-01T00:00:00.000Z'
            }
        });

        const resolved = functions.resolveMultipleMonitoringCollections(config);

        expect(resolved.selectedSource).toBe('multiple_configs');
        expect(resolved.selectedTargets).toEqual([{ id: 'prod-a' }, { id: 'prod-b' }, { id: 'prod-c' }]);
        expect(config.multiple_test_scenario_state.configs).toEqual([{ id: 'test-a' }, { id: 'test-b' }]);
    });

    test('buildPopupConfigFromStatus は getStatus / loadConfig / 直読のどの入力でも同じ 2 件構成を作る', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveMultipleMonitoringCollections',
            'buildPopupConfigFromStatus'
        ]);

        const sources = [
            {
                mode: 'multiple',
                multiple_configs: [{ id: 'a' }, { id: 'b' }]
            },
            {
                mode: 'multiple',
                multiple_configs: [{ id: 'a' }, { id: 'b' }]
            }
        ];

        for (const source of sources) {
            const config = functions.buildPopupConfigFromStatus(source);
            const resolved = functions.resolveMultipleMonitoringCollections(config);

            expect(resolved.selectedSource).toBe('multiple_configs');
            expect(resolved.selectedTargets).toHaveLength(2);
        }
    });

    test('popup 初回表示時は自動統一化を走らせず read-only 読込にする', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'shouldAutoUnifyDataStructureOnPopupLoad'
        ]);

        expect(functions.shouldAutoUnifyDataStructureOnPopupLoad({
            mode: 'multiple',
            multiple_configs: [{ id: 'a' }, { id: 'b' }]
        })).toBe(false);

        expect(functions.shouldAutoUnifyDataStructureOnPopupLoad({
            mode: 'multiple',
            multiple_configs: []
        })).toBe(false);
    });

    test('保存済み 2 件と実行中 1 件が共存しても表示元の一覧は 2 件を維持する', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveMultipleMonitoringCollections',
            'buildPopupConfigFromStatus'
        ]);

        const savedStatus = {
            mode: 'multiple',
            multiple_configs: [{ id: 'a', enabled: true }, { id: 'b', enabled: true }],
            multipleModeStatus: {
                activeMonitors: [{ id: 'a', status: 'running' }]
            }
        };

        const config = functions.buildPopupConfigFromStatus(savedStatus);
        const resolved = functions.resolveMultipleMonitoringCollections(config);

        expect(resolved.selectedSource).toBe('multiple_configs');
        expect(resolved.selectedTargets).toHaveLength(2);
        expect(savedStatus.multipleModeStatus.activeMonitors).toHaveLength(1);
    });

    test('mode が single でも保存済み multiple_configs 2 件を表示元として維持する', () => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveMultipleMonitoringCollections',
            'buildPopupConfigFromStatus'
        ]);

        const savedStatus = {
            mode: 'single',
            single_config: { url: 'https://single.example.com' },
            multiple_configs: [{ id: 'a', enabled: true }, { id: 'b', enabled: false }]
        };

        const config = functions.buildPopupConfigFromStatus(savedStatus);
        const resolved = functions.resolveMultipleMonitoringCollections(config);

        expect(config.mode).toBe('single');
        expect(resolved.selectedSource).toBe('multiple_configs');
        expect(resolved.selectedTargets).toEqual(savedStatus.multiple_configs);
        expect(resolved.selectedTargets).toHaveLength(2);
    });

    test('startAllButton のバインドを 2 回呼んでもクリックで開始処理は 1 回だけ実行される', () => {
        const handleStartButtonClick = jest.fn();
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'bindStartAllButton'
        ], {
            handleStartButtonClick
        });

        const registeredHandlers = [];
        const button = {
            dataset: {},
            addEventListener: jest.fn((eventName, handler) => {
                registeredHandlers.push({ eventName, handler });
            })
        };

        expect(functions.bindStartAllButton(button)).toBe(true);
        expect(functions.bindStartAllButton(button)).toBe(false);
        expect(button.addEventListener).toHaveBeenCalledTimes(1);

        const clickHandler = registeredHandlers[0].handler;
        const event = {
            preventDefault: jest.fn(),
            stopPropagation: jest.fn()
        };
        clickHandler(event);

        expect(handleStartButtonClick).toHaveBeenCalledTimes(1);
        expect(event.preventDefault).toHaveBeenCalledTimes(1);
        expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    });
});

describe('popup.js の SWログコピー', () => {
    test('取得したSWログをコピーし、成功メッセージを表示する', async () => {
        const writeText = jest.fn().mockResolvedValue(undefined);
        const showMessage = jest.fn();
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'copyTextToClipboard',
            'copySwLogs'
        ], {
            chrome: {
                runtime: {
                    sendMessage: jest.fn().mockResolvedValue({
                        success: true,
                        logs: ['first log', 'second log']
                    })
                }
            },
            navigator: {
                clipboard: { writeText }
            },
            showMessage
        });

        await functions.copySwLogs();

        expect(writeText).toHaveBeenCalledWith('first log\nsecond log');
        expect(showMessage).toHaveBeenCalledWith('2件のSWログをコピーしました', 'success');
    });

    test('SWログの取得に失敗した場合はエラーメッセージを表示する', async () => {
        const writeText = jest.fn();
        const showMessage = jest.fn();
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'copyTextToClipboard',
            'copySwLogs'
        ], {
            chrome: {
                runtime: {
                    sendMessage: jest.fn().mockResolvedValue({ success: false })
                }
            },
            navigator: {
                clipboard: { writeText }
            },
            showMessage
        });

        await functions.copySwLogs();

        expect(writeText).not.toHaveBeenCalled();
        expect(showMessage).toHaveBeenCalledWith('ログ取得に失敗しました', 'error');
    });

    test('クリップボードへの書き込みに失敗した場合は元エラーを記録してエラー表示する', async () => {
        const copyError = new Error('clipboard denied');
        const error = jest.fn();
        const showMessage = jest.fn();
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'copyTextToClipboard',
            'copySwLogs'
        ], {
            chrome: {
                runtime: {
                    sendMessage: jest.fn().mockResolvedValue({
                        success: true,
                        logs: ['log']
                    })
                }
            },
            navigator: {
                clipboard: {
                    writeText: jest.fn().mockRejectedValue(copyError)
                }
            },
            console: { error },
            showMessage
        });

        await expect(functions.copySwLogs()).resolves.toBeUndefined();

        expect(error).toHaveBeenCalledWith('SWログコピーエラー:', copyError);
        expect(showMessage).toHaveBeenCalledWith('コピーに失敗しました', 'error');
    });

    test('Clipboard API 非対応時は既存のコピーコマンドへフォールバックする', async () => {
        const textArea = {
            style: {},
            setAttribute: jest.fn(),
            select: jest.fn()
        };
        const document = {
            createElement: jest.fn().mockReturnValue(textArea),
            body: {
                appendChild: jest.fn(),
                removeChild: jest.fn()
            },
            execCommand: jest.fn().mockReturnValue(true)
        };
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'copyTextToClipboard'
        ], {
            navigator: {},
            document
        });

        await functions.copyTextToClipboard('fallback log');

        expect(document.execCommand).toHaveBeenCalledWith('copy');
        expect(document.body.appendChild).toHaveBeenCalledWith(textArea);
        expect(document.body.removeChild).toHaveBeenCalledWith(textArea);
    });
});

describe('popup監視レイアウト', () => {
    test('A: single の9シナリオは3グループへ既存順で所属する', () => {
        const popupJs = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.js'),
            'utf8'
        );

        expect(popupJs).toContain("{ id: 'monitoring', label: '通常監視フロー' }");
        expect(popupJs).toContain("{ id: 'diagnostics', label: '設定・セレクタ診断' }");
        expect(popupJs).toContain("{ id: 'notifications', label: '通知連携' }");

        const expectedGroups = [
            ['appear', 'monitoring'],
            ['disappear', 'monitoring'],
            ['initial_detected', 'monitoring'],
            ['initial_not_detected', 'monitoring'],
            ['keyword_missing_check', 'diagnostics'],
            ['element_not_found_check', 'diagnostics'],
            ['pending_error_check', 'diagnostics'],
            ['gmail_notification_check', 'notifications'],
            ['chrome_notification_check', 'notifications']
        ];

        let previousIndex = -1;
        expectedGroups.forEach(([scenarioId, groupId]) => {
            const match = new RegExp(
                `${scenarioId}:\\s*\\{\\s*id: '${scenarioId}',\\s*groupId: '${groupId}'`
            ).exec(popupJs);

            expect(match).not.toBeNull();
            expect(match.index).toBeGreaterThan(previousIndex);
            previousIndex = match.index;
        });
    });

    test('A: single と A: multiple の動的描画は、それぞれの分類と既存順を保つ', () => {
        const testScenarioSelect = { innerHTML: '' };
        const singleScenarios = {
            appear: { id: 'appear', label: '1', groupId: 'monitoring' },
            disappear: { id: 'disappear', label: '2', groupId: 'monitoring' },
            initial_detected: { id: 'initial_detected', label: '3', groupId: 'monitoring' },
            initial_not_detected: { id: 'initial_not_detected', label: '4', groupId: 'monitoring' },
            keyword_missing_check: { id: 'keyword_missing_check', label: '5', groupId: 'diagnostics' },
            element_not_found_check: { id: 'element_not_found_check', label: '6', groupId: 'diagnostics' },
            pending_error_check: { id: 'pending_error_check', label: '7', groupId: 'diagnostics' },
            gmail_notification_check: { id: 'gmail_notification_check', label: '8', groupId: 'notifications' },
            chrome_notification_check: { id: 'chrome_notification_check', label: '9', groupId: 'notifications' }
        };
        const { renderTestScenarioSelectOptions } = loadScriptFunctions('../../src/ui/popup.js', [
            'getTestScenarioModeDefinition',
            'renderTestScenarioSelectOptions'
        ], {
            elements: { testScenarioSelect },
            SINGLE_TEST_SCENARIO_GROUPS: [
                { id: 'monitoring', label: '通常監視フロー' },
                { id: 'diagnostics', label: '設定・セレクタ診断' },
                { id: 'notifications', label: '通知連携' }
            ],
            MULTIPLE_TEST_SCENARIO_GROUPS: [
                { id: 'monitoring', label: '通常監視フロー' },
                { id: 'notifications', label: '通知連携' }
            ],
            SINGLE_TEST_SCENARIOS: singleScenarios,
            MULTIPLE_TEST_SCENARIOS: {
                baseline_two_urls: { id: 'baseline_two_urls', label: '1', groupId: 'monitoring' },
                initial_detected_two_urls: { id: 'initial_detected_two_urls', label: '2', groupId: 'monitoring' },
                initial_not_detected_two_urls: { id: 'initial_not_detected_two_urls', label: '3', groupId: 'monitoring' },
                manual_appear_two_urls: { id: 'manual_appear_two_urls', label: '4', groupId: 'monitoring' },
                duration_elapsed_during_reload_wait: { id: 'duration_elapsed_during_reload_wait', label: '5', groupId: 'monitoring' },
                gmail_notification_one_url: { id: 'gmail_notification_one_url', label: '6', groupId: 'notifications' },
                gmail_notification_two_urls: { id: 'gmail_notification_two_urls', label: '7', groupId: 'notifications' }
            },
            TEST_SCENARIO_APPLY_BUTTON_LABELS: { single: '', multiple: '' },
            TEST_SCENARIO_BACKUP_NOTES: { single: '', multiple: '' },
            TEST_SCENARIO_MODE_DESCRIPTIONS: { single: '', multiple: '' },
            escapeHtml: (value) => String(value)
        });

        renderTestScenarioSelectOptions('single');

        expect(testScenarioSelect.innerHTML).toBe(
            '<optgroup label="通常監視フロー"><option value="appear">1</option><option value="disappear">2</option><option value="initial_detected">3</option><option value="initial_not_detected">4</option></optgroup>' +
            '<optgroup label="設定・セレクタ診断"><option value="keyword_missing_check">5</option><option value="element_not_found_check">6</option><option value="pending_error_check">7</option></optgroup>' +
            '<optgroup label="通知連携"><option value="gmail_notification_check">8</option><option value="chrome_notification_check">9</option></optgroup>'
        );

        renderTestScenarioSelectOptions('multiple');

        expect(testScenarioSelect.innerHTML).toBe(
            '<optgroup label="通常監視フロー"><option value="baseline_two_urls">1</option><option value="initial_detected_two_urls">2</option><option value="initial_not_detected_two_urls">3</option><option value="manual_appear_two_urls">4</option><option value="duration_elapsed_during_reload_wait">5</option></optgroup>' +
            '<optgroup label="通知連携"><option value="gmail_notification_one_url">6</option><option value="gmail_notification_two_urls">7</option></optgroup>'
        );
    });

    test('A: multiple の6シナリオは2グループへ既存順で所属し、診断グループを持たない', () => {
        const popupJs = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.js'),
            'utf8'
        );

        expect(popupJs).toContain("{ id: 'monitoring', label: '通常監視フロー' }");
        expect(popupJs).toContain("{ id: 'notifications', label: '通知連携' }");
        const multipleGroupsStart = popupJs.indexOf('const MULTIPLE_TEST_SCENARIO_GROUPS = [');
        const multipleGroupsSource = popupJs.slice(
            multipleGroupsStart,
            popupJs.indexOf('];', multipleGroupsStart)
        );
        expect(multipleGroupsSource).not.toContain('diagnostics');

        const expectedGroups = [
            ['baseline_two_urls', 'monitoring'],
            ['initial_detected_two_urls', 'monitoring'],
            ['initial_not_detected_two_urls', 'monitoring'],
            ['auto_appear_two_urls', 'monitoring']
        ];
        let previousIndex = -1;
        expectedGroups.forEach(([scenarioId, groupId]) => {
            const match = new RegExp(
                `${scenarioId}:\\s*\\{\\s*id: '${scenarioId}',\\s*groupId: '${groupId}'`
            ).exec(popupJs);
            expect(match).not.toBeNull();
            expect(match.index).toBeGreaterThan(previousIndex);
            previousIndex = match.index;
        });

        expect(popupJs).toContain("createMultipleGmailTestScenario('gmail_notification_one_url', 1, 'notifications')");
        expect(popupJs).toContain("createMultipleGmailTestScenario('gmail_notification_two_urls', 2, 'notifications')");
    });

    test('初期HTMLのA: single 選択肢も動的描画と同じ3グループ・既存ID順を持つ', () => {
        const popupHtml = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.html'),
            'utf8'
        );
        const selectStart = popupHtml.indexOf('<select id="testScenarioSelect">');
        const selectEnd = popupHtml.indexOf('</select>', selectStart);
        const selectHtml = popupHtml.slice(selectStart, selectEnd);
        const groupLabels = [...selectHtml.matchAll(/<optgroup label="([^"]+)">/g)]
            .map((match) => match[1]);
        const scenarioIds = [...selectHtml.matchAll(/<option value="([^"]+)">/g)]
            .map((match) => match[1]);

        expect(groupLabels).toEqual([
            '通常監視フロー',
            '設定・セレクタ診断',
            '通知連携'
        ]);
        expect(scenarioIds).toEqual([
            'appear',
            'disappear',
            'initial_detected',
            'initial_not_detected',
            'keyword_missing_check',
            'element_not_found_check',
            'pending_error_check',
            'gmail_notification_check',
            'chrome_notification_check'
        ]);
    });

    test('単一URLの即時操作は監視設定の後にあり、複数URLの全体制御は対象一覧より前にある', () => {
        const popupHtml = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.html'),
            'utf8'
        );

        const singleModeStart = popupHtml.indexOf('<div id="singleModeUI"');
        const singleModeEnd = popupHtml.indexOf('<div id="testModeUI"');
        const singleModeHtml = popupHtml.slice(singleModeStart, singleModeEnd);
        const startButtonIndex = singleModeHtml.indexOf('id="startButton"');
        const monitorTargetIndex = singleModeHtml.indexOf('<h3>今回監視するページ</h3>');

        expect(startButtonIndex).toBeGreaterThan(-1);
        expect(startButtonIndex).toBeGreaterThan(monitorTargetIndex);
        expect((singleModeHtml.match(/id="(?:startButton|stopButton|quickSourceButton)"/g) || [])).toHaveLength(3);
        expect(singleModeHtml).toContain('即座取得は監視を開始せず、選択した今回監視するページのスクリーンショットとDOMのouterHTMLを一回保存します。');
        expect(singleModeHtml).toContain('<h3>今回監視するページ</h3>');
        expect(singleModeHtml).toContain('<label for="ecSiteSelectKeyword">ECサイトの補完・診断設定</label>');

        const multipleModeStart = popupHtml.indexOf('<div id="multipleModeUI">');
        const multipleModeEnd = popupHtml.indexOf('<div class="section" id="gmailNotificationSection">');
        const multipleModeHtml = popupHtml.slice(multipleModeStart, multipleModeEnd);
        const summaryIndex = multipleModeHtml.indexOf('<h3>運用サマリー</h3>');
        const globalControlsIndex = multipleModeHtml.indexOf('id="multipleGlobalControlsSection"');
        const monitorListIndex = multipleModeHtml.indexOf('<h3>監視するURL</h3>');

        expect(summaryIndex).toBeGreaterThan(-1);
        expect(globalControlsIndex).toBeGreaterThan(summaryIndex);
        expect(globalControlsIndex).toBeLessThan(monitorListIndex);
        expect(multipleModeHtml).toContain('追加時のECサイト（自動入力用）');
        expect(multipleModeHtml).toContain('既存URL・実行中監視・全体開始停止には影響しません。');
        expect((multipleModeHtml.match(/id="(?:startAllButton|stopAllButton|refreshStatusButton)"/g) || [])).toHaveLength(3);
    });

    test('複数URLの運用サマリーは横一列で件数を表示し、予約状態は設定欄に表示する', () => {
        const popupHtml = fs.readFileSync(
            path.resolve(__dirname, '../../src/ui/popup.html'),
            'utf8'
        );

        expect(popupHtml).toContain('.monitor-summary {\n            display: flex;');
        expect(popupHtml).toContain('.summary-card + .summary-card {\n            border-left: 1px solid #d6e2ea;');
        expect(popupHtml).toContain('summary-card summary-card--running');
        expect(popupHtml).toContain('summary-card summary-card--stopped');
        expect(popupHtml).toContain('summary-card summary-card--disabled');
        expect(popupHtml).not.toContain('<div class="summary-card summary-card--scheduled">');
        expect(popupHtml).toContain('id="runningMonitorCount"');
        expect(popupHtml).toContain('id="stoppedMonitorCount"');
        expect(popupHtml).toContain('id="disabledMonitorCount"');
        expect(popupHtml).toContain('id="multipleScheduledMonitoringStatus" class="single-scheduled-watch-summary" role="status"');
        expect(popupHtml.indexOf('id="multipleScheduledMonitoringStatus"')).toBeGreaterThan(
            popupHtml.indexOf('id="multipleTimeSettingsBody"')
        );
    });

    test('複数URLの対象は状態順で表示し、同じ状態では登録順を維持する', () => {
        const { getMultipleMonitorRuntimeState, getMultipleMonitorDisplayPriority, sortMultipleMonitoringConfigsForDisplay } = loadScriptFunctions('../../src/ui/popup.js', [
            'getMultipleMonitorRuntimeState',
            'getMultipleMonitorDisplayPriority',
            'sortMultipleMonitoringConfigsForDisplay'
        ], {
            latestMultipleModeStatus: {
                activeMonitors: [{ id: 'running-later', status: 'running' }]
            }
        });

        expect(getMultipleMonitorRuntimeState({ id: 'running-later', enabled: true }).status).toBe('running');
        expect(getMultipleMonitorDisplayPriority({ id: 'disabled', enabled: false })).toBe(2);
        expect(sortMultipleMonitoringConfigsForDisplay([
            { id: 'ready-first', enabled: true },
            { id: 'disabled', enabled: false },
            { id: 'running-later', enabled: true },
            { id: 'ready-second', enabled: true }
        ]).map((config) => config.id)).toEqual([
            'running-later',
            'ready-first',
            'ready-second',
            'disabled'
        ]);
    });
});
