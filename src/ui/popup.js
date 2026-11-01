// 🔴 緊急診断: popup.js読み込み確認
function installTimestampedConsole(targetConsole) {
    if (!targetConsole || targetConsole.__pageRecorderTimestampWrapped) {
        return;
    }

    const methods = ['log', 'info', 'warn', 'error', 'debug'];

    const formatTimePrefix = () => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const mmm = String(now.getMilliseconds()).padStart(3, '0');
        return `${hh}:${mm}:${ss}.${mmm}:`;
    };

    const prefixMessage = (message, prefix) => {
        if (typeof message !== 'string') {
            return [prefix, message];
        }

        const prefixedMessage = `${prefix} ${message}`.replace(/\n/g, `\n${prefix} `);
        return [prefixedMessage];
    };

    methods.forEach((method) => {
        const original = targetConsole[method];
        if (typeof original !== 'function') {
            return;
        }

        targetConsole[method] = function timestampedConsoleMethod(...args) {
            const prefix = formatTimePrefix();
            if (args.length === 0) {
                original.call(targetConsole, prefix);
                return;
            }

            const [firstArg, ...restArgs] = args;
            const prefixedArgs = prefixMessage(firstArg, prefix);
            original.call(targetConsole, ...prefixedArgs, ...restArgs);
        };
    });

    Object.defineProperty(targetConsole, '__pageRecorderTimestampWrapped', {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
    });
}

installTimestampedConsole(console);

console.log('🔴 [CRITICAL-1] popup.js ファイル読み込み確認');
window.popupJsLoaded = true;
console.log('🔴 [CRITICAL-2] グローバル変数設定完了');

// 🚨 重複実行防止フラグ（全て開始ボタン）
let isStartAllMonitoringInProgress = false;
let initialDetectedAutoTestPollingTimer = null;
let twoTierAcceptanceTestPollingTimer = null;
let multipleBatchControls = null;
const SINGLE_URL_ACTIVE_SUBTAB_STORAGE_KEY = 'singleUrlActiveSubtab';
const SINGLE_KEYWORD_RECENT_URLS_STORAGE_KEY = 'singleKeywordRecentUrls';
const SINGLE_SCHEDULED_WATCH_RECENT_URLS_STORAGE_KEY = 'singleScheduledWatchRecentUrls';
const RECENT_MONITOR_URL_LIMIT = 10;
const GMAIL_NOTIFICATION_SETTINGS_KEY = 'gmailNotificationSettings';
const GMAIL_NOTIFICATION_LAST_RESULT_KEY = 'gmailNotificationLastResult';
let sharedTargetpagesCache = null;
let selectedTargetpageProfile = null;
let isApplyingSharedTargetpage = false;

function normalizePopupGmailNotificationSettings(settings = {}) {
    return {
        enabled: settings?.enabled === true,
        recipientEmail: typeof settings?.recipientEmail === 'string' ? settings.recipientEmail.trim() : ''
    };
}

function getGmailNotificationResultText(result) {
    if (!result?.status) return '直近の送信結果: なし';
    const labels = {
        success: '送信成功',
        auth_required: '認証が必要です',
        validation_error: '入力を確認してください',
        api_error: '送信に失敗しました'
    };
    return `直近の送信結果: ${labels[result.status] || '不明'}${result.message ? `（${result.message}）` : ''}`;
}

function renderGmailNotificationResult(result) {
    if (!elements?.gmailNotificationResult) return;
    elements.gmailNotificationResult.textContent = getGmailNotificationResultText(result);
    elements.gmailNotificationResult.style.color = result?.status === 'success'
        ? '#1f8d4d'
        : result?.status && result.status !== 'success'
            ? '#c0392b'
            : '';
}

async function loadGmailNotificationSettingsForPopup() {
    const stored = await chrome.storage.local.get([
        GMAIL_NOTIFICATION_SETTINGS_KEY,
        GMAIL_NOTIFICATION_LAST_RESULT_KEY
    ]);
    const settings = normalizePopupGmailNotificationSettings(stored[GMAIL_NOTIFICATION_SETTINGS_KEY]);
    if (elements?.gmailNotificationEnabled) elements.gmailNotificationEnabled.checked = settings.enabled;
    if (elements?.gmailNotificationRecipient) elements.gmailNotificationRecipient.value = settings.recipientEmail;
    renderGmailNotificationResult(stored[GMAIL_NOTIFICATION_LAST_RESULT_KEY]);
    return settings;
}

async function saveGmailNotificationSettingsFromPopup() {
    const settings = normalizePopupGmailNotificationSettings({
        enabled: elements?.gmailNotificationEnabled?.checked,
        recipientEmail: elements?.gmailNotificationRecipient?.value
    });
    await chrome.storage.local.set({ [GMAIL_NOTIFICATION_SETTINGS_KEY]: settings });
    return settings;
}

async function sendGmailTestEmailFromPopup() {
    const button = elements?.sendGmailTestEmailButton;
    if (button) button.disabled = true;
    if (elements?.gmailNotificationResult) {
        elements.gmailNotificationResult.textContent = 'テストメールを送信中...';
        elements.gmailNotificationResult.style.color = '';
    }
    try {
        await saveGmailNotificationSettingsFromPopup();
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'sendGmailTestEmail' }, (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                resolve(result || { success: false, status: 'api_error', message: '応答がありません' });
            });
        });
        renderGmailNotificationResult(response);
        return response;
    } catch (error) {
        const result = { success: false, status: 'api_error', message: error.message || '送信に失敗しました' };
        renderGmailNotificationResult(result);
        return result;
    } finally {
        if (button) button.disabled = false;
    }
}
console.log('🔴 [CRITICAL-3] DOM readyState:', document.readyState);
console.log('🔴 [CRITICAL-4] Chrome Runtime:', !!chrome?.runtime);
console.log('🔴 [CRITICAL-5] Chrome Storage:', !!chrome?.storage);
console.log('🔴 [CRITICAL-6] Chrome Tabs:', !!chrome?.tabs);
console.log('🔴 [CRITICAL-7] 現在時刻:', new Date().toISOString());

// Chrome Storage優先取得関数（Chrome Runtime Messaging制限回避）
async function getMonitoringDataDirect() {
    console.log('📦 Chrome Storage直接取得開始');
    try {
        const config = await readMonitoringConfigFromChromeStorage();
        if (config) {
        const resolvedData = resolveMultipleMonitoringCollections(config);
        const data = {
            success: true,
            mode: config.mode || DEFAULT_POPUP_MODE,
            multiple_configs: resolvedData.selectedTargets,
            multiple_common_settings: config.multiple_common_settings || {},
            single_config: config.single_config || {},
            single_config_backup: config.single_config_backup || null,
            multiple_configs_backup: config.multiple_configs_backup || null,
            multiple_test_scenario_state: config.multiple_test_scenario_state || null,
            targets_count: resolvedData.selectedTargets.length,
                last_updated: config.last_updated,
                version: config.version,
                direct_storage: true,
                selected_source: resolvedData.selectedSource
            };

            console.log('✅ Chrome Storage直接取得成功（キー: monitoring_config）:', {
                mode: data.mode,
                configsCount: data.multiple_configs.length,
                selectedSource: resolvedData.selectedSource,
                selectedCount: resolvedData.selectedTargets.length,
                totalSize: JSON.stringify(data).length + ' bytes'
            });
            
            return data;
        }
        
        console.warn('⚠️ Chrome Storageにmonitoring_configが存在しません');
        return null;
    } catch (error) {
        console.error('❌ Chrome Storage直接取得エラー:', error);
        return null;
    }
}

function normalizeGetStatusResponse(response) {
    if (!response || typeof response !== 'object') {
        return null;
    }

    const status = response.status && typeof response.status === 'object'
        ? response.status
        : response;

    const normalized = {
        ...status,
        success: response.success ?? status.success ?? true,
        mode: status.mode ?? response.mode ?? 'single',
        multiple_configs: Array.isArray(status.multiple_configs)
            ? status.multiple_configs
            : Array.isArray(response.multiple_configs)
                ? response.multiple_configs
                : [],
        multiple_common_settings:
            status.multiple_common_settings && typeof status.multiple_common_settings === 'object'
                ? status.multiple_common_settings
                : response.multiple_common_settings && typeof response.multiple_common_settings === 'object'
                    ? response.multiple_common_settings
                    : {},
        single_config: status.single_config && typeof status.single_config === 'object'
            ? status.single_config
            : response.single_config && typeof response.single_config === 'object'
                ? response.single_config
                : {},
        single_config_backup: status.single_config_backup ?? response.single_config_backup ?? null,
        multiple_configs_backup: status.multiple_configs_backup ?? response.multiple_configs_backup ?? null,
        multiple_test_scenario_state:
            status.multiple_test_scenario_state ?? response.multiple_test_scenario_state ?? null,
        targets_count: status.targets_count ?? response.targets_count ?? 0,
        last_updated: status.last_updated ?? response.last_updated,
        version: status.version ?? response.version,
        direct_storage: status.direct_storage ?? response.direct_storage ?? false,
        fallback_default: status.fallback_default ?? response.fallback_default ?? false,
        multiple_configs_summary: status.multiple_configs_summary ?? response.multiple_configs_summary,
        multiple_configs_count: status.multiple_configs_count ?? response.multiple_configs_count,
        size_optimized: status.size_optimized ?? response.size_optimized ?? false,
        ultra_optimized: status.ultra_optimized ?? response.ultra_optimized ?? false
    };

    return normalized;
}

async function readMonitoringConfigFromChromeStorage() {
    try {
        const storageData = await new Promise((resolve) => {
            chrome.storage.local.get(['monitoring_config'], resolve);
        });

        return storageData.monitoring_config || null;
    } catch (error) {
        console.warn('⚠️ monitoring_config 直接取得エラー:', error);
        return null;
    }
}

function resolveMultipleMonitoringCollections(config) {
    const multipleConfigs = Array.isArray(config?.multiple_configs)
        ? config.multiple_configs
        : [];

    return {
        multipleConfigs,
        selectedTargets: multipleConfigs,
        selectedSource: 'multiple_configs'
    };
}

function hasCompleteMultipleConfigList(response) {
    return Array.isArray(response?.multiple_configs) &&
        !response?.multiple_configs_summary &&
        !response?.ultra_optimized;
}

function resolveMultipleMonitoringConfigForPopup(statusResponse, persistedConfig) {
    const source = hasCompleteMultipleConfigList(statusResponse) ? 'status' : 'persisted';
    const sourceConfig = source === 'status' ? statusResponse : persistedConfig;
    return {
        source,
        ...resolveMultipleMonitoringCollections(sourceConfig)
    };
}

function buildPopupConfigFromStatus(statusResponse) {
    const resolvedData = resolveMultipleMonitoringCollections(statusResponse);

    return {
        mode: statusResponse?.mode,
        multiple_configs: resolvedData.multipleConfigs,
        multiple_common_settings: statusResponse?.multiple_common_settings || {},
        single_config: statusResponse?.single_config || {},
        single_config_backup: statusResponse?.single_config_backup || null,
        multiple_configs_backup: statusResponse?.multiple_configs_backup || null,
        multiple_test_scenario_state: statusResponse?.multiple_test_scenario_state || null,
        version: statusResponse?.version
    };
}

function shouldAutoUnifyDataStructureOnPopupLoad(_config) {
    return false;
}

function logMultipleMonitoringResolution(context, config) {
    const resolvedData = resolveMultipleMonitoringCollections(config);
    console.log(`📊 ${context}:`, {
        selectedSource: resolvedData.selectedSource,
        multipleConfigsCount: resolvedData.multipleConfigs.length,
        selectedCount: resolvedData.selectedTargets.length
    });
    return resolvedData;
}

// getStatusのフォールバック関数（3段階フォールバック）
async function getStatusWithFallback() {
    console.log('🔄 getStatus 3段階フォールバック開始');
    
    // 段階1: 通常のgetStatus試行
    try {
        console.log('📤 段階1: 通常getStatus試行');
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getStatus' }, resolve);
        });
        
        const normalized = normalizeGetStatusResponse(response);
        if (normalized && normalized.success) {
            console.log('✅ 段階1: 通常getStatus成功');
            return normalized;
        }
    } catch (error) {
        console.warn('⚠️ 段階1: 通常getStatusエラー:', error);
    }
    
    // 段階2: Chrome Storage直接取得
    console.log('📦 段階2: Chrome Storage直接取得試行');
    const directData = await getMonitoringDataDirect();
    if (directData && directData.success) {
        console.log('✅ 段階2: Chrome Storage直接取得成功');
        return directData;
    }
    
    // 段階3: 呼び出し元が保存済み設定へ戻れるよう、取得失敗として返す
    console.log('ℹ️ 段階3: 有効な監視設定を取得できませんでした。保存済み設定を使用します');
    return {
        success: false,
        error: '監視設定を取得できませんでした',
        mode: DEFAULT_POPUP_MODE,
        multiple_configs: [],
        multiple_common_settings: {},
        single_config: {},
        targets_count: 0,
        fallback_default: true
    };
}

// DOM要素を取得する関数
function getElements() {
    console.log('DOM要素取得開始');

    try {
        const elements = {
            // モード選択（必須要素）
            modeOptions: document.querySelectorAll('.mode-option[data-mode]'),
            modeDescription: document.getElementById('modeDescription'),
            singleModeUI: document.getElementById('singleModeUI'),
            multipleModeUI: document.getElementById('multipleModeUI'),
            testModeUI: document.getElementById('testModeUI'),

            // Gmail 通知
            gmailNotificationEnabled: document.getElementById('gmailNotificationEnabled'),
            gmailNotificationRecipient: document.getElementById('gmailNotificationRecipient'),
            sendGmailTestEmailButton: document.getElementById('sendGmailTestEmailButton'),
            gmailNotificationResult: document.getElementById('gmailNotificationResult'),

            // チェックボックス
            downloadSource: document.getElementById('downloadSource'),
            downloadSourceWithoutFooter: document.getElementById('downloadSourceWithoutFooter'),
            downloadScreenshot: document.getElementById('downloadScreenshot'),
            downloadAiSupportFile: document.getElementById('downloadAiSupportFile'),

            // 監視対象設定
            monitorActiveTab: document.getElementById('monitorActiveTab'),
            monitorUrl: document.getElementById('monitorUrl'),
            urlContainer: document.getElementById('urlContainer'),
            targetUrl: document.getElementById('targetUrl'),
            sharedTargetpageEnvironment: document.getElementById('sharedTargetpageEnvironment'),
            sharedTargetpageSite: document.getElementById('sharedTargetpageSite'),
            sharedTargetpageSelect: document.getElementById('sharedTargetpageSelect'),
            targetpageNotificationStatus: document.getElementById('targetpageNotificationStatus'),
            singleKeywordRecentUrls: document.getElementById('singleKeywordRecentUrls'),
            singleKeywordScheduleEnabled: document.getElementById('singleKeywordScheduleEnabled'),
            singleKeywordScheduleTime: document.getElementById('singleKeywordScheduleTime'),
            setSingleKeywordScheduleTimeFromNowButton: document.getElementById('setSingleKeywordScheduleTimeFromNowButton'),
            singleKeywordScheduleHint: document.getElementById('singleKeywordScheduleHint'),
            singleKeywordScheduleStatus: document.getElementById('singleKeywordScheduleStatus'),

            // 監視範囲設定
            monitorSelector: document.getElementById('monitorSelector'),
            monitorKeyword: document.getElementById('monitorKeyword'),
            detectAppear: document.getElementById('detectAppear'),
            detectDisappear: document.getElementById('detectDisappear'),
            initialKeywordDetection: document.getElementById('initialKeywordDetection'),
            keywordMonitoringFetchConditions: document.getElementById('keywordMonitoringFetchConditions'),
            singleUrlSubtabButtons: document.querySelectorAll('[data-single-url-subtab]'),
            singleKeywordPanel: document.getElementById('singleKeywordPanel'),
            singleScheduledPanel: document.getElementById('singleScheduledPanel'),
            singleScheduledWatchStatus: document.getElementById('singleScheduledWatchStatus'),
            singleScheduledWatchEnabled: document.getElementById('singleScheduledWatchEnabled'),
            singleScheduledWatchSite: document.getElementById('singleScheduledWatchSite'),
            singleScheduledWatchProfile: document.getElementById('singleScheduledWatchProfile'),
            singleScheduledWatchUrl: document.getElementById('singleScheduledWatchUrl'),
            singleScheduledWatchRecentUrls: document.getElementById('singleScheduledWatchRecentUrls'),
            singleScheduledWatchSelector: document.getElementById('singleScheduledWatchSelector'),
            singleScheduledWatchStart: document.getElementById('singleScheduledWatchStart'),
            singleScheduledWatchEnd: document.getElementById('singleScheduledWatchEnd'),
            setSingleScheduledWatchTimesFromNowButton: document.getElementById('setSingleScheduledWatchTimesFromNowButton'),
            singleScheduledWatchInterval: document.getElementById('singleScheduledWatchInterval'),
            singleScheduledWatchImmediateDuration: document.getElementById('singleScheduledWatchImmediateDuration'),
            startSingleScheduledWatchNowButton: document.getElementById('startSingleScheduledWatchNowButton'),
            stopSingleScheduledWatchNowButton: document.getElementById('stopSingleScheduledWatchNowButton'),
            singleScheduledWatchOpenDetectedUrl: document.getElementById('singleScheduledWatchOpenDetectedUrl'),
            singleScheduledWatchNotifyExternal: document.getElementById('singleScheduledWatchNotifyExternal'),
            singleScheduledWatchExternalExtensionId: document.getElementById('singleScheduledWatchExternalExtensionId'),
            singleScheduledWatchDiscordChannelId: document.getElementById('singleScheduledWatchDiscordChannelId'),
            monitoringMode: document.getElementById('monitoringMode'),
            captureMode: document.getElementById('captureMode'),

            // 設定選択
            interval: document.getElementById('interval'),
            duration: document.getElementById('duration'),
            stopCondition: document.getElementById('stopCondition'),
            stopCountContainer: document.getElementById('stopCountContainer'),
            stopCount: document.getElementById('stopCount'),
            stopCountValue: document.getElementById('stopCountValue'),
            customDurationContainer: document.getElementById('customDurationContainer'),
            customDuration: document.getElementById('customDuration'),
            customDurationValue: document.getElementById('customDurationValue'),
            // 停止条件用カスタム期間（新ID）
            stopCustomDurationContainer: document.getElementById('stopCustomDurationContainer'),
            stopCustomDuration: document.getElementById('stopCustomDuration'),
            stopCustomDurationValue: document.getElementById('stopCustomDurationValue'),

            // カスタム設定
            customIntervalContainer: document.getElementById('customIntervalContainer'),
            customInterval: document.getElementById('customInterval'),
            customIntervalValue: document.getElementById('customIntervalValue'),
            stopCountValue: document.getElementById('stopCountValue'),

            // ボタン（必須要素）
            startButton: document.getElementById('startButton'),
            stopButton: document.getElementById('stopButton'),
            quickSourceButton: document.getElementById('quickSourceButton'),
            stockFetchObservedState: document.getElementById('stockFetchObservedState'),
            diagnosisSiteSelect: document.getElementById('diagnosisSiteSelect'),
            diagnosisActiveTab: document.getElementById('diagnosisActiveTab'),
            diagnosisUrl: document.getElementById('diagnosisUrl'),
            diagnosisUrlContainer: document.getElementById('diagnosisUrlContainer'),
            diagnosisTargetUrl: document.getElementById('diagnosisTargetUrl'),
            diagnosisSelector: document.getElementById('diagnosisSelector'),
            diagnosisKeyword: document.getElementById('diagnosisKeyword'),
            startBulkStockFetchDiagnosisButton: document.getElementById('startBulkStockFetchDiagnosisButton'),
            bulkStockFetchDiagnosisHint: document.getElementById('bulkStockFetchDiagnosisHint'),
            bulkStockFetchDiagnosisResult: document.getElementById('bulkStockFetchDiagnosisResult'),
            startStockFetchDiagnosisButton: document.getElementById('startStockFetchDiagnosisButton'),
            downloadStockApiInvestigationMemoButton: document.getElementById('downloadStockApiInvestigationMemoButton'),
            stockFetchDiagnosisResult: document.getElementById('stockFetchDiagnosisResult'),

            // 複数監視用要素
            runningMonitorCount: document.getElementById('runningMonitorCount'),
            stoppedMonitorCount: document.getElementById('stoppedMonitorCount'),
            disabledMonitorCount: document.getElementById('disabledMonitorCount'),
            multipleEcSiteSelect: document.getElementById('multipleEcSiteSelect'),
            addMonitorButton: document.getElementById('addMonitorButton'),
            multipleSharedTargetpageEnvironment: document.getElementById('multipleSharedTargetpageEnvironment'),
            multipleSharedTargetpageSelect: document.getElementById('multipleSharedTargetpageSelect'),
            addSharedTargetpageMonitorButton: document.getElementById('addSharedTargetpageMonitorButton'),
            monitoringList: document.getElementById('monitoringList'),
            startAllButton: document.getElementById('startAllButton'),
            stopAllButton: document.getElementById('stopAllButton'),
            refreshStatusButton: document.getElementById('refreshStatusButton'),
            multiCaptureMode: document.getElementById('multiCaptureMode'),
            multiScheduleEnabled: document.getElementById('multiScheduleEnabled'),
            multiScheduleTime: document.getElementById('multiScheduleTime'),
            setMultipleScheduledMonitoringTimeFromNowButton: document.getElementById('setMultipleScheduledMonitoringTimeFromNowButton'),
            multipleScheduledMonitoringStatus: document.getElementById('multipleScheduledMonitoringStatus'),
            monitoringExecutionHistoryList: document.getElementById('monitoringExecutionHistoryList'),
            refreshMonitoringExecutionHistoryButton: document.getElementById('refreshMonitoringExecutionHistoryButton'),
            multipleListWatchSite: document.getElementById('multipleListWatchSite'),
            multipleListWatchProfile: document.getElementById('multipleListWatchProfile'),
            multipleListWatchName: document.getElementById('multipleListWatchName'),
            multipleListWatchUrl: document.getElementById('multipleListWatchUrl'),
            multipleListWatchStartTime: document.getElementById('multipleListWatchStartTime'),
            multipleListWatchEndTime: document.getElementById('multipleListWatchEndTime'),
            multipleListWatchInterval: document.getElementById('multipleListWatchInterval'),
            setMultipleListWatchTimesFromNowButton: document.getElementById('setMultipleListWatchTimesFromNowButton'),
            multipleListWatchImmediateDuration: document.getElementById('multipleListWatchImmediateDuration'),
            startMultipleListWatchNowButton: document.getElementById('startMultipleListWatchNowButton'),
            stopMultipleListWatchNowButton: document.getElementById('stopMultipleListWatchNowButton'),
            multipleListWatchImmediateStatus: document.getElementById('multipleListWatchImmediateStatus'),
            multipleListWatchOpenProductUrl: document.getElementById('multipleListWatchOpenProductUrl'),
            multipleListWatchNotifyExternal: document.getElementById('multipleListWatchNotifyExternal'),
            multipleListWatchExternalId: document.getElementById('multipleListWatchExternalId'),
            saveMultipleListWatchButton: document.getElementById('saveMultipleListWatchButton'),
            cancelMultipleListWatchEditButton: document.getElementById('cancelMultipleListWatchEditButton'),
            multipleListWatchScheduleStatus: document.getElementById('multipleListWatchScheduleStatus'),
            multipleListWatchList: document.getElementById('multipleListWatchList'),
            multipleListWatchSection: document.getElementById('multipleListWatchSection'),
            multipleUrlSubtabs: document.querySelectorAll('[data-multiple-url-subtab]'),
            multipleProductWatchPanel: document.getElementById('multipleProductWatchPanel'),

            // Excel Export/Import要素
            exportExcelBtn: document.getElementById('exportExcelBtn'),
            importExcelBtn: document.getElementById('importExcelBtn'),
            excelFileInput: document.getElementById('excelFileInput'),
            excelProgress: document.getElementById('excelProgress'),

            // モーダル要素
            addMonitorModal: document.getElementById('addMonitorModal'),
            modalMonitorName: document.getElementById('modalMonitorName'),
            modalMonitorUrl: document.getElementById('modalMonitorUrl'),
            modalEcSiteHint: document.getElementById('modalEcSiteHint'),
            modalMonitorKeyword: document.getElementById('modalMonitorKeyword'),
            modalMonitorSelector: document.getElementById('modalMonitorSelector'),
            modalDetectAppear: document.getElementById('modalDetectAppear'),
            modalDetectDisappear: document.getElementById('modalDetectDisappear'),
            modalAddButton: document.getElementById('modalAddButton'),
            modalCancelButton: document.getElementById('modalCancelButton'),

            // 複数監視共通設定要素
            multiDetectAppear: document.getElementById('multiDetectAppear'),
            multiDetectDisappear: document.getElementById('multiDetectDisappear'),
            multiInitialKeywordDetection: document.getElementById('multiInitialKeywordDetection'),
            multiReloadWaitAfterReload: document.getElementById('multiReloadWaitAfterReload'),
            multiInterval: document.getElementById('multiInterval'),
            multiMonitoringMode: document.getElementById('multiMonitoringMode'),
            multiDuration: document.getElementById('multiDuration'),
            multiCustomIntervalContainer: document.getElementById('multiCustomIntervalContainer'),
            multiCustomInterval: document.getElementById('multiCustomInterval'),
            multiCustomIntervalValue: document.getElementById('multiCustomIntervalValue'),
            multiCustomDurationContainer: document.getElementById('multiCustomDurationContainer'),
            multiCustomDuration: document.getElementById('multiCustomDuration'),
            multiCustomDurationValue: document.getElementById('multiCustomDurationValue'),

            // ステータス
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            message: document.getElementById('message'),

            // 手動テスト用設定
            initialWaitAfterCapture: document.getElementById('initialWaitAfterCapture'),
            reloadWaitAfterReload: document.getElementById('reloadWaitAfterReload'),

            // ECサイト補完・診断UI
            ecSiteSelectKeyword: document.getElementById('ecSiteSelectKeyword'),
            scheduledWatchSitesList: document.getElementById('scheduledWatchSitesList'),
            resyncScheduledWatchSitesButton: document.getElementById('resyncScheduledWatchSitesButton'),
            refreshScheduledWatchSitesButton: document.getElementById('refreshScheduledWatchSitesButton'),
            scheduledWatchResyncResult: document.getElementById('scheduledWatchResyncResult'),
            scheduledWatchTestSiteSelect: document.getElementById('scheduledWatchTestSiteSelect'),
            startSingleScheduledWatchTestButton: document.getElementById('startSingleScheduledWatchTestButton'),
            startMultiScheduledWatchTestButton: document.getElementById('startMultiScheduledWatchTestButton'),
            startMultiScheduledWatchDiffTestButton: document.getElementById('startMultiScheduledWatchDiffTestButton'),
            startMultiScheduledWatchArtifactDiffTestButton: document.getElementById('startMultiScheduledWatchArtifactDiffTestButton'),
            scheduledWatchDiffTestCheckGmail: document.getElementById('scheduledWatchDiffTestCheckGmail'),
            scheduledWatchArtifactDiffTestModeOptions: document.querySelectorAll('input[name="scheduledWatchArtifactDiffTestMode"]'),
            scheduledWatchTestStatus: document.getElementById('scheduledWatchTestStatus'),

            // テストモード
            testScenarioSelect: document.getElementById('testScenarioSelect'),
            testScenarioModeOptions: document.querySelectorAll('[data-test-scenario-mode]'),
            testScenarioPanel: document.getElementById('testScenarioPanel'),
            twoTierAcceptanceTestPanel: document.getElementById('twoTierAcceptanceTestPanel'),
            scheduledWatchTestPanel: document.getElementById('scheduledWatchTestPanel'),
            stockFetchDiagnosisTestPanel: document.getElementById('stockFetchDiagnosisTestPanel'),
            testScenarioModeDescription: document.getElementById('testScenarioModeDescription'),
            startTestScenarioButton: document.getElementById('startTestScenarioButton'),
            initialDetectedAutoTestStatus: document.getElementById('initialDetectedAutoTestStatus'),
            twoTierAcceptanceTestStatus: document.getElementById('twoTierAcceptanceTestStatus'),
            twoTierAcceptanceStartButtons: document.querySelectorAll('[data-two-tier-scenario]'),
            multipleGmailTestStatus: document.getElementById('multipleGmailTestStatus'),
            testScenarioExecutionMode: document.getElementById('testScenarioExecutionMode'),
            testScenarioExecutionModeSelector: document.getElementById('testScenarioExecutionModeSelector'),
            testScenarioExecutionModeOptions: document.querySelectorAll('[data-test-scenario-execution-mode]'),
            testTabSiteSelect: document.getElementById('testTabSiteSelect'),
            testTabSiteNote: document.getElementById('testTabSiteNote'),
            testTabScenarioSummary: document.getElementById('testTabScenarioSummary'),
            testTabScenarioStatus: document.getElementById('testTabScenarioStatus'),
            stopTestTabScenarioButton: document.getElementById('stopTestTabScenarioButton'),
            testTabManualCodeSection: document.getElementById('testTabManualCodeSection'),
            testTabManualCode: document.getElementById('testTabManualCode'),
            copyTestTabManualCodeButton: document.getElementById('copyTestTabManualCodeButton'),
            testScenarioTitle: document.getElementById('testScenarioTitle'),
            testScenarioDescription: document.getElementById('testScenarioDescription'),
            testScenarioGoal: document.getElementById('testScenarioGoal'),
            testScenarioPreconditions: document.getElementById('testScenarioPreconditions'),
            testScenarioPopupSettings: document.getElementById('testScenarioPopupSettings'),
            testScenarioCautions: document.getElementById('testScenarioCautions'),
            testScenarioDevtoolsSection: document.getElementById('testScenarioDevtoolsSection'),
            testScenarioDevtoolsLabel: document.getElementById('testScenarioDevtoolsLabel'),
            testScenarioDevtoolsDescription: document.getElementById('testScenarioDevtoolsDescription'),
            testScenarioDevtoolsCode: document.getElementById('testScenarioDevtoolsCode'),
            testScenarioExtraDevtoolsSection: document.getElementById('testScenarioExtraDevtoolsSection'),
            testScenarioExtraDevtoolsLabel: document.getElementById('testScenarioExtraDevtoolsLabel'),
            testScenarioExtraDevtoolsDescription: document.getElementById('testScenarioExtraDevtoolsDescription'),
            testScenarioExtraDevtoolsCode: document.getElementById('testScenarioExtraDevtoolsCode'),
            testScenarioAutoReproduceSection: document.getElementById('testScenarioAutoReproduceSection'),
            testScenarioAutoReproduce: document.getElementById('testScenarioAutoReproduce'),
            testScenarioExpectedResults: document.getElementById('testScenarioExpectedResults'),
            applyTestScenarioButton: document.getElementById('applyTestScenarioButton'),
            restoreTestScenarioButton: document.getElementById('restoreTestScenarioButton'),
            testBackupSummary: document.getElementById('testBackupSummary'),
            testBackupNote: document.getElementById('testBackupNote'),
            copyDevtoolsCodeButton: document.getElementById('copyDevtoolsCodeButton'),
            copyExtraDevtoolsCodeButton: document.getElementById('copyExtraDevtoolsCodeButton')
        };

        // startAllButton要素の詳細確認
        console.log('🔵 [DEBUG] startAllButton要素確認:', {
            element: elements.startAllButton,
            exists: !!elements.startAllButton,
            id: elements.startAllButton?.id,
            className: elements.startAllButton?.className,
            disabled: elements.startAllButton?.disabled,
            style: elements.startAllButton?.style?.display,
            tagName: elements.startAllButton?.tagName,
            parentElement: elements.startAllButton?.parentElement?.id
        });

        // 緊急デバッグ: startAllButtonが見つからない場合の詳細調査
        if (!elements.startAllButton) {
            console.error('🚨 startAllButton未発見 - 詳細調査開始');
            const allButtons = document.querySelectorAll('button');
            console.log('📋 ページ内の全ボタン一覧:', Array.from(allButtons).map(btn => ({
                id: btn.id,
                textContent: btn.textContent,
                className: btn.className,
                display: window.getComputedStyle(btn).display,
                visibility: window.getComputedStyle(btn).visibility,
                parentDisplay: btn.parentElement ? window.getComputedStyle(btn.parentElement).display : 'unknown'
            })));

            const startAllById = document.getElementById('startAllButton');
            console.log('🔍 getElementById直接取得結果:', {
                element: startAllById,
                exists: !!startAllById,
                display: startAllById ? window.getComputedStyle(startAllById).display : 'N/A',
                parentElement: startAllById?.parentElement?.id,
                parentDisplay: startAllById?.parentElement ? window.getComputedStyle(startAllById.parentElement).display : 'N/A'
            });

            // multipleModeUIの状態を確認
            const multipleModeUI = document.getElementById('multipleModeUI');
            console.log('🔍 multipleModeUI状態確認:', {
                element: multipleModeUI,
                exists: !!multipleModeUI,
                display: multipleModeUI ? window.getComputedStyle(multipleModeUI).display : 'N/A',
                styleDisplay: multipleModeUI?.style?.display
            });
        }

        // 必須要素の検証
        const requiredElements = [
            'modeOptions', 'modeDescription', 'singleModeUI', 'multipleModeUI', 'testModeUI',
            'startButton', 'stopButton', 'quickSourceButton'
        ];

        for (const elementName of requiredElements) {
            if (!elements[elementName]) {
                console.error(`❌ 必須要素が見つかりません: ${elementName}`);
                throw new Error(`必須要素が見つかりません: ${elementName}`);
            }
        }

        console.log('DOM要素取得結果:', {
            modeOptions: elements.modeOptions.length,
            singleModeUI: !!elements.singleModeUI,
            multipleModeUI: !!elements.multipleModeUI,
            startButton: !!elements.startButton,
            stopButton: !!elements.stopButton,
            quickSourceButton: !!elements.quickSourceButton,
            // 🔍 カスタム要素デバッグ強化
            stopCondition: !!elements.stopCondition,
            stopCountContainer: !!elements.stopCountContainer,
            customDurationContainer: !!elements.customDurationContainer,
            stopCustomDurationContainer: !!elements.stopCustomDurationContainer,
            customDurationFound: !!elements.customDuration,
            stopCustomDurationFound: !!elements.stopCustomDuration
        });

        return elements;

    } catch (error) {
        console.error('DOM要素取得エラー:', error);
        throw error;
    }
}

/**
 * 現在のモードを取得
 * @returns {string} 'single' または 'multiple'
 */
function getCurrentMode() {
    try {
        // アクティブなモード選択ボタンを検索
        const activeButton = Array.from(elements.modeOptions).find(button =>
            button.classList.contains('active')
        );

        if (activeButton) {
            const mode = activeButton.getAttribute('data-mode');
            console.log('🔍 現在のモード:', mode);
            return mode;
        }

        // フォールバック: UIの表示状態から判定
        if (elements.singleModeUI && elements.singleModeUI.style.display !== 'none') {
            console.log('🔍 フォールバック判定: single');
            return 'single';
        } else if (elements.multipleModeUI && elements.multipleModeUI.style.display !== 'none') {
            console.log('🔍 フォールバック判定: multiple');
            return 'multiple';
        } else if (elements.testModeUI && elements.testModeUI.style.display !== 'none') {
            console.log('🔍 フォールバック判定: test');
            return 'test';
        }

        // デフォルト
        console.log('🔍 デフォルトモード: multiple');
        return DEFAULT_POPUP_MODE;

    } catch (error) {
        console.error('モード取得エラー:', error);
        return DEFAULT_POPUP_MODE; // エラー時はデフォルト
    }
}

// DOM要素を格納するグローバル変数
let elements = null;

// 設定管理：background.jsのMonitoringConfigManagerを利用
let configManager = null;
let ecSitesCache = null;
let scheduledWatchSitesCache = null;
let stockFetchDiagnosisSitesCache = null;
let latestMultipleConfigs = [];
let latestMultipleModeStatus = null;
const DEFAULT_POPUP_MODE = 'multiple';
const COLLAPSIBLE_STATE_STORAGE_KEY = 'popupCollapsibleStates';
const MULTIPLE_EC_SITE_STORAGE_KEY = 'multipleSelectedEcSiteId';
const TEST_SCENARIO_MODE_STORAGE_KEY = 'popupTestScenarioMode';
const POPUP_SELECTED_MAIN_MODE_KEY = 'popupSelectedMainMode';
const SINGLE_RELOAD_WAIT_AFTER_RELOAD_DEFAULT = 15;
const NISSAN_TEST_URL_IN_STOCK = 'https://shop.nissan.co.jp/product/detail/6810';
const NISSAN_TEST_URL_OUT_OF_STOCK = 'https://shop.nissan.co.jp/product/detail/6710';
const NISSAN_TEST_SELECTOR_PRODUCT_STATUS = '#form1 dl.clearfix:not(.kakaku):not(.parallel) dd';
const NISSAN_TEST_KEYWORD_IN_STOCK = '在庫あり';
const NISSAN_TEST_KEYWORD_OUT_OF_STOCK = '在庫なし';
const NISSAN_TEST_KEYWORD_APPEAR = 'PageRecorderテスト在庫あり';
const NISSAN_TEST_SELECTOR_INVALID = '[';
const NISSAN_TEST_SELECTOR_NOT_FOUND = '.page-recorder-test-valid-but-not-found';
const NISSAN_TEST_SELECTOR_INSPECT_CODE = `(() => {
  const selector = '${NISSAN_TEST_SELECTOR_PRODUCT_STATUS}';
  const nodes = [...document.querySelectorAll(selector)];
  return {
    count: nodes.length,
    items: nodes.map((node, index) => ({
    index,
    text: node.textContent.trim()
    }))
  };
})()`;
const NISSAN_TEST_MANUAL_APPEAR_CODE = `(() => {
  const targets = [...document.querySelectorAll('${NISSAN_TEST_SELECTOR_PRODUCT_STATUS}')];
  if (targets.length === 0) throw new Error('target not found');
  targets.forEach((target) => {
    target.textContent = '${NISSAN_TEST_KEYWORD_APPEAR}';
  });
  return { updatedCount: targets.length };
})()`;
const NISSAN_TEST_MANUAL_DISAPPEAR_CODE = `(() => {
  const targets = [...document.querySelectorAll('${NISSAN_TEST_SELECTOR_PRODUCT_STATUS}')];
  if (targets.length === 0) throw new Error('target not found');
  targets.forEach((target) => {
    target.textContent = target.textContent.replace('${NISSAN_TEST_KEYWORD_IN_STOCK}', '販売準備中');
  });
  return { updatedCount: targets.length };
})()`;
const NISSAN_TEST_MANUAL_ERROR_CODE = `(() => {
  const selector = '${NISSAN_TEST_SELECTOR_INVALID}';
  try {
    return {
      selector,
      matchedCount: document.querySelectorAll(selector).length
    };
  } catch (error) {
    return {
      selector,
      errorName: error.name,
      errorMessage: error.message
    };
  }
})()`;
const NISSAN_TEST_MANUAL_ELEMENT_NOT_FOUND_CODE = `(() => {
  const selector = '${NISSAN_TEST_SELECTOR_NOT_FOUND}';
  return {
    selector,
    matchedCount: document.querySelectorAll(selector).length
  };
})()`;
const TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION =
    'DevTools Consoleで実行すると、一致件数と対象テキストを表示する。ページ内容は変更しない。';
const TEST_SCENARIO_MODE_DESCRIPTIONS = {
    single: 'single 用固定シナリオ',
    multiple: '本番一覧を変えずテスト用 2 件を開始'
};
const TEST_SCENARIO_APPLY_BUTTON_LABELS = {
    single: 'single に適用',
    multiple: 'multiple に適用'
};
const TEST_SCENARIO_START_BUTTON_LABELS = {
    single: 'single テスト開始',
    multiple: 'multiple テスト開始'
};
const TEST_SCENARIO_BACKUP_NOTES = {
    single: '適用前の single 設定を 1 世代退避',
    multiple: '本番一覧は未変更。テスト用 2 件のみ保存'
};

function normalizeTestScenarioMode(mode) {
    return ['acceptance', 'single', 'multiple', 'scheduled', 'diagnosis'].includes(mode) ? mode : 'acceptance';
}

function readStoredTestScenarioMode(storage = globalThis.localStorage) {
    try {
        return normalizeTestScenarioMode(storage?.getItem?.(TEST_SCENARIO_MODE_STORAGE_KEY));
    } catch (error) {
        console.warn('⚠️ テストシナリオモード復元エラー:', error);
        return 'acceptance';
    }
}

function persistTestScenarioMode(mode, storage = globalThis.localStorage) {
    try {
        storage?.setItem?.(TEST_SCENARIO_MODE_STORAGE_KEY, normalizeTestScenarioMode(mode));
    } catch (error) {
        console.warn('⚠️ テストシナリオモード保存エラー:', error);
    }
}

// 主モード保持用ヘルパー
function normalizeMainMode(mode) {
    return ['single', 'multiple', 'test'].includes(mode) ? mode : null;
}

function readStoredMainMode(storage = globalThis.localStorage) {
    try {
        return normalizeMainMode(storage?.getItem?.(POPUP_SELECTED_MAIN_MODE_KEY));
    } catch (error) {
        console.warn('⚠️ 主モード復元エラー:', error);
        return null;
    }
}

function persistMainMode(mode, storage = globalThis.localStorage) {
    const normalized = normalizeMainMode(mode);
    if (!normalized) return;
    try {
        storage?.setItem?.(POPUP_SELECTED_MAIN_MODE_KEY, normalized);
    } catch (error) {
        console.warn('⚠️ 主モード保存エラー:', error);
    }
}

function resolveInitialPopupMode(config) {
    const stored = readStoredMainMode();
    if (stored) return stored;
    const configMode = normalizeMainMode(config?.mode);
    return configMode || DEFAULT_POPUP_MODE;
}

let selectedTestScenarioMode = readStoredTestScenarioMode();
let selectedTestScenarioId = 'appear';
const TEST_TAB_SITE_STORAGE_KEY = 'popupTestTabSiteId';
const TEST_TAB_REPRODUCTION_MODE_STORAGE_KEY = 'popupTestTabReproductionMode';

function readTestTabLocalValue(key) {
    try {
        return globalThis.localStorage?.getItem(key) || '';
    } catch (_) {
        return '';
    }
}

function writeTestTabLocalValue(key, value) {
    try {
        globalThis.localStorage?.setItem(key, value);
    } catch (_) {
        // 保存できない環境でも、表示中の選択はそのまま使う。
    }
}

let testTabSiteCandidates = [];
let selectedTestTabSiteId = readTestTabLocalValue(TEST_TAB_SITE_STORAGE_KEY) || 'nissan';
let testTabReproductionMode = readTestTabLocalValue(TEST_TAB_REPRODUCTION_MODE_STORAGE_KEY) === 'manual' ? 'manual' : 'auto';
let testTabScenarioPollingTimer = null;
let testTabPreviewRequestId = 0;

const SINGLE_TEST_SCENARIO_DEFAULTS = {
    url: '',
    settings: {
        downloadSource: true,
        downloadSourceWithoutFooter: false,
        downloadScreenshot: true,
        downloadAiSupportFile: false,
        monitorSelector: '',
        monitorKeyword: '',
        detectMode: 'appear',
        initialKeywordDetection: false,
        scheduleEnabled: false,
        scheduleWindowStart: '11:57',
        scheduleWindowEnd: '12:05',
        scheduleReloadIntervalSec: 30,
        scheduleTime: '11:57',
        openDetectedUrl: false,
        notifyExternalExtension: false,
        externalExtensionId: '',
        interval: 20,
        duration: 60,
        stopCondition: 'time',
        stopCount: 10,
        stopCustomDuration: 60,
        reloadWaitAfterReload: SINGLE_RELOAD_WAIT_AFTER_RELOAD_DEFAULT
    }
};

const SINGLE_TEST_SCENARIO_GROUPS = [
    { id: 'monitoring', label: '通常監視フロー' },
    { id: 'diagnostics', label: '設定・セレクタ診断' },
    { id: 'notifications', label: '通知連携' }
];

const MULTIPLE_TEST_SCENARIO_GROUPS = [
    { id: 'monitoring', label: '通常監視フロー' },
    { id: 'notifications', label: '通知連携' }
];

const SINGLE_TEST_SCENARIOS = {
    appear: {
        id: 'appear',
        groupId: 'monitoring',
        supportsAutoJudgement: true,
        label: '1. テスト用キーワードの出現を確認する',
        title: '1. テスト用キーワードの出現を確認する',
        description: '有効な日産商品ページにテスト用キーワードを注入し、出現検知を確認する。',
        goal: '開始時に不一致で継続監視となり、テスト用キーワード注入後に検知することを確認。',
        preconditions: [
            'popup を開く前に拡張をリロードする',
            'Service Worker Console を開いて監視ログを見られる状態にする',
            '日産オンラインショップ 6810 ページで在庫表示のセレクタが1件以上一致することを確認する'
        ],
        popupSettings: [
            { label: 'URL', value: NISSAN_TEST_URL_IN_STOCK },
            { label: 'セレクタ', value: NISSAN_TEST_SELECTOR_PRODUCT_STATUS },
            { label: 'キーワード', value: NISSAN_TEST_KEYWORD_APPEAR },
            { label: '検知方法', value: '出現検知' },
            { label: '開始直後判定', value: 'OFF' },
            { label: '監視間隔 / 時間', value: '20秒 / 60秒' },
            { label: '保存内容', value: 'ページソースON / フッター除外OFF / スクリーンショットON' }
        ],
        cautions: [
            '運用用 single 設定は上書きされるため、backup 前提で使う',
            '複数一致の可能性があるため、先に `count` と `items` を確認'
        ],
        devtoolsLabel: 'ページ状態の確認コード',
        devtoolsDescription: TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION,
        devtoolsCode: NISSAN_TEST_SELECTOR_INSPECT_CODE,
        extraDevtoolsLabel: '検知を再現するコード',
        extraDevtoolsDescription: '変更対象: 一致した対象テキストをテスト用キーワードへ変更する。実行タイミング: 監視開始後、Service Worker Console に「🧪 手動テストコードを実行できます」が表示されている間。ページを再読み込みすると元に戻る。',
        extraDevtoolsCode: NISSAN_TEST_MANUAL_APPEAR_CODE,
        expectedResults: [
            'popup設定値 が 6810 とテスト用キーワード向けに切り替わる',
            'single に適用後、モードが single に戻る',
            '待機中にテスト用キーワードへ変わると次回チェックで検知'
        ],
        config: {
            url: NISSAN_TEST_URL_IN_STOCK,
            settings: {
                monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                monitorKeyword: NISSAN_TEST_KEYWORD_APPEAR,
                detectMode: 'appear',
                initialKeywordDetection: false
            }
        }
    },
    disappear: {
        id: 'disappear',
        groupId: 'monitoring',
        supportsAutoJudgement: true,
        label: '2. 売り切れ表示が消えることを確認する',
        title: '2. 売り切れ表示が消えることを確認する',
        description: '在庫表示の消失確認用の固定設定を `single` に反映する。',
        goal: '「在庫あり」が消えたとき、消失検知になることを確認。',
        preconditions: [
            'popup を開く前に拡張をリロードする',
            'Service Worker Console を開いて監視ログを見られる状態にする',
            '日産オンラインショップ 6810 ページで「在庫あり」表記が見えていることを確認する'
        ],
        popupSettings: [
            { label: 'URL', value: NISSAN_TEST_URL_IN_STOCK },
            { label: 'セレクタ', value: NISSAN_TEST_SELECTOR_PRODUCT_STATUS },
            { label: 'キーワード', value: NISSAN_TEST_KEYWORD_IN_STOCK },
            { label: '検知方法', value: '消失検知' },
            { label: '開始直後判定', value: 'OFF' },
            { label: '監視間隔 / 時間', value: '20秒 / 60秒' },
            { label: '保存内容', value: 'ページソースON / フッター除外OFF / スクリーンショットON' }
        ],
        cautions: [
            '在庫ありページ検知ではなく、在庫あり表示の消失確認用',
            'DOM を手動変更したら再読込で戻る前提で確認',
            '他要素に「在庫あり」が残ると消失検知にならない'
        ],
        devtoolsLabel: 'ページ状態の確認コード',
        devtoolsDescription: TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION,
        devtoolsCode: NISSAN_TEST_SELECTOR_INSPECT_CODE,
        extraDevtoolsLabel: '検知を再現するコード',
        extraDevtoolsDescription: '変更対象: 一致した対象テキストから「在庫あり」を消去する。実行タイミング: 監視開始後、Service Worker Console に「🧪 手動テストコードを実行できます」が表示されている間。ページを再読み込みすると元に戻る。',
        extraDevtoolsCode: NISSAN_TEST_MANUAL_DISAPPEAR_CODE,
        expectedResults: [
            '説明が売り切れ表示の消失確認向けになる',
            '「在庫あり」が消えると消失検知になる',
            'backup 状態に保存時刻が出る'
        ],
        config: {
            url: NISSAN_TEST_URL_IN_STOCK,
            settings: {
                monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                monitorKeyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                detectMode: 'disappear',
                initialKeywordDetection: false
            }
        }
    },
    initial_detected: {
        id: 'initial_detected',
        groupId: 'monitoring',
        label: '3. 在庫ありページで開始直後に一致',
        title: '3. 在庫ありページで開始直後に一致',
        description: '開始直後に一致させる固定設定を `single` に反映する。テスト開始は自動判定対応です。',
        goal: '開始直後判定 ON で初回一致になり、HTML・スクリーンショット保存と終了まで自動判定する。',
        preconditions: [
            'popup を開く前に拡張をリロードする',
            'Service Worker Console を開いて初回ログを確認できる状態にする',
            '日産オンラインショップ 6810 ページに「在庫あり」が表示されていることを確認する'
        ],
        popupSettings: [
            { label: 'URL', value: NISSAN_TEST_URL_IN_STOCK },
            { label: 'セレクタ', value: NISSAN_TEST_SELECTOR_PRODUCT_STATUS },
            { label: 'キーワード', value: NISSAN_TEST_KEYWORD_IN_STOCK },
            { label: '検知方法', value: '出現検知' },
            { label: '開始直後判定', value: 'ON' },
            { label: '監視間隔 / 時間', value: '20秒 / 60秒' },
            { label: '保存内容', value: 'ページソースON / フッター除外OFF / スクリーンショットON' }
        ],
        cautions: [
            '開始直後に判定が走るため、直後は別操作を挟まない',
            '通常運用用ではなく短時間確認用'
        ],
        devtoolsLabel: 'ページ状態の確認コード',
        devtoolsDescription: TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION,
        devtoolsCode: NISSAN_TEST_SELECTOR_INSPECT_CODE,
        expectedResults: [
            '一時DOM再現後に「在庫あり」が検知される',
            'テスト専用フォルダへHTML・スクリーンショットが保存される',
            'テストタブが閉じられ、popup に合格・不合格・要確認が表示される'
        ],
        supportsAutoJudgement: true,
        config: {
            url: NISSAN_TEST_URL_IN_STOCK,
            settings: {
                monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                monitorKeyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                detectMode: 'appear',
                initialKeywordDetection: true
            }
        }
    },
    initial_not_detected: {
        id: 'initial_not_detected',
        groupId: 'monitoring',
        supportsAutoJudgement: true,
        label: '4. テスト用キーワードで開始直後は不一致',
        title: '4. 正常系: 開始直後に not_detected で継続監視',
        description: 'テスト用キーワードが未出現のまま継続する固定設定を `single` に反映する。',
        goal: '開始直後判定 ON でも `not_detected` のまま継続することを確認。',
        preconditions: [
            'popup を開く前に拡張をリロードする',
            'Service Worker Console を開いて初回ログを確認できる状態にする',
            '日産オンラインショップ 6810 ページにテスト用キーワードが存在しないことをページ状態の確認コードで確認する'
        ],
        popupSettings: [
            { label: 'URL', value: NISSAN_TEST_URL_IN_STOCK },
            { label: 'セレクタ', value: NISSAN_TEST_SELECTOR_PRODUCT_STATUS },
            { label: 'キーワード', value: NISSAN_TEST_KEYWORD_APPEAR },
            { label: '検知方法', value: '出現検知' },
            { label: '開始直後判定', value: 'ON' },
            { label: '監視間隔 / 時間', value: '20秒 / 60秒' },
            { label: '保存内容', value: 'ページソースON / フッター除外OFF / スクリーンショットON' }
        ],
        cautions: [
            '在庫表示の状態にかかわらずテスト用キーワードは開始時に未出現',
            '初回未検知でも異常ではなく継続監視が期待動作'
        ],
        devtoolsLabel: 'ページ状態の確認コード',
        devtoolsDescription: TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION,
        devtoolsCode: NISSAN_TEST_SELECTOR_INSPECT_CODE,
        expectedResults: [
            '初回判定は `not_detected` になる',
            '継続監視設定は通常通り保存される',
            'popup 再オープン後も backup 状態が保持される'
        ],
        config: {
            url: NISSAN_TEST_URL_IN_STOCK,
            settings: {
                monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                monitorKeyword: NISSAN_TEST_KEYWORD_APPEAR,
                detectMode: 'appear',
                initialKeywordDetection: true
            }
        }
    },
    keyword_missing_check: {
        id: 'keyword_missing_check',
        groupId: 'diagnostics',
        supportsAutoJudgement: true,
        label: '5. 空キーワード設定の反映と開始前バリデーション確認',
        title: '5. 空キーワード設定の反映と開始前バリデーション確認',
        description: '空キーワード設定を `single` に反映し、開始前バリデーションを確認する。',
        goal: '空キーワードで開始できないことを確認。',
        preconditions: [
            'popup を開く前に拡張をリロードする',
            'popup の `single` 画面へ戻ってキーワード欄とメッセージ表示を確認できる状態にする',
            '通常シナリオに戻すため、必要なら backup 復元を使える状態にしておく'
        ],
        popupSettings: [
            { label: 'URL', value: NISSAN_TEST_URL_IN_STOCK },
            { label: 'セレクタ', value: NISSAN_TEST_SELECTOR_PRODUCT_STATUS },
            { label: 'キーワード', value: '空文字' },
            { label: '検知方法', value: '出現検知' },
            { label: '開始直後判定', value: 'OFF' },
            { label: '監視間隔 / 時間', value: '20秒 / 60秒' },
            { label: '保存内容', value: 'ページソースON / フッター除外OFF / スクリーンショットON' }
        ],
        cautions: [
            '目的は `decision: error` ではなく開始前バリデーション確認',
            '確認後は backup 復元か別シナリオ適用で戻す'
        ],
        devtoolsLabel: 'ページ状態の確認コード',
        devtoolsDescription: TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION,
        devtoolsCode: NISSAN_TEST_SELECTOR_INSPECT_CODE,
        expectedResults: [
            'キーワード欄が空の single 設定になる',
            '`監視キーワードを入力してください` が表示される',
            '監視は開始されない'
        ],
        config: {
            url: NISSAN_TEST_URL_IN_STOCK,
            settings: {
                monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                monitorKeyword: '',
                detectMode: 'appear',
                initialKeywordDetection: false
            }
        }
    },
    element_not_found_check: {
        id: 'element_not_found_check',
        groupId: 'diagnostics',
        supportsAutoJudgement: true,
        label: '6. 異常系: 一致要素なしで error 確認',
        title: '6. 異常系: 一致要素なしで error 確認',
        description: '一致要素なしの停止確認用固定設定を `single` に反映する。',
        goal: '要素未一致が `error` 扱いで停止することを確認。',
        preconditions: [
            'popup を開く前に拡張をリロードする',
            'Service Worker Console を開いてエラーログを確認できる状態にする',
            '通常シナリオに戻すため、必要なら backup 復元を使える状態にしておく'
        ],
        popupSettings: [
            { label: 'URL', value: NISSAN_TEST_URL_IN_STOCK },
            { label: 'セレクタ', value: NISSAN_TEST_SELECTOR_NOT_FOUND },
            { label: 'キーワード', value: NISSAN_TEST_KEYWORD_IN_STOCK },
            { label: '検知方法', value: '出現検知' },
            { label: '開始直後判定', value: 'OFF' },
            { label: '監視間隔 / 時間', value: '20秒 / 60秒' },
            { label: '保存内容', value: 'ページソースON / フッター除外OFF / スクリーンショットON' }
        ],
        cautions: [
            '無効セレクタではなく、文法は正しく一致要素がないケース',
            '確認後は backup 復元か別シナリオ適用で戻す'
        ],
        devtoolsLabel: 'ページ状態の確認コード',
        devtoolsDescription: TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION,
        devtoolsCode: NISSAN_TEST_SELECTOR_INSPECT_CODE,
        extraDevtoolsLabel: '検知を再現するコード',
        extraDevtoolsDescription: '変更対象: なし。指定セレクタが 0 件であることを確認する。実行タイミング: 監視開始前。ページ内容は変更しないため、再読み込みは不要。',
        extraDevtoolsCode: NISSAN_TEST_MANUAL_ELEMENT_NOT_FOUND_CODE,
        expectedResults: [
            '`decision: error` と `element_not_found` 系ログを確認できる',
            '無効セレクタとの切り分けができる',
            'error 確認後も backup を復元できる'
        ],
        config: {
            url: NISSAN_TEST_URL_IN_STOCK,
            settings: {
                monitorSelector: NISSAN_TEST_SELECTOR_NOT_FOUND,
                monitorKeyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                detectMode: 'appear',
                initialKeywordDetection: false
            }
        }
    },
    pending_error_check: {
        id: 'pending_error_check',
        groupId: 'diagnostics',
        supportsAutoJudgement: true,
        label: '7. 異常系: 無効セレクタで error 確認',
        title: '7. 異常系: 無効セレクタで error 確認',
        description: '無効セレクタの停止確認用固定設定を `single` に反映する。',
        goal: '`selector_syntax_error` 系だけを切り出して確認。',
        preconditions: [
            'popup を開く前に拡張をリロードする',
            'Service Worker Console を開いてエラーログを確認できる状態にする',
            '通常シナリオに戻すため、必要なら backup 復元を使える状態にしておく'
        ],
        popupSettings: [
            { label: 'URL', value: NISSAN_TEST_URL_IN_STOCK },
            { label: 'セレクタ', value: NISSAN_TEST_SELECTOR_INVALID },
            { label: 'キーワード', value: NISSAN_TEST_KEYWORD_IN_STOCK },
            { label: '検知方法', value: '出現検知' },
            { label: '開始直後判定', value: 'OFF' },
            { label: '監視間隔 / 時間', value: '20秒 / 60秒' },
            { label: '保存内容', value: 'ページソースON / フッター除外OFF / スクリーンショットON' }
        ],
        cautions: [
            '成功通知ではなく異常系切り分けが目的',
            '確認後は backup 復元か別シナリオ適用で戻す',
            '主確認は `selector_syntax_error` と停止ログ'
        ],
        showDevtoolsCode: false,
        showExtraDevtoolsCode: false,
        expectedResults: [
            '無効セレクタでもテストタブ表示は崩れない',
            '`selector_syntax_error` と停止ログを確認できる',
            'error 確認後も backup を復元できる',
            'getStatus 正規化や updateStatus に副作用が出ない'
        ],
        config: {
            url: NISSAN_TEST_URL_IN_STOCK,
            settings: {
                monitorSelector: NISSAN_TEST_SELECTOR_INVALID,
                monitorKeyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                detectMode: 'appear',
                initialKeywordDetection: false
            }
        }
    },

    // シナリオ8: Gmail 検知通知 E2E テスト
    gmail_notification_check: {
        id: 'gmail_notification_check',
        groupId: 'notifications',
        supportsAutoJudgement: true,
        label: '8. Gmail 検知通知: 検知 → メール送信確認',
        title: '8. Gmail 検知通知: 検知 → メール送信確認',
        description: 'Gmail 通知が有効かつ認証済みの状態で検知を自動再現し、Gmail API の送信成功まで自動判定する。',
        goal: '検知発生時に Gmail API 送信成功まで自動判定し、メール到着は手動で確認。',
        preconditions: [
            'Google Cloud Console で Gmail API が有効',
            'manifest の Chrome 拡張機能 OAuth client ID に現在の拡張機能 ID が登録済み',
            'popup の「Gmail 通知」で有効 + 送信先設定済み + 認証済み（テストメール送信で確認）',
            '拡張機能をリロードし、Service Worker Console を開いておく',
            '日産オンラインショップ 6810 ページの対象DOMを取得できる状態'
        ],
        popupSettings: [
            { label: 'Gmail 通知', value: '有効' },
            { label: '送信先', value: '設定済み' },
            { label: '認証状態', value: '認証済み（テストメール送信成功）' },
            { label: '監視URL', value: NISSAN_TEST_URL_IN_STOCK },
            { label: 'セレクタ', value: NISSAN_TEST_SELECTOR_PRODUCT_STATUS },
            { label: 'キーワード', value: NISSAN_TEST_KEYWORD_APPEAR },
            { label: '検知方法', value: '出現検知' },
            { label: '開始直後判定', value: 'OFF（リロード後に自動再現）' }
        ],
        cautions: [
            '設定・認証が未確認の場合は通常監視を開始せず「要確認」とし、テストメール送信を案内する',
            '自動判定は Gmail API の送信成功まで。受信箱への到着・本文は手動確認が必要',
            '既存の保存・Chrome 通知・外部拡張通知も従来どおり完了することを合わせて確認'
        ],
        devtoolsLabel: 'ページ状態の確認コード',
        devtoolsDescription: TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION,
        devtoolsCode: NISSAN_TEST_SELECTOR_INSPECT_CODE,
        showDevtoolsCode: false,
        extraDevtoolsLabel: '検知を再現するコード',
        extraDevtoolsDescription: '自動判定では対象ページへテスト用キーワードを自動再現する。手動確認時だけ使用する。',
        extraDevtoolsCode: NISSAN_TEST_MANUAL_APPEAR_CODE,
        showExtraDevtoolsCode: true,
        expectedResults: [
            '検知が発生する',
            '今回の実行IDに対応する Gmail API 送信成功が結果カードに表示される',
            '送信先へのメール到着と本文は手動で確認する',
            'HTML 保存、スクリーンショット保存、Chrome 通知も従来どおり完了'
        ],
        config: {
            url: NISSAN_TEST_URL_IN_STOCK,
            settings: {
                monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                monitorKeyword: NISSAN_TEST_KEYWORD_APPEAR,
                detectMode: 'appear',
                initialKeywordDetection: false
            }
        }
    },
    chrome_notification_check: {
        id: 'chrome_notification_check',
        groupId: 'notifications',
        supportsAutoJudgement: true,
        label: '9. 共有Chrome通知を表示する',
        title: '9. 共有Chrome通知を表示する',
        description: '共有通知ポリシーを直接実行し、Chrome通知とService Workerログを確認する。通常監視・保存・Gmail・外部拡張通知は実行しない。',
        goal: 'OS通知と `[chrome-notify] 通知作成成功` を確認する。',
        preconditions: [
            'Chromeの通知許可が有効であること',
            'Service Worker Consoleを開いてログを確認できること'
        ],
        popupSettings: [
            { label: '通常監視', value: '開始しない' },
            { label: '保存 / Gmail / 外部拡張通知', value: '実行しない' }
        ],
        cautions: ['OS側の集中モードやChrome通知設定によりバナーが抑止される場合がある'],
        showDevtoolsCode: false,
        showExtraDevtoolsCode: false,
        expectedResults: [
            '「在庫を検知」のChrome通知が1回表示される',
            'Service Worker Consoleに `[chrome-notify] 通知作成成功` が出る',
            '通常監視・保存・Gmail・外部拡張通知が開始されない'
        ],
        config: {
            url: NISSAN_TEST_URL_IN_STOCK,
            settings: {
                monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                monitorKeyword: NISSAN_TEST_KEYWORD_APPEAR,
                detectMode: 'appear',
                initialKeywordDetection: false
            }
        }
    }
};

function createMultipleGmailTestScenario(id, expectedGmailCount, groupId) {
    const configs = Array.from({ length: expectedGmailCount }, (_, index) => ({
        id: `test-multi-gmail-${expectedGmailCount}-${index + 1}`,
        name: `日産6710 Gmail ${index + 1}`,
        url: index === 0 ? NISSAN_TEST_URL_OUT_OF_STOCK : `${NISSAN_TEST_URL_OUT_OF_STOCK}?ref=gmail-${index + 1}`,
        keyword: NISSAN_TEST_KEYWORD_IN_STOCK,
        selector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
        detection_mode: 'appear', enabled: true,
        settings: {
            monitorKeyword: NISSAN_TEST_KEYWORD_IN_STOCK,
            monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
            detectMode: 'appear', initialKeywordDetection: false,
            interval: 2, duration: 60, reloadWaitAfterReload: 2,
            downloadSource: true, downloadSourceWithoutFooter: false, downloadScreenshot: true
        }
    }));
    return {
        id, groupId, requiresGmail: true, expectedGmailCount,
        // 旧シナリオ5（待機中の満了）を削除したため、通常監視フロー4件の後ろに5・6として並べる。
        label: `${expectedGmailCount + 4}. Gmail 検知送信 ${expectedGmailCount}件`,
        title: `Gmail 検知送信 ${expectedGmailCount}件`,
        description: `在庫なし固定 URL ${expectedGmailCount} 件を自動再現し、Gmail API 送信成功 ${expectedGmailCount} 件を確認する。`,
        goal: `異なる設定 ID の Gmail API 送信成功を ${expectedGmailCount} 件確認する。`,
        preconditions: ['Gmail 通知を有効にする', '有効な送信先を設定する', 'テストメール送信を成功させる'],
        popupSettings: [
            { label: 'Gmail 通知', value: '有効' },
            { label: '送信先', value: '設定済み' },
            { label: '認証状態', value: '認証済み（テストメール送信成功）' },
            ...configs.map((config, index) => ({
                label: `監視対象${index + 1}`,
                value: `${config.url} / ${config.keyword} / 出現検知`
            })),
            { label: 'セレクタ', value: NISSAN_TEST_SELECTOR_PRODUCT_STATUS },
            { label: '検知方法', value: '出現検知' },
            { label: '開始直後判定', value: 'OFF（リロード後に自動再現）' },
            { label: 'リロード後待機', value: '2秒（自動DOM再現）' },
            { label: '共通監視間隔 / 時間', value: '2秒 / 60秒' },
            { label: '保存内容', value: 'ページソースON / フッター除外OFF / スクリーンショットON' },
            { label: '自動 DOM 再現', value: '有効' },
            { label: '期待 Gmail API 成功', value: `${expectedGmailCount} 件` }
        ],
        cautions: ['Gmail 専用シナリオ以外は送信を抑止する', '受信箱への到着と本文は手動で確認する'],
        devtoolsLabel: 'ページ状態の確認コード', devtoolsDescription: TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION,
        devtoolsCode: NISSAN_TEST_SELECTOR_INSPECT_CODE, showExtraDevtoolsCode: false,
        expectedResults: [`Gmail API 送信成功が設定 ID 重複なしで ${expectedGmailCount} 件表示される`, '受信箱の到着・本文は手動で確認する'],
        config: {
            multiple_common_settings: { detectMode: 'appear', initialKeywordDetection: false, reloadWaitAfterReload: 2, interval: 2, duration: 60, stopCondition: 'time' },
            multiple_configs: configs
        }
    };
}

const MULTIPLE_TEST_SCENARIOS = {
    baseline_two_urls: {
        id: 'baseline_two_urls',
        groupId: 'monitoring',
        label: '1. 在庫なし2件で継続監視を開始する',
        title: '1. 在庫なし2件で継続監視を開始する',
        description: '在庫なし 2 件の固定設定を `multiple` 用に保存する。',
        goal: '2 件とも未一致のまま継続監視へ進むことを確認。',
        preconditions: [
            'popup を開く前に拡張をリロードする',
            'Service Worker Console を開いて一括開始/停止ログを見られる状態にする',
            '日産オンラインショップ 6710 ページ 2 件がどちらも在庫なし状態であることを確認する'
        ],
        popupSettings: [
            { label: '監視対象1', value: `6710 / ${NISSAN_TEST_KEYWORD_IN_STOCK} / 出現検知` },
            { label: '監視対象2', value: `6710?ref=multi / ${NISSAN_TEST_KEYWORD_IN_STOCK} / 出現検知` },
            { label: 'セレクタ', value: NISSAN_TEST_SELECTOR_PRODUCT_STATUS },
            { label: '検知方法', value: '出現検知' },
            { label: '開始直後判定', value: 'OFF' },
            { label: 'リロード後待機', value: '0秒（待機なし）' },
            { label: '共通監視間隔 / 時間', value: '20秒 / 60秒' },
            { label: '保存内容', value: 'ページソースON / フッター除外OFF / スクリーンショットON' }
        ],
        cautions: [
            '固定 2 件は保存済みテスト状態として別管理する',
            '開始前に `count` と `items` を確認する'
        ],
        devtoolsLabel: 'ページ状態の確認コード',
        devtoolsDescription: TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION,
        devtoolsCode: NISSAN_TEST_SELECTOR_INSPECT_CODE,
        expectedResults: [
            '`multiple に適用` 後、保存だけ完了する',
            '詳細カードが在庫なし 2 件の継続監視向けになる',
            '`multiple テスト開始` で保存済み 2 件だけ開始される',
            '監視対象リストは本番 `multiple_configs` のまま'
        ],
        config: {
            multiple_common_settings: {
                detectMode: 'appear',
                initialKeywordDetection: false,
                reloadWaitAfterReload: 0,
                interval: 20,
                duration: 60,
                stopCondition: 'time'
            },
            multiple_configs: [
                {
                    id: 'test-multi-6710-a',
                    name: '日産6710 baseline A',
                    url: NISSAN_TEST_URL_OUT_OF_STOCK,
                    keyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                    selector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                    detection_mode: 'appear',
                    enabled: true,
                    settings: {
                        monitorKeyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                        monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                        detectMode: 'appear',
                        initialKeywordDetection: false,
                        interval: 20,
                        duration: 60,
                        reloadWaitAfterReload: 0,
                        downloadSource: true,
                        downloadSourceWithoutFooter: false,
                        downloadScreenshot: true
                    }
                },
                {
                    id: 'test-multi-6710-b',
                    name: '日産6710 baseline B',
                    url: `${NISSAN_TEST_URL_OUT_OF_STOCK}?ref=multi`,
                    keyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                    selector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                    detection_mode: 'appear',
                    enabled: true,
                    settings: {
                        monitorKeyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                        monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                        detectMode: 'appear',
                        initialKeywordDetection: false,
                        interval: 20,
                        duration: 60,
                        reloadWaitAfterReload: 0,
                        downloadSource: true,
                        downloadSourceWithoutFooter: false,
                        downloadScreenshot: true
                    }
                }
            ]
        }
    },
    initial_detected_two_urls: {
        id: 'initial_detected_two_urls',
        groupId: 'monitoring',
        label: '2. 在庫あり2件で開始直後に一致する',
        title: '2. 在庫あり2件で開始直後に一致する',
        description: '在庫あり 2 件で開始直後一致を確認する固定設定を保存する。',
        goal: '開始直後判定 ON で 2 件とも初回一致になることを確認。',
        preconditions: [
            'popup を開く前に拡張をリロードする',
            'Service Worker Console を開いて初回判定ログを確認できる状態にする',
            '日産オンラインショップ 6810 ページ 2 件に「在庫あり」が表示されていることを確認する'
        ],
        popupSettings: [
            { label: '監視対象1', value: `6810 / ${NISSAN_TEST_KEYWORD_IN_STOCK} / 出現検知` },
            { label: '監視対象2', value: `6810?ref=multi / ${NISSAN_TEST_KEYWORD_IN_STOCK} / 出現検知` },
            { label: 'セレクタ', value: NISSAN_TEST_SELECTOR_PRODUCT_STATUS },
            { label: '検知方法', value: '出現検知' },
            { label: '開始直後判定', value: 'ON' },
            { label: 'リロード後待機', value: '0秒（待機なし）' },
            { label: '共通監視間隔 / 時間', value: '20秒 / 60秒' },
            { label: '保存内容', value: 'ページソースON / フッター除外OFF / スクリーンショットON' }
        ],
        cautions: [
            '開始直後に判定が走るため、直後はログ確認を優先',
            '固定 2 件は保存済みテスト状態として別管理する'
        ],
        devtoolsLabel: 'ページ状態の確認コード',
        devtoolsDescription: TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION,
        devtoolsCode: NISSAN_TEST_SELECTOR_INSPECT_CODE,
        expectedResults: [
            '詳細カードの開始直後判定が ON になる',
            '初回判定で 2 件とも「在庫あり」が一致扱いになる',
            '追加待機なしでリロード後判定へ進む',
            '本番 `multiple_configs` は変更されない'
        ],
        config: {
            multiple_common_settings: {
                detectMode: 'appear',
                initialKeywordDetection: true,
                reloadWaitAfterReload: 0,
                interval: 20,
                duration: 60,
                stopCondition: 'time'
            },
            multiple_configs: [
                {
                    id: 'test-multi-6810-a',
                    name: '日産6810 initial detected A',
                    url: NISSAN_TEST_URL_IN_STOCK,
                    keyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                    selector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                    detection_mode: 'appear',
                    enabled: true,
                    settings: {
                        monitorKeyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                        monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                        detectMode: 'appear',
                        initialKeywordDetection: true,
                        interval: 20,
                        duration: 60,
                        reloadWaitAfterReload: 0,
                        downloadSource: true,
                        downloadSourceWithoutFooter: false,
                        downloadScreenshot: true
                    }
                },
                {
                    id: 'test-multi-6810-b',
                    name: '日産6810 initial detected B',
                    url: `${NISSAN_TEST_URL_IN_STOCK}?ref=multi`,
                    keyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                    selector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                    detection_mode: 'appear',
                    enabled: true,
                    settings: {
                        monitorKeyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                        monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                        detectMode: 'appear',
                        initialKeywordDetection: true,
                        interval: 20,
                        duration: 60,
                        reloadWaitAfterReload: 0,
                        downloadSource: true,
                        downloadSourceWithoutFooter: false,
                        downloadScreenshot: true
                    }
                }
            ]
        }
    },
    initial_not_detected_two_urls: {
        id: 'initial_not_detected_two_urls',
        groupId: 'monitoring',
        label: '3. 在庫なし2件で開始直後に未一致のまま継続する',
        title: '3. 在庫なし2件で開始直後に未一致のまま継続する',
        description: '在庫なし 2 件で開始直後未一致のまま継続する固定設定を保存する。',
        goal: '開始直後判定 ON でも 2 件とも `not_detected` のまま継続することを確認。',
        preconditions: [
            'popup を開く前に拡張をリロードする',
            'Service Worker Console を開いて初回判定ログを確認できる状態にする',
            '日産オンラインショップ 6710 ページ 2 件に「在庫あり」が存在しないことを確認する'
        ],
        popupSettings: [
            { label: '監視対象1', value: `6710 / ${NISSAN_TEST_KEYWORD_IN_STOCK} / 出現検知` },
            { label: '監視対象2', value: `6710?ref=multi / ${NISSAN_TEST_KEYWORD_IN_STOCK} / 出現検知` },
            { label: 'セレクタ', value: NISSAN_TEST_SELECTOR_PRODUCT_STATUS },
            { label: '検知方法', value: '出現検知' },
            { label: '開始直後判定', value: 'ON' },
            { label: 'リロード後待機', value: '0秒（待機なし）' },
            { label: '共通監視間隔 / 時間', value: '20秒 / 60秒' },
            { label: '保存内容', value: 'ページソースON / フッター除外OFF / スクリーンショットON' }
        ],
        cautions: [
            '在庫なしページに対してキーワードは「在庫あり」',
            '固定 2 件は保存済みテスト状態として別管理する'
        ],
        devtoolsLabel: 'ページ状態の確認コード',
        devtoolsDescription: TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION,
        devtoolsCode: NISSAN_TEST_SELECTOR_INSPECT_CODE,
        expectedResults: [
            '詳細カードの開始直後判定が ON になる',
            '初回判定で 2 件とも `not_detected` になる',
            '異常停止せず、そのまま継続監視と定期監視へ進む'
        ],
        config: {
            multiple_common_settings: {
                detectMode: 'appear',
                initialKeywordDetection: true,
                reloadWaitAfterReload: 0,
                interval: 20,
                duration: 60,
                stopCondition: 'time'
            },
            multiple_configs: [
                {
                    id: 'test-multi-6710-initial-not-detected-a',
                    name: '日産6710 initial not detected A',
                    url: NISSAN_TEST_URL_OUT_OF_STOCK,
                    keyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                    selector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                    detection_mode: 'appear',
                    enabled: true,
                    settings: {
                        monitorKeyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                        monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                        detectMode: 'appear',
                        initialKeywordDetection: true,
                        interval: 20,
                        duration: 60,
                        reloadWaitAfterReload: 0,
                        downloadSource: true,
                        downloadSourceWithoutFooter: false,
                        downloadScreenshot: true
                    }
                },
                {
                    id: 'test-multi-6710-initial-not-detected-b',
                    name: '日産6710 initial not detected B',
                    url: `${NISSAN_TEST_URL_OUT_OF_STOCK}?ref=multi`,
                    keyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                    selector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                    detection_mode: 'appear',
                    enabled: true,
                    settings: {
                        monitorKeyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                        monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                        detectMode: 'appear',
                        initialKeywordDetection: true,
                        interval: 20,
                        duration: 60,
                        reloadWaitAfterReload: 0,
                        downloadSource: true,
                        downloadSourceWithoutFooter: false,
                        downloadScreenshot: true
                    }
                }
            ]
        }
    },
    auto_appear_two_urls: {
        id: 'auto_appear_two_urls',
        groupId: 'monitoring',
        supportsAutoReproduce: true,
        label: '4. 在庫なし2件で在庫状態を変えて検知する',
        title: '4. 在庫なし2件で在庫状態を変えて検知する',
        description: '在庫なし 2 件を手動で「在庫あり」に変更し、両方の出現検知を再現する固定設定を保存する。',
        goal: '2 件の監視タブで手動変更後、どちらも検知・保存・監視停止することを確認。',
        preconditions: [
            'popup を開く前に拡張をリロードする',
            'Service Worker Console を開いて手動テストコードの受付時間を確認できる状態にする',
            '日産オンラインショップ 6710 ページ 2 件がどちらも在庫なし状態であることを確認する'
        ],
        popupSettings: [
            { label: '監視対象1', value: `6710 / ${NISSAN_TEST_KEYWORD_IN_STOCK} / 出現検知` },
            { label: '監視対象2', value: `6710?ref=multi / ${NISSAN_TEST_KEYWORD_IN_STOCK} / 出現検知` },
            { label: 'セレクタ', value: NISSAN_TEST_SELECTOR_PRODUCT_STATUS },
            { label: '検知方法', value: '出現検知' },
            { label: '開始直後判定', value: 'OFF' },
            { label: 'リロード後待機', value: '15秒（手動変更用）' },
            { label: '共通監視間隔 / 時間', value: '20秒 / 60秒' },
            { label: '保存内容', value: 'ページソースON / フッター除外OFF / スクリーンショットON' }
        ],
        cautions: [
            '監視タブ 2 件のそれぞれで再現コードを実行する',
            'Service Worker Console の「🧪 手動テストコードを実行できます」表示中に実行する',
            '変更は DOM 上だけで、ページを再読み込みすると在庫なし表示へ戻る'
        ],
        devtoolsLabel: 'ページ状態の確認コード',
        devtoolsDescription: TEST_SCENARIO_PAGE_STATE_CHECK_DESCRIPTION,
        devtoolsCode: NISSAN_TEST_SELECTOR_INSPECT_CODE,
        extraDevtoolsLabel: '検知を再現するコード',
        extraDevtoolsDescription: '変更対象: 2 件の監視タブそれぞれで一致した対象テキストを「在庫あり」へ変更する。実行タイミング: 各タブで監視開始後、Service Worker Console に「🧪 手動テストコードを実行できます」が表示されている間。ページを再読み込みすると元に戻る。',
        extraDevtoolsCode: NISSAN_TEST_MANUAL_APPEAR_CODE,
        expectedResults: [
            '2 件の監視タブそれぞれで「在庫あり」への変更後に出現検知される',
            '2 件ともスクリーンショットと HTML が保存される',
            '2 件とも検知後に監視が停止する',
            '本番 `multiple_configs` は変更されない'
        ],
        config: {
            multiple_common_settings: {
                detectMode: 'appear',
                initialKeywordDetection: false,
                reloadWaitAfterReload: 15,
                interval: 20,
                duration: 60,
                stopCondition: 'time'
            },
            multiple_configs: [
                {
                    id: 'test-multi-6710-manual-appear-a',
                    name: '日産6710 manual appear A',
                    url: NISSAN_TEST_URL_OUT_OF_STOCK,
                    keyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                    selector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                    detection_mode: 'appear',
                    enabled: true,
                    settings: {
                        monitorKeyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                        monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                        detectMode: 'appear',
                        initialKeywordDetection: false,
                        interval: 20,
                        duration: 60,
                        reloadWaitAfterReload: 15,
                        downloadSource: true,
                        downloadSourceWithoutFooter: false,
                        downloadScreenshot: true
                    }
                },
                {
                    id: 'test-multi-6710-manual-appear-b',
                    name: '日産6710 manual appear B',
                    url: `${NISSAN_TEST_URL_OUT_OF_STOCK}?ref=multi`,
                    keyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                    selector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                    detection_mode: 'appear',
                    enabled: true,
                    settings: {
                        monitorKeyword: NISSAN_TEST_KEYWORD_IN_STOCK,
                        monitorSelector: NISSAN_TEST_SELECTOR_PRODUCT_STATUS,
                        detectMode: 'appear',
                        initialKeywordDetection: false,
                        interval: 20,
                        duration: 60,
                        reloadWaitAfterReload: 15,
                        downloadSource: true,
                        downloadSourceWithoutFooter: false,
                        downloadScreenshot: true
                    }
                }
            ]
        }
    },
    gmail_notification_one_url: createMultipleGmailTestScenario('gmail_notification_one_url', 1, 'notifications'),
    gmail_notification_two_urls: createMultipleGmailTestScenario('gmail_notification_two_urls', 2, 'notifications')
};

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function mergeSingleScenarioConfig(overrides = {}) {
    const baseConfig = deepClone(SINGLE_TEST_SCENARIO_DEFAULTS);
    return {
        ...baseConfig,
        ...overrides,
        url: typeof overrides.url === 'string' ? overrides.url : baseConfig.url,
        settings: {
            ...baseConfig.settings,
            ...(overrides.settings || {})
        }
    };
}

function getSingleScenarioById(scenarioId) {
    return SINGLE_TEST_SCENARIOS[scenarioId] || SINGLE_TEST_SCENARIOS.appear;
}

function getSingleScenarioLabelById(scenarioId) {
    return SINGLE_TEST_SCENARIOS[scenarioId]?.label || '手動設定';
}

function getTestScenarioModeDefinition(mode) {
    if (mode === 'multiple') {
        return {
            scenarios: MULTIPLE_TEST_SCENARIOS,
            defaultScenarioId: 'baseline_two_urls',
            stateKey: 'multiple_test_scenario_state',
            applyButtonLabel: TEST_SCENARIO_APPLY_BUTTON_LABELS.multiple,
            backupNote: TEST_SCENARIO_BACKUP_NOTES.multiple,
            modeDescription: TEST_SCENARIO_MODE_DESCRIPTIONS.multiple
        };
    }

    return {
        scenarios: SINGLE_TEST_SCENARIOS,
        defaultScenarioId: 'appear',
        stateKey: 'single_config_backup',
        applyButtonLabel: TEST_SCENARIO_APPLY_BUTTON_LABELS.single,
        backupNote: TEST_SCENARIO_BACKUP_NOTES.single,
        modeDescription: TEST_SCENARIO_MODE_DESCRIPTIONS.single
    };
}

function buildSingleTestScenarioAppliedConfig(currentConfig, scenario, savedAt = new Date().toISOString()) {
    const nextConfig = currentConfig ? deepClone(currentConfig) : {
        mode: 'single',
        single_config: mergeSingleScenarioConfig(),
        multiple_configs: []
    };
    const previousSingleConfig = nextConfig.single_config
        ? deepClone(nextConfig.single_config)
        : mergeSingleScenarioConfig();

    nextConfig.single_config_backup = {
        config: previousSingleConfig,
        saved_at: savedAt,
        source_scenario_id: scenario.id,
        source_scenario_mode: 'single'
    };
    nextConfig.single_config = mergeSingleScenarioConfig(scenario.config);
    nextConfig.mode = 'single';
    nextConfig.last_updated = savedAt;
    return nextConfig;
}

function buildMultipleTestScenarioAppliedConfig(currentConfig, scenario, savedAt = new Date().toISOString()) {
    const nextConfig = currentConfig ? deepClone(currentConfig) : {
        mode: 'multiple',
        single_config: mergeSingleScenarioConfig(),
        multiple_configs: [],
        multiple_common_settings: {}
    };

    nextConfig.multiple_test_scenario_state = {
        scenario_id: scenario.id,
        scenario_mode: 'multiple',
        configs: deepClone(scenario.config.multiple_configs || []),
        common_settings: deepClone(scenario.config.multiple_common_settings || {}),
        saved_at: savedAt
    };
    nextConfig.mode = 'multiple';
    nextConfig.last_updated = savedAt;
    return nextConfig;
}

function getTestScenarioByModeAndId(mode, scenarioId) {
    const definition = getTestScenarioModeDefinition(mode);
    return definition.scenarios[scenarioId] || definition.scenarios[definition.defaultScenarioId];
}

function getTestScenarioLabelByModeAndId(mode, scenarioId) {
    return getTestScenarioByModeAndId(mode, scenarioId)?.label || '手動設定';
}

function resolveSelectedTestScenarioId(mode = selectedTestScenarioMode) {
    const definition = getTestScenarioModeDefinition(mode);
    const fallbackScenarioId = definition.defaultScenarioId;

    if (typeof selectedTestScenarioId !== 'string' || !definition.scenarios[selectedTestScenarioId]) {
        return fallbackScenarioId;
    }

    return selectedTestScenarioId;
}

function resolveStoredMultipleTestScenarioId(state) {
    const definition = getTestScenarioModeDefinition('multiple');
    const scenarioId = typeof state?.scenario_id === 'string' ? state.scenario_id : '';
    return definition.scenarios[scenarioId]
        ? scenarioId
        : definition.defaultScenarioId;
}

function restoreSelectedMultipleTestScenarioId(state) {
    if (selectedTestScenarioMode !== 'multiple') {
        return resolveSelectedTestScenarioId('multiple');
    }

    selectedTestScenarioId = resolveStoredMultipleTestScenarioId(state);
    return selectedTestScenarioId;
}

function buildMultipleScenarioConfig(scenarioOverrides = {}) {
    return {
        mode: 'multiple',
        multiple_common_settings: deepClone(scenarioOverrides.multiple_common_settings || {}),
        multiple_configs: deepClone(scenarioOverrides.multiple_configs || [])
    };
}

function renderTestScenarioSelectOptions(mode) {
    if (!elements?.testScenarioSelect) {
        return;
    }

    const definition = getTestScenarioModeDefinition(mode);
    const scenarios = Object.values(definition.scenarios);
    const renderOption = (scenario) => `<option value="${escapeHtml(scenario.id)}">${escapeHtml(scenario.label)}</option>`;
    const scenarioGroups = mode === 'single'
        ? SINGLE_TEST_SCENARIO_GROUPS
        : mode === 'multiple'
            ? MULTIPLE_TEST_SCENARIO_GROUPS
            : null;
    const optionsHtml = scenarioGroups
        ? scenarioGroups
            .map((group) => {
                const groupOptions = scenarios
                    .filter((scenario) => scenario.groupId === group.id)
                    .map(renderOption)
                    .join('');
                return groupOptions
                    ? `<optgroup label="${escapeHtml(group.label)}">${groupOptions}</optgroup>`
                    : '';
            })
            .join('')
        : scenarios.map(renderOption).join('');

    elements.testScenarioSelect.innerHTML = optionsHtml;
}

function renderTestScenarioModeUI(mode) {
    if (elements?.testScenarioModeOptions?.length) {
        elements.testScenarioModeOptions.forEach((button) => {
            button.classList.toggle('active', button.dataset.testScenarioMode === mode);
        });
    }
    const isScheduledWatchTest = mode === 'scheduled';
    const isAcceptanceTest = mode === 'acceptance';
    const isStockFetchDiagnosis = mode === 'diagnosis';
    if (elements?.testScenarioPanel) {
        elements.testScenarioPanel.hidden = isScheduledWatchTest || isAcceptanceTest || isStockFetchDiagnosis;
    }
    if (elements?.scheduledWatchTestPanel) {
        elements.scheduledWatchTestPanel.hidden = !isScheduledWatchTest;
    }
    if (elements?.twoTierAcceptanceTestPanel) {
        elements.twoTierAcceptanceTestPanel.hidden = !isAcceptanceTest;
    }
    if (elements?.stockFetchDiagnosisTestPanel) {
        elements.stockFetchDiagnosisTestPanel.hidden = !isStockFetchDiagnosis;
    }
    if (isScheduledWatchTest || isAcceptanceTest || isStockFetchDiagnosis) {
        return;
    }

    const definition = getTestScenarioModeDefinition(mode);
    if (elements?.testScenarioModeDescription) {
        elements.testScenarioModeDescription.textContent = definition.modeDescription;
    }
    if (elements?.applyTestScenarioButton) {
        elements.applyTestScenarioButton.textContent = definition.applyButtonLabel;
    }
    if (elements?.startTestScenarioButton) {
        elements.startTestScenarioButton.textContent =
            TEST_SCENARIO_START_BUTTON_LABELS[mode] || TEST_SCENARIO_START_BUTTON_LABELS.single;
        elements.startTestScenarioButton.hidden = false;
        elements.startTestScenarioButton.disabled = false;
    }
    if (elements?.testBackupNote) {
        elements.testBackupNote.textContent = definition.backupNote;
    }
    if (elements?.restoreTestScenarioButton) {
        elements.restoreTestScenarioButton.disabled = mode === 'multiple';
        elements.restoreTestScenarioButton.hidden = mode === 'multiple';
    }
}

function isSelectedInitialDetectedAutoJudgement() {
    return selectedTestScenarioMode === 'single' &&
        getSingleScenarioById(resolveSelectedTestScenarioId('single')).supportsAutoJudgement === true;
}

// 判定はすべて自動で行うため、切り替えは「検知の再現を自動にするか手動にするか」を表す。
function renderTestScenarioExecutionMode() {
    const selector = elements?.testScenarioExecutionModeSelector;
    const indicator = elements?.testScenarioExecutionMode;
    const isMonitoringScenarioMode = ['single', 'multiple'].includes(selectedTestScenarioMode);

    if (selector) {
        selector.hidden = !isMonitoringScenarioMode;
        selector.querySelectorAll('[data-test-scenario-execution-mode]').forEach((button) => {
            button.classList.toggle(
                'active',
                button.dataset.testScenarioExecutionMode === testTabReproductionMode
            );
        });
    }
    if (indicator) {
        indicator.textContent = testTabReproductionMode === 'manual'
            ? '検知の再現: 手動（基準取得後の20秒の受付時間中に、DevTools でコードを実行します。判定は自動）'
            : '検知の再現: 自動（基準取得後に拡張が在庫状態の文言を変えます。判定は自動）';
    }
    if (elements?.startTestScenarioButton && isMonitoringScenarioMode) {
        elements.startTestScenarioButton.textContent = 'テスト開始（自動判定）';
    }
}

function renderChecklist(container, items = []) {
    if (!container) {
        return;
    }

    container.innerHTML = (items || [])
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('');
}

function renderPopupSettings(container, settings = []) {
    if (!container) {
        return;
    }

    container.innerHTML = (settings || [])
        .map(({ label, value }) => (
            `<div class="setting-row"><div class="setting-label">${escapeHtml(label)}</div><div class="setting-value">${escapeHtml(value)}</div></div>`
        ))
        .join('');
}

function renderCodeBlock(labelElement, codeElement, buttonElement, label, code) {
    if (labelElement) {
        labelElement.textContent = label || 'DevToolsコード';
    }
    if (codeElement) {
        codeElement.textContent = code || '';
    }
    if (buttonElement) {
        buttonElement.textContent = 'コピー';
        buttonElement.disabled = !code;
    }
}

function renderTestScenarioGoal(scenario) {
    if (elements?.testScenarioGoal) {
        elements.testScenarioGoal.textContent = scenario.goal || '';
    }
}

function renderTestScenarioPreconditions(scenario) {
    renderChecklist(elements?.testScenarioPreconditions, scenario.preconditions);
}

function renderTestScenarioPopupSettings(scenario) {
    renderPopupSettings(elements?.testScenarioPopupSettings, scenario.popupSettings);
}

function renderTestScenarioCautions(scenario) {
    renderChecklist(elements?.testScenarioCautions, scenario.cautions);
}

function renderTestScenarioDevtoolsCode(scenario) {
    const shouldShow = scenario.showDevtoolsCode !== false &&
        Boolean(scenario.devtoolsCode) && Boolean(scenario.devtoolsDescription);

    if (elements?.testScenarioDevtoolsSection) {
        elements.testScenarioDevtoolsSection.style.display = shouldShow ? 'block' : 'none';
    }
    if (!shouldShow) {
        return;
    }

    if (elements?.testScenarioDevtoolsDescription) {
        elements.testScenarioDevtoolsDescription.textContent = scenario.devtoolsDescription;
    }

    renderCodeBlock(
        elements?.testScenarioDevtoolsLabel,
        elements?.testScenarioDevtoolsCode,
        elements?.copyDevtoolsCodeButton,
        scenario.devtoolsLabel,
        scenario.devtoolsCode
    );
}

function renderTestScenarioExtraDevtoolsCode(scenario) {
    const hasCode = Boolean(scenario.extraDevtoolsCode);
    const hasDescription = Boolean(scenario.extraDevtoolsDescription);
    const shouldShow = scenario.showExtraDevtoolsCode !== false && hasCode && hasDescription;

    if (elements?.testScenarioExtraDevtoolsSection) {
        elements.testScenarioExtraDevtoolsSection.style.display = shouldShow ? 'block' : 'none';
    }
    if (!shouldShow) {
        return;
    }
    if (elements?.testScenarioExtraDevtoolsDescription) {
        elements.testScenarioExtraDevtoolsDescription.textContent = scenario.extraDevtoolsDescription;
    }

    renderCodeBlock(
        elements?.testScenarioExtraDevtoolsLabel,
        elements?.testScenarioExtraDevtoolsCode,
        elements?.copyExtraDevtoolsCodeButton,
        scenario.extraDevtoolsLabel,
        scenario.extraDevtoolsCode
    );
}

function renderTestScenarioAutoReproduce(scenario) {
    const shouldShow = scenario?.supportsAutoReproduce === true;

    if (elements?.testScenarioAutoReproduceSection) {
        elements.testScenarioAutoReproduceSection.style.display = shouldShow ? 'block' : 'none';
    }
    if (elements?.testScenarioAutoReproduce) {
        elements.testScenarioAutoReproduce.checked = false;
    }
}

function renderTestScenarioExpectedResults(scenario) {
    renderChecklist(elements?.testScenarioExpectedResults, scenario.expectedResults);
}

function renderTestScenarioPreview(scenarioId = resolveSelectedTestScenarioId()) {
    const scenario = getTestScenarioByModeAndId(selectedTestScenarioMode, scenarioId);
    selectedTestScenarioId = scenario.id;
    renderTestScenarioModeUI(selectedTestScenarioMode);
    renderTestScenarioSelectOptions(selectedTestScenarioMode);

    if (elements?.testScenarioSelect) {
        elements.testScenarioSelect.value = scenario.id;
    }
    if (elements?.testScenarioTitle) {
        elements.testScenarioTitle.textContent = scenario.title;
    }
    if (elements?.testScenarioDescription) {
        elements.testScenarioDescription.textContent = scenario.description;
    }
    if (!scenario.supportsAutoJudgement) {
        stopInitialDetectedAutoTestPolling();
        renderInitialDetectedAutoTestStatus(null);
    }

    renderTestScenarioExecutionMode();
    renderTestScenarioGoal(scenario);
    renderTestScenarioPreconditions(scenario);
    renderTestScenarioPopupSettings(scenario);
    renderTestScenarioCautions(scenario);
    renderTestScenarioDevtoolsCode(scenario);
    renderTestScenarioExtraDevtoolsCode(scenario);
    renderTestScenarioAutoReproduce(scenario);
    renderTestScenarioExpectedResults(scenario);
    void renderTestTabScenarioSummary();
}

function renderTestBackupState(backup) {
    if (!elements?.testBackupSummary || !elements?.restoreTestScenarioButton) {
        return;
    }

    if (!backup?.config) {
        elements.testBackupSummary.textContent = 'backup: 未保存';
        elements.restoreTestScenarioButton.disabled = true;
        return;
    }

    const scenarioLabel = getTestScenarioLabelByModeAndId(
        backup.source_scenario_mode || selectedTestScenarioMode,
        backup.source_scenario_id
    );
    elements.testBackupSummary.textContent =
        `保存時刻: ${backup.saved_at || '日時不明'}\n適用元: ${scenarioLabel}`;
    elements.restoreTestScenarioButton.disabled = false;
}

function renderMultipleTestScenarioState(state) {
    if (!elements?.testBackupSummary || !elements?.restoreTestScenarioButton) {
        return;
    }
    if (!state?.configs || !Array.isArray(state.configs) || state.configs.length === 0) {
        elements.testBackupSummary.textContent =
            '保存済み: 未保存\n本番一覧: 未変更';
        elements.restoreTestScenarioButton.disabled = true;
        return;
    }

    const scenarioLabel = getTestScenarioLabelByModeAndId('multiple', state.scenario_id);
    elements.testBackupSummary.textContent =
        `保存済み: ${scenarioLabel}\n件数: ${state.configs.length} / 本番一覧: 未変更 / 保存時刻: ${state.saved_at || '日時不明'}`;
    elements.restoreTestScenarioButton.disabled = true;
}

function renderTestModeState(config) {
    if (['scheduled', 'acceptance', 'diagnosis'].includes(selectedTestScenarioMode)) {
        renderTestScenarioModeUI(selectedTestScenarioMode);
        return;
    }
    renderTestScenarioPreview(resolveSelectedTestScenarioId(selectedTestScenarioMode));
    if (selectedTestScenarioMode === 'multiple') {
        renderMultipleTestScenarioState(config?.multiple_test_scenario_state || null);
        return;
    }

    renderTestBackupState(config?.single_config_backup || null);
}

function sendScheduledWatchMessage(message) {
    return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

let scheduledWatchTestStatusPollTimer = null;
const SCHEDULED_WATCH_DIFF_TEST_OPTIONS_KEY = 'scheduledWatchDiffTestOptions';
let scheduledWatchStatusPollTimer = null;
let scheduledWatchStatusRefreshPromise = null;
let monitoringExecutionHistoryPollTimer = null;

function stopMonitoringExecutionHistoryPolling() {
    if (monitoringExecutionHistoryPollTimer === null) return;
    clearInterval(monitoringExecutionHistoryPollTimer);
    monitoringExecutionHistoryPollTimer = null;
}

function formatMonitoringExecutionTimestamp(value, fallback = '未記録') {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? fallback
        : date.toLocaleString('ja-JP', { hour12: false });
}

function formatMonitoringExecutionInterval(intervalMs) {
    if (!Number.isFinite(intervalMs)) return '初回';
    return `${(intervalMs / 1000).toFixed(1)}秒`;
}

function getMonitoringExecutionStatusLabel(status) {
    return ({ running: '実行中', success: '成功', completed: '完了', failed: '失敗', needs_review: '要確認' })[status] || status || '未記録';
}

function getMonitoringExecutionHistoryDetailsState(container) {
    const states = new Map();
    if (!container?.querySelectorAll) return states;
    container.querySelectorAll('details[data-monitoring-history-key]').forEach((details) => {
        const historyKey = details.dataset?.monitoringHistoryKey;
        if (historyKey) states.set(historyKey, details.open === true);
    });
    return states;
}

function renderMonitoringExecutionHistory(histories = {}) {
    const container = elements?.monitoringExecutionHistoryList;
    if (!container) return;
    const detailsStates = getMonitoringExecutionHistoryDetailsState(container);
    const entries = Object.entries(histories).sort(([, a], [, b]) =>
        new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime());
    if (!entries.length) {
        container.textContent = '表示できる実行履歴はありません';
        return;
    }
    container.innerHTML = entries.map(([historyKey, entry]) => {
        const checks = Array.isArray(entry.checks) ? entry.checks : [];
        const rows = checks.length
            ? checks.map((check, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(formatMonitoringExecutionTimestamp(check.startedAt))}</td><td>${escapeHtml(formatMonitoringExecutionInterval(check.intervalMs))}</td><td>${escapeHtml(check.captureMode || '-')}</td><td>${escapeHtml(check.result || '-')}</td><td>${escapeHtml(check.detail || '-')}</td></tr>`).join('')
            : '<tr><td colspan="6">まだチェックされていません</td></tr>';
        const latest = checks.at(-1);
        const isDetailsOpen = detailsStates.has(historyKey)
            ? detailsStates.get(historyKey)
            : entry.status === 'running';
        return `<section class="scheduled-watch-execution-card status-${entry.status === 'success' ? 'passed' : entry.status === 'running' ? 'running' : 'needs-review'}">
            <div class="scheduled-watch-execution-header"><span class="scheduled-watch-execution-badge">${escapeHtml(getMonitoringExecutionStatusLabel(entry.status))}</span><span>${escapeHtml(entry.scope || '監視')}</span></div>
            <div class="scheduled-watch-execution-detail"><span class="scheduled-watch-execution-detail-label">対象</span><span>${escapeHtml(entry.targetName || entry.targetUrl || entry.targetId || '監視対象')}</span></div>
            <div class="scheduled-watch-execution-detail"><span class="scheduled-watch-execution-detail-label">開始〜終了</span><span>${escapeHtml(formatMonitoringExecutionTimestamp(entry.startedAt))} 〜 ${escapeHtml(formatMonitoringExecutionTimestamp(entry.completedAt, entry.status === 'running' ? '実行中' : '未記録'))}</span></div>
            <div class="scheduled-watch-execution-metrics"><div class="scheduled-watch-execution-metric"><span class="scheduled-watch-execution-metric-label">設定間隔</span><span class="scheduled-watch-execution-metric-value">${Number(entry.intervalSeconds || 0)}秒</span></div><div class="scheduled-watch-execution-metric"><span class="scheduled-watch-execution-metric-label">取得方式</span><span class="scheduled-watch-execution-metric-value">${escapeHtml(entry.effectiveCaptureMode || entry.requestedCaptureMode || '-')}</span></div><div class="scheduled-watch-execution-metric"><span class="scheduled-watch-execution-metric-label">チェック</span><span class="scheduled-watch-execution-metric-value">${checks.length}回</span></div><div class="scheduled-watch-execution-metric"><span class="scheduled-watch-execution-metric-label">直近実測</span><span class="scheduled-watch-execution-metric-value">${escapeHtml(formatMonitoringExecutionInterval(latest?.intervalMs))}</span></div></div>
            <details data-monitoring-history-key="${escapeHtml(historyKey)}"${isDetailsOpen ? ' open' : ''}><summary>チェック履歴を表示</summary><div style="overflow-x:auto;"><table class="monitoring-execution-history-table"><thead><tr><th>#</th><th>開始時刻</th><th>実測間隔</th><th>方式</th><th>結果</th><th>詳細</th></tr></thead><tbody>${rows}</tbody></table></div></details>
        </section>`;
    }).join('');
}

async function refreshMonitoringExecutionHistory() {
    const response = await new Promise((resolve) => chrome.runtime.sendMessage({ action: 'getMonitoringExecutionHistory' }, resolve));
    if (!response?.success) throw new Error(response?.error || '実行履歴の取得に失敗しました');
    const histories = response.histories || {};
    renderMonitoringExecutionHistory(histories);
    if (Object.values(histories).some((entry) => entry.status === 'running')) {
        if (monitoringExecutionHistoryPollTimer === null) {
            monitoringExecutionHistoryPollTimer = setInterval(() => {
                refreshMonitoringExecutionHistory().catch((error) => console.warn('実行履歴の自動更新に失敗:', error));
            }, 1000);
        }
    } else {
        stopMonitoringExecutionHistoryPolling();
    }
    return histories;
}

function stopScheduledWatchStatusPolling() {
    if (scheduledWatchStatusPollTimer === null) return;
    clearInterval(scheduledWatchStatusPollTimer);
    scheduledWatchStatusPollTimer = null;
}

async function refreshScheduledWatchSitesSafely() {
    if (scheduledWatchStatusRefreshPromise) {
        return scheduledWatchStatusRefreshPromise;
    }

    scheduledWatchStatusRefreshPromise = refreshScheduledWatchSites();
    try {
        return await scheduledWatchStatusRefreshPromise;
    } finally {
        scheduledWatchStatusRefreshPromise = null;
    }
}

function startScheduledWatchStatusPolling() {
    if (scheduledWatchStatusPollTimer !== null) return;
    scheduledWatchStatusPollTimer = setInterval(async () => {
        try {
            await refreshScheduledWatchSitesSafely();
        } catch (error) {
            console.warn('C 状態の自動更新に失敗:', error);
        }
    }, 5000);
}

function stopScheduledWatchTestStatusPolling() {
    if (scheduledWatchTestStatusPollTimer === null) return;
    clearInterval(scheduledWatchTestStatusPollTimer);
    scheduledWatchTestStatusPollTimer = null;
}

function startScheduledWatchTestStatusPolling() {
    stopScheduledWatchTestStatusPolling();
    scheduledWatchTestStatusPollTimer = setInterval(async () => {
        try {
            await refreshScheduledWatchTestStatus();
        } catch (error) {
            console.warn('定時テスト状態の更新に失敗:', error);
        }
    }, 1000);
}

function formatScheduledWatchTestStatus(test) {
    if (!test || test.status === 'idle') return '定時テスト: 未実行';
    if (test.status === 'running') return `定時テスト: 実行中（${test.name || ''}）`;
    if (test.status === 'success') return `定時テスト: 成功（${test.name || ''}）`;
    if (test.status === 'warning') return `定時テスト: 要確認（${test.warningReason || '商品取得設定を確認してください'}）`;
    return `定時テスト: 失敗（${test.failureReason || '理由不明'}）`;
}

function resolveScheduledWatchTestStatusPresentation(status) {
    const presentations = {
        running: { label: '実行中', title: '安全テストを実行中', tone: 'running' },
        success: { label: '成功', title: '商品取得を確認', tone: 'passed' },
        warning: { label: '要確認', title: '商品取得を確認してください', tone: 'needs-review' },
        failed: { label: '失敗', title: '安全テストを完了できませんでした', tone: 'failed' }
    };
    return presentations[status] || presentations.failed;
}

function getScheduledWatchTestTarget(test) {
    if (test?.mode === 'single') return test.url || test.name || '指定URL';
    return test?.name || '選択サイト';
}

async function loadScheduledWatchDiffTestOptions() {
    const stored = await chrome.storage.local.get(SCHEDULED_WATCH_DIFF_TEST_OPTIONS_KEY);
    const checkGmail = stored?.[SCHEDULED_WATCH_DIFF_TEST_OPTIONS_KEY]?.checkGmail === true;
    if (elements?.scheduledWatchDiffTestCheckGmail) elements.scheduledWatchDiffTestCheckGmail.checked = checkGmail;
    return { checkGmail };
}

async function saveScheduledWatchDiffTestOptions() {
    const options = { checkGmail: elements?.scheduledWatchDiffTestCheckGmail?.checked === true };
    await chrome.storage.local.set({ [SCHEDULED_WATCH_DIFF_TEST_OPTIONS_KEY]: options });
    return options;
}

function getScheduledWatchTestVerificationItems(test) {
    if (Array.isArray(test?.verificationItems)) return test.verificationItems;
    const selectorCount = Number.isFinite(test?.matchedCount) ? `${test.matchedCount}件` : '確認中です';
    const snapshotCount = Number.isFinite(test?.snapshotCount) ? `${test.snapshotCount}件` : '確認中です';
    return [
        {
            label: '商品取得セレクタ結果',
            passed: test?.status === 'success' || (Number.isFinite(test?.matchedCount) && test.matchedCount > 0),
            reason: test?.warningReason?.includes('セレクタ') ? test.warningReason : selectorCount
        },
        {
            label: 'snapshot取得件数',
            passed: test?.status === 'success' || (Number.isFinite(test?.snapshotCount) && test.snapshotCount > 0),
            reason: test?.failureReason?.includes('snapshot') ? test.failureReason : snapshotCount
        }
    ];
}

function renderScheduledWatchTestStatus(test) {
    const container = elements?.scheduledWatchTestStatus;
    if (!container) return;
    if (!test || test.status === 'idle') {
        container.hidden = false;
        container.className = 'test-status';
        container.textContent = formatScheduledWatchTestStatus(test);
        return;
    }
    const presentation = resolveScheduledWatchTestStatusPresentation(test.status);
    const verificationItems = getScheduledWatchTestVerificationItems(test);
    const orderedItems = test.status === 'success'
        ? verificationItems
        : [...verificationItems.filter((item) => item?.passed !== true), ...verificationItems.filter((item) => item?.passed === true)];
    const detail = test.decisionReason || test.warningReason || test.failureReason || formatScheduledWatchTestStatus(test);
    container.hidden = false;
    container.className = `test-status auto-test-result-card status-${presentation.tone}`;
    container.replaceChildren();

    const header = document.createElement('div');
    header.className = 'auto-test-result-header';
    const badge = document.createElement('span');
    badge.className = 'auto-test-result-badge';
    badge.textContent = presentation.label;
    const title = document.createElement('span');
    title.className = 'auto-test-result-title';
    title.textContent = presentation.title;
    header.append(badge, title);

    const target = document.createElement('div');
    target.className = 'auto-test-result-target';
    target.textContent = `対象: ${getScheduledWatchTestTarget(test)}`;
    const reasonLabel = document.createElement('div');
    reasonLabel.className = 'auto-test-result-reason-label';
    reasonLabel.textContent = '判定理由';
    const reason = document.createElement('div');
    reason.className = 'auto-test-result-reason';
    reason.textContent = detail;

    const verificationList = document.createElement('div');
    verificationList.className = 'auto-test-verification-list';
    orderedItems.forEach((item) => {
        const itemStatus = item?.passed === true
            ? 'passed'
            : test.status === 'running'
                ? 'pending'
                : test.status === 'warning'
                    ? 'needs-review'
                    : 'failed';
        const row = document.createElement('div');
        row.className = `auto-test-verification-item is-${itemStatus}`;
        const icon = document.createElement('span');
        icon.className = 'auto-test-verification-icon';
        icon.textContent = item?.passed === true ? '✓' : itemStatus === 'pending' ? '–' : '!';
        const label = document.createElement('span');
        label.className = 'auto-test-verification-label';
        label.textContent = item?.label || '確認項目';
        const itemReason = document.createElement('span');
        itemReason.className = 'auto-test-verification-reason';
        itemReason.textContent = item?.reason || '根拠なし';
        row.append(icon, label, itemReason);
        verificationList.append(row);
    });

    const scope = document.createElement('div');
    scope.className = 'scheduled-watch-test-scope';
    scope.textContent = test?.mode === 'multi-artifact-diff'
        ? 'テスト専用アラームで実ファイルを保存します。本番baseline・通常監視・Gmail・Chrome通知・外部拡張通知・検知URL展開は行いません。'
        : test?.mode === 'multi-diff'
            ? '本番baseline・通常監視・ダウンロード・Chrome通知・外部拡張通知は行いません。Gmail確認ON時だけ検知メールを送信します。'
            : '変化検知・Gmail送信・ダウンロード・baseline保存・通常監視は行いません。';
    container.append(header, target, reasonLabel, reason, verificationList, scope);
}

function renderScheduledWatchSites(sites = []) {
    if (!elements?.scheduledWatchSitesList) return;
    const jsonSites = sites.filter((site) => site.source !== 'popup-list-watch');
    if (!jsonSites.length) {
        elements.scheduledWatchSitesList.textContent = 'C のサイト定義はありません';
        return;
    }
    elements.scheduledWatchSitesList.innerHTML = jsonSites.map((site) => {
        const schedules = (site.schedules || []).map((schedule) =>
            `${schedule.startTime}-${schedule.endTime} / ${schedule.intervalSeconds}秒`).join(', ');
        const nextRun = formatScheduledWatchNextRun(site.alarms);
        const status = getScheduledWatchSiteStatusPresentation(site);
        const executionCard = buildScheduledWatchExecutionCardMarkup(site.latestExecution);
        return `<div class="monitor-item scheduled-watch-site ${site.enabled ? 'enabled' : 'disabled'}">
            <div class="monitor-header"><span class="monitor-name">${escapeHtml(site.name)}</span><span class="monitor-status ${status.className}">${status.label}</span></div>
            <div class="scheduled-watch-site-row"><span class="scheduled-watch-site-label">URL</span><span class="scheduled-watch-site-value">${escapeHtml(site.url)}</span></div>
            <div class="scheduled-watch-site-row"><span class="scheduled-watch-site-label">スケジュール</span><span class="scheduled-watch-site-value">${escapeHtml(schedules || '未設定')}</span></div>
            <div class="scheduled-watch-site-row"><span class="scheduled-watch-site-label">次回実行</span><span class="scheduled-watch-site-value">${escapeHtml(nextRun)}</span></div>
            <div class="scheduled-watch-site-row"><label class="scheduled-watch-site-label" for="scheduledWatchCaptureMode_${escapeHtml(site.id)}">取得方式</label><select id="scheduledWatchCaptureMode_${escapeHtml(site.id)}" data-scheduled-watch-capture-mode data-site-id="${escapeHtml(site.id)}"><option value="reload"${site.fetchMode?.enabled ? '' : ' selected'}>リロード（従来）</option><option value="fetch"${site.fetchMode?.enabled ? ' selected' : ''}>Fetch</option></select></div>
            ${site.lastError ? `<div class="scheduled-watch-site-row"><span class="scheduled-watch-site-label">直近エラー</span><span class="scheduled-watch-site-value">${escapeHtml(site.lastError)}</span></div>` : ''}
            ${executionCard}
        </div>`;
    }).join('');

    elements.scheduledWatchSitesList.querySelectorAll('[data-scheduled-watch-capture-mode]').forEach((select) => {
        select.addEventListener('change', async () => {
            const response = await sendScheduledWatchMessage({
                action: 'updateScheduledWatchCaptureMode',
                siteId: select.dataset.siteId,
                captureMode: select.value
            });
            if (!response?.success) {
                showMessage(response?.error || '取得方式の保存に失敗しました', 'error');
                await refreshScheduledWatchSitesSafely();
                return;
            }
            showMessage(`${response.siteName || select.dataset.siteId} の取得方式を保存しました`, 'success');
        });
    });
}

function formatScheduledWatchNextRun(alarms = []) {
    const timestamps = (Array.isArray(alarms) ? alarms : [])
        .map((alarm) => Number(alarm?.scheduledTime))
        .filter((scheduledTime) => Number.isFinite(scheduledTime) && scheduledTime > 0)
        .sort((left, right) => left - right);
    if (!timestamps.length) return '未予約';
    return formatScheduledWatchExecutionTimestamp(new Date(timestamps[0]).toISOString(), '未予約');
}

function formatSingleScheduledWatchStatus(scheduledWatch = {}) {
    if (scheduledWatch?.isRunning && scheduledWatch.trigger === 'immediate') {
        return [
            '即時監視: 実行中',
            `終了予定: ${formatScheduledWatchNextRun([{ scheduledTime: scheduledWatch.windowEndAt }])}`
        ].join('\n');
    }
    if (!scheduledWatch?.enabled) {
        if (scheduledWatch?.scheduleEnabled && scheduledWatch.reason) {
            return [
                '定時監視: 予約不可',
                `予定枠: ${scheduledWatch.startTime || '未設定'} 〜 ${scheduledWatch.endTime || '未設定'}`,
                scheduledWatch.reason
            ].join('\n');
        }
        return '定時監視: 無効';
    }
    const schedule = `${scheduledWatch.startTime || '未設定'} 〜 ${scheduledWatch.endTime || '未設定'}`;
    const interval = Number(scheduledWatch.intervalSeconds || 0);
    const nextRun = scheduledWatch.isRunning
        ? '実行中'
        : formatScheduledWatchNextRun([{ scheduledTime: scheduledWatch.nextRunAt }]);
    return [
        `定時監視: ${scheduledWatch.isRunning ? '実行中' : '予約中'}`,
        `予定枠: ${schedule}`,
        `間隔: ${interval > 0 ? `${interval}秒` : '未設定'}`,
        `次回実行: ${nextRun}`
    ].join('\n');
}

function renderSingleScheduledWatchStatus(scheduledWatch) {
    if (!elements?.singleScheduledWatchStatus) return;
    elements.singleScheduledWatchStatus.textContent = formatSingleScheduledWatchStatus(scheduledWatch);
    const isRunning = scheduledWatch?.isRunning === true;
    if (elements?.startSingleScheduledWatchNowButton) elements.startSingleScheduledWatchNowButton.disabled = isRunning;
    if (elements?.stopSingleScheduledWatchNowButton) elements.stopSingleScheduledWatchNowButton.disabled = !isRunning;
}

function formatSingleKeywordScheduleStatus(schedule = {}) {
    if (!schedule?.enabled) {
        if (schedule?.scheduleEnabled && schedule.reason) {
            return ['定時監視: 予約不可', `開始時刻: ${schedule.startTime || '未設定'}`, schedule.reason].join('\n');
        }
        return '定時監視: 無効';
    }
    const nextRun = schedule.isRunning
        ? '実行中'
        : formatScheduledWatchNextRun([{ scheduledTime: schedule.nextRunAt }]);
    return [
        `定時監視: ${schedule.isRunning ? '実行中' : '有効'}`,
        `開始時刻: ${schedule.startTime || '未設定'}`,
        `次回実行: ${nextRun}`
    ].join('\n');
}

function renderSingleKeywordScheduleStatus(schedule) {
    if (!elements?.singleKeywordScheduleStatus) return;
    elements.singleKeywordScheduleStatus.textContent = formatSingleKeywordScheduleStatus(schedule);
}

function formatMultipleScheduledMonitoringStatus(scheduledWatch = {}) {
    if (!scheduledWatch?.enabled) {
        if (scheduledWatch?.scheduleEnabled && scheduledWatch.reason) {
            return [
                '定時監視: 予約不可',
                `開始時刻: ${scheduledWatch.startTime || '未設定'}`,
                `対象: ${Number(scheduledWatch.targetCount || 0)}件`,
                scheduledWatch.reason
            ].join('\n');
        }
        return '定時監視: 無効';
    }
    const nextRun = scheduledWatch.isRunning
        ? '実行中'
        : formatScheduledWatchNextRun([{ scheduledTime: scheduledWatch.nextRunAt }]);
    return [
        `定時監視: ${scheduledWatch.isRunning ? '実行中' : '予約中'}`,
        `開始時刻: ${scheduledWatch.startTime || '未設定'}`,
        `対象: ${Number(scheduledWatch.targetCount || 0)}件`,
        `次回実行: ${nextRun}`
    ].join('\n');
}

function renderMultipleScheduledMonitoringStatus(scheduledWatch) {
    if (!elements?.multipleScheduledMonitoringStatus) return;
    elements.multipleScheduledMonitoringStatus.textContent = formatMultipleScheduledMonitoringStatus(scheduledWatch);
}

function formatMultipleListWatchScheduleStatus(sites = []) {
    const targets = (Array.isArray(sites) ? sites : [])
        .filter((site) => site?.source === 'popup-list-watch');
    if (!targets.length) {
        return '定時監視: 無効\n対象ごとの毎日開始予約は未登録です。';
    }
    const enabledTargets = targets.filter((site) => site.enabled);
    if (!enabledTargets.length) {
        return '定時監視: 無効\n有効な予約対象がありません。';
    }
    const isScheduledRunning = (site) => site.activeSession?.trigger !== 'immediate' &&
        (site.status === 'running' || ['starting', 'running'].includes(site.latestExecution?.status));
    const isRunning = enabledTargets.some(isScheduledRunning);
    return [
        `定時監視: ${isRunning ? '実行中' : '予約中'}`,
        `対象: ${enabledTargets.length}件`,
        ...enabledTargets.map((site) => {
            const schedule = site.schedules?.[0] || {};
            return `${site.name || '名前なし'}: ${schedule.startTime || '未設定'} 〜 ${schedule.endTime || '未設定'} / 次回実行: ${isScheduledRunning(site) ? '実行中' : formatScheduledWatchNextRun(site.alarms)}`;
        })
    ].join('\n');
}

function renderMultipleListWatchScheduleStatus(sites) {
    if (!elements?.multipleListWatchScheduleStatus) return;
    elements.multipleListWatchScheduleStatus.textContent = formatMultipleListWatchScheduleStatus(sites);
}

function formatMultipleListWatchImmediateStatus(sites = []) {
    const activeTargets = (Array.isArray(sites) ? sites : [])
        .filter((site) => site?.source === 'popup-list-watch' && site?.activeSession?.active && site.activeSession.trigger === 'immediate');
    if (!activeTargets.length) return '即時監視: 未実行';
    return [
        `即時監視: 実行中（${activeTargets.length}件）`,
        ...activeTargets.map((site) => `${site.name || '名前なし'}: 終了予定 ${formatScheduledWatchNextRun([{ scheduledTime: site.activeSession.windowEndMs }])}`)
    ].join('\n');
}

function renderMultipleListWatchImmediateStatus(sites) {
    if (!elements?.multipleListWatchImmediateStatus) return;
    elements.multipleListWatchImmediateStatus.textContent = formatMultipleListWatchImmediateStatus(sites);
}

function getScheduledWatchSiteStatusPresentation(site = {}) {
    if (site.status === 'running' || ['starting', 'running'].includes(site.latestExecution?.status)) {
        return { label: '実行中', className: 'running' };
    }
    if (site.enabled) return { label: '次回予約', className: 'scheduled' };
    return { label: '無効', className: 'disabled' };
}

function getScheduledWatchExecutionPresentation(status) {
    const labels = {
        starting: '開始準備中',
        running: '実行中',
        success: '正常完了',
        needs_review: '要確認',
        failed: '失敗'
    };
    return {
        label: labels[status] || '要確認',
        tone: ['starting', 'running', 'success', 'needs_review', 'failed'].includes(status) ? status : 'needs_review'
    };
}

function formatScheduledWatchExecutionTimestamp(value, fallback) {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('ja-JP', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

function getScheduledWatchExecutionEndDetail(execution = {}) {
    if (['starting', 'running'].includes(execution.status)) return '実行中';
    const labels = {
        window_end: '時間満了',
        window_end_after_check: '時間満了（最終確認後）',
        new_product_detected: '新商品検知',
        start_error: '開始エラー',
        capture_error: '取得エラー'
    };
    return labels[execution.endReason] || execution.decisionReason || '終了理由を確認してください。';
}

function getScheduledWatchTextPresentation(text, maxLines = 3, maxCharacters = 360) {
    const fullText = String(text || '');
    const previewLines = fullText.split(/\r?\n/).slice(0, maxLines);
    let preview = previewLines.join('\n');
    if (preview.length > maxCharacters) {
        preview = preview.slice(0, maxCharacters).trimEnd();
    }
    const hasMore = preview !== fullText;
    return {
        fullText,
        preview: hasMore ? `${preview}…` : preview,
        hasMore,
        fullLength: fullText.length
    };
}

function buildScheduledWatchExecutionCardMarkup(execution) {
    if (!execution) return '';
    const presentation = getScheduledWatchExecutionPresentation(execution.status);
    const startedAt = formatScheduledWatchExecutionTimestamp(execution.startedAt, '未開始');
    const endedAt = formatScheduledWatchExecutionTimestamp(
        execution.endedAt,
        ['starting', 'running'].includes(execution.status) ? '実行中' : '未記録'
    );
    const scheduledWindow = execution.scheduledWindowStart || execution.scheduledWindowEnd
        ? `${execution.scheduledWindowStart || '未記録'} 〜 ${execution.scheduledWindowEnd || '未記録'}`
        : '未記録';
    const metrics = [
        ['セレクタ一致', `${Number(execution.matchedCount || 0)}件`],
        ['snapshot', `${Number(execution.snapshotCount || 0)}件`],
        ['tick', `${Number(execution.tickCount || 0)}回`]
    ].map(([label, value]) => `<div class="scheduled-watch-execution-metric"><span class="scheduled-watch-execution-metric-label">${label}</span><span class="scheduled-watch-execution-metric-value">${value}</span></div>`).join('');
    const textPresentation = getScheduledWatchTextPresentation(execution.textPreview);
    const textPreview = execution.textPreview
        ? `<div class="scheduled-watch-execution-detail"><span class="scheduled-watch-execution-detail-label">取得テキスト</span><pre class="scheduled-watch-execution-text">${escapeHtml(textPresentation.preview)}</pre>${textPresentation.hasMore ? `<details class="scheduled-watch-execution-text-details"><summary>取得テキストを全文表示（${textPresentation.fullLength}文字）</summary><pre class="scheduled-watch-execution-text">${escapeHtml(textPresentation.fullText)}</pre></details>` : ''}</div>`
        : `<div class="scheduled-watch-execution-detail"><span class="scheduled-watch-execution-detail-label">取得テキスト</span><span>未取得</span></div>`;
    return `<section class="scheduled-watch-execution-card status-${presentation.tone}">
        <div class="scheduled-watch-execution-header"><span class="scheduled-watch-execution-badge">${presentation.label}</span><span>直近実行</span></div>
        <div class="scheduled-watch-execution-detail"><span class="scheduled-watch-execution-detail-label">実行時間</span><span>${escapeHtml(startedAt)} 〜 ${escapeHtml(endedAt)}</span></div>
        <div class="scheduled-watch-execution-detail"><span class="scheduled-watch-execution-detail-label">予定枠</span><span>${escapeHtml(scheduledWindow)}</span></div>
        <div class="scheduled-watch-execution-detail"><span class="scheduled-watch-execution-detail-label">終了</span><span>${escapeHtml(getScheduledWatchExecutionEndDetail(execution))}</span></div>
        <div class="scheduled-watch-execution-metrics">${metrics}</div>
        ${textPreview}
    </section>`;
}

function resolveScheduledWatchResyncPresentation(status) {
    const presentations = {
        success: { label: '成功', title: 'C アラームを設定・照合しました', tone: 'passed' },
        warning: { label: '要確認', title: 'C アラームの設定を確認してください', tone: 'needs-review' },
        failed: { label: '失敗', title: 'C アラームを再同期できませんでした', tone: 'failed' }
    };
    return presentations[status] || presentations.failed;
}

function getScheduledWatchResyncVerificationItems(result = {}) {
    const missingNames = (result.missingAlarms || []).map((alarm) => `${alarm.siteName}: ${alarm.name}`);
    const issueNames = (result.configurationIssues || []).map((issue) => `${issue.siteName}: ${issue.reason}`);
    return [
        {
            label: '有効サイト数',
            passed: (result.activeSiteCount || 0) > 0,
            reason: `${result.activeSiteCount || 0}件`
        },
        {
            label: 'アラーム設定・照合',
            passed: (result.expectedAlarmCount || 0) > 0 && result.expectedAlarmCount === result.configuredAlarmCount && missingNames.length === 0,
            reason: `期待 ${result.expectedAlarmCount || 0}件 / 設定済み ${result.configuredAlarmCount || 0}件`
        },
        ...missingNames.map((name) => ({ label: '未設定アラーム', passed: false, reason: name })),
        ...issueNames.map((name) => ({ label: '設定不足', passed: false, reason: name }))
    ];
}

function renderScheduledWatchResyncResult(result) {
    const container = elements?.scheduledWatchResyncResult;
    if (!container) return;
    if (!result) {
        container.hidden = true;
        container.replaceChildren();
        return;
    }
    const presentation = resolveScheduledWatchResyncPresentation(result.status);
    const verificationItems = getScheduledWatchResyncVerificationItems(result);
    const orderedItems = result.status === 'success'
        ? verificationItems
        : [...verificationItems.filter((item) => item.passed !== true), ...verificationItems.filter((item) => item.passed === true)];
    container.hidden = false;
    container.className = `test-status auto-test-result-card status-${presentation.tone}`;
    container.replaceChildren();

    const header = document.createElement('div');
    header.className = 'auto-test-result-header';
    const badge = document.createElement('span');
    badge.className = 'auto-test-result-badge';
    badge.textContent = presentation.label;
    const title = document.createElement('span');
    title.className = 'auto-test-result-title';
    title.textContent = presentation.title;
    header.append(badge, title);

    const reasonLabel = document.createElement('div');
    reasonLabel.className = 'auto-test-result-reason-label';
    reasonLabel.textContent = '判定理由';
    const reason = document.createElement('div');
    reason.className = 'auto-test-result-reason';
    reason.textContent = result.decisionReason || '再同期結果を確認してください。';

    const verificationList = document.createElement('div');
    verificationList.className = 'auto-test-verification-list';
    orderedItems.forEach((item) => {
        const row = document.createElement('div');
        row.className = `auto-test-verification-item is-${item.passed ? 'passed' : result.status === 'warning' ? 'needs-review' : 'failed'}`;
        const icon = document.createElement('span');
        icon.className = 'auto-test-verification-icon';
        icon.textContent = item.passed ? '✓' : '!';
        const label = document.createElement('span');
        label.className = 'auto-test-verification-label';
        label.textContent = item.label;
        const itemReason = document.createElement('span');
        itemReason.className = 'auto-test-verification-reason';
        itemReason.textContent = item.reason;
        row.append(icon, label, itemReason);
        verificationList.append(row);
    });
    container.append(header, reasonLabel, reason, verificationList);
}

async function refreshScheduledWatchSites() {
    const response = await sendScheduledWatchMessage({ action: 'getScheduledWatchSitesStatus' });
    if (!response?.success) throw new Error(response?.error || 'C 状態の取得に失敗しました');
    const sites = response.sites || [];
    const popupListWatchErrors = response.popupListWatchErrors || [];
    globalThis.__multipleListWatchImmediateTargetIds = sites
        .filter((site) => site?.source === 'popup-list-watch' && site?.activeSession?.active && site.activeSession.trigger === 'immediate')
        .map((site) => site.targetId)
        .filter(Boolean);
    renderScheduledWatchSites(sites);
    renderMultipleListWatchScheduleStatus(sites);
    renderMultipleListWatchImmediateStatus(sites);
    if (typeof configManager !== 'undefined' && configManager) {
        const config = unwrapConfigFromManager(await configManager.loadConfig()) || {};
        renderMultipleListWatchList(config, popupListWatchErrors);
    }
    renderScheduledWatchResyncResult(response.resyncResult);
    if (elements?.scheduledWatchTestSiteSelect) {
        const selected = elements.scheduledWatchTestSiteSelect.value;
        elements.scheduledWatchTestSiteSelect.innerHTML = '<option value="">Cサイトを選択</option>' + sites
            .filter((site) => site.enabled)
            .map((site) => `<option value="${escapeHtml(site.id)}">${escapeHtml(site.name)}</option>`).join('');
        elements.scheduledWatchTestSiteSelect.value = selected;
    }
    return sites;
}

async function handleRefreshScheduledWatchSites() {
    try {
        await refreshScheduledWatchSitesSafely();
        showMessage('C の状態を更新しました', 'success');
    } catch (error) {
        showMessage(error?.message || 'C 状態の取得に失敗しました', 'error');
    }
}

async function refreshScheduledWatchTestStatus() {
    const response = await sendScheduledWatchMessage({ action: 'getScheduledWatchTestStatus' });
    const test = response?.test;
    renderScheduledWatchTestStatus(test);
    if (test?.status !== 'running') {
        stopScheduledWatchTestStatusPolling();
    }
    return test;
}

async function refreshScheduledWatchTestPanel() {
    try {
        await refreshScheduledWatchSitesSafely();
        await refreshScheduledWatchTestStatus();
    } catch (error) {
        console.warn('C 定時監視状態の読み込みに失敗:', error);
    }
}

async function startScheduledWatchSafetyTest(mode) {
    const siteId = mode === 'multi' ? elements?.scheduledWatchTestSiteSelect?.value : null;
    const response = await sendScheduledWatchMessage({ action: 'startScheduledWatchTest', mode, siteId });
    if (!response?.success) {
        const failureReason = `開始不可: ${response?.error || '定時テストの開始に失敗しました'}`;
        renderScheduledWatchTestStatus(response?.test || {
            mode,
            id: siteId || (mode === 'single' ? 'single' : ''),
            name: mode === 'single' ? '指定URL' : '選択サイト',
            status: 'failed',
            failureReason,
            decisionReason: failureReason
        });
        throw new Error(failureReason);
    }
    const test = await refreshScheduledWatchTestStatus();
    if (test?.status === 'running') {
        startScheduledWatchTestStatusPolling();
    }
}

async function startScheduledWatchDiffTest() {
    const siteId = elements?.scheduledWatchTestSiteSelect?.value;
    const options = await saveScheduledWatchDiffTestOptions();
    const response = await sendScheduledWatchMessage({ action: 'startScheduledWatchDiffTest', siteId, checkGmail: options.checkGmail });
    if (!response?.success) {
        const failureReason = `開始不可: ${response?.error || '差分検知テストの開始に失敗しました'}`;
        renderScheduledWatchTestStatus(response?.test || { mode: 'multi-diff', id: siteId || '', name: '選択サイト', status: 'failed', failureReason, decisionReason: failureReason });
        throw new Error(failureReason);
    }
    const test = await refreshScheduledWatchTestStatus();
    if (test?.status === 'running') startScheduledWatchTestStatusPolling();
}

async function startScheduledWatchArtifactDiffTest() {
    const siteId = elements?.scheduledWatchTestSiteSelect?.value;
    const selectedMode = Array.from(elements?.scheduledWatchArtifactDiffTestModeOptions || [])
        .find((option) => option.checked)?.value;
    const executionMode = selectedMode === 'alarm' ? 'alarm' : 'fast';
    const response = await sendScheduledWatchMessage({ action: 'startScheduledWatchArtifactDiffTest', siteId, executionMode });
    if (!response?.success) {
        const failureReason = `開始不可: ${response?.error || '保存付き差分テストの開始に失敗しました'}`;
        renderScheduledWatchTestStatus(response?.test || { mode: 'multi-artifact-diff', id: siteId || '', name: '選択サイト', status: 'failed', failureReason, decisionReason: failureReason });
        throw new Error(failureReason);
    }
    const test = await refreshScheduledWatchTestStatus();
    if (test?.status === 'running') startScheduledWatchTestStatusPolling();
}

async function copyTextToClipboard(text) {
    if (!text) {
        throw new Error('copy-target-empty');
    }

    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', 'readonly');
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (!successful) {
        throw new Error('copy-command-failed');
    }
}

async function copyScenarioCode(kind) {
    const scenario = getTestScenarioByModeAndId(
        selectedTestScenarioMode,
        resolveSelectedTestScenarioId(selectedTestScenarioMode)
    );
    const code = kind === 'extra' ? scenario.extraDevtoolsCode : scenario.devtoolsCode;
    const label = kind === 'extra'
        ? (scenario.extraDevtoolsLabel || '手動再現コード')
        : (scenario.devtoolsLabel || 'DevToolsコード');

    try {
        await copyTextToClipboard(code);
        showMessage(`${label}をコピーしました`, 'success');
    } catch (error) {
        console.error(`${label}コピーエラー:`, error);
        showMessage(`${label}のコピーに失敗しました`, 'error');
    }
}

async function copySwLogs() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getBufferedSwLogs' });
        if (!response?.success) {
            showMessage('ログ取得に失敗しました', 'error');
            return;
        }

        const text = response.logs.join('\n') || '(ログなし)';
        await copyTextToClipboard(text);
        showMessage(`${response.logs.length}件のSWログをコピーしました`, 'success');
    } catch (error) {
        console.error('SWログコピーエラー:', error);
        showMessage('コピーに失敗しました', 'error');
    }
}

async function loadEcSites() {
    if (Array.isArray(ecSitesCache)) {
        return ecSitesCache;
    }

    try {
        const response = await fetch(chrome.runtime.getURL('src/config/ec-sites.json'));
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        ecSitesCache = Array.isArray(data?.sites) ? data.sites : [];
        return ecSitesCache;
    } catch (error) {
        console.error('[PageRecorder] ec-sites.json読込エラー:', error);
        ecSitesCache = [];
        return ecSitesCache;
    }
}

async function loadScheduledWatchSitesForPopup() {
    if (Array.isArray(scheduledWatchSitesCache)) return scheduledWatchSitesCache;
    try {
        const response = await fetch(chrome.runtime.getURL('src/config/scheduled-watch-sites.json'));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        scheduledWatchSitesCache = Array.isArray(data?.sites) ? data.sites : [];
    } catch (error) {
        console.warn('[PageRecorder] scheduled-watch-sites.json読込エラー:', error);
        scheduledWatchSitesCache = [];
    }
    return scheduledWatchSitesCache;
}

async function loadStockFetchDiagnosisSites() {
    if (Array.isArray(stockFetchDiagnosisSitesCache)) return stockFetchDiagnosisSitesCache;
    try {
        const response = await fetch(chrome.runtime.getURL('src/config/stock-fetch-diagnosis-sites.json'));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        stockFetchDiagnosisSitesCache = Array.isArray(data?.sites) ? data.sites : [];
    } catch (error) {
        console.warn('[PageRecorder] stock-fetch-diagnosis-sites.json読込エラー:', error);
        stockFetchDiagnosisSitesCache = [];
    }
    return stockFetchDiagnosisSitesCache;
}

function resolveBulkStockFetchDiagnosisSite(diagnosisSiteId, diagnosisSites) {
    if (!diagnosisSiteId) return { site: null, reason: '診断するECサイトを選択してください。' };
    const site = (diagnosisSites || []).find((candidate) => candidate.id === diagnosisSiteId);
    if (!site?.samples?.length) return { site: null, reason: '選択したECサイトには診断サンプルが未登録です。' };
    return { site, reason: '' };
}

async function refreshBulkStockFetchDiagnosisAvailability() {
    const button = elements?.startBulkStockFetchDiagnosisButton;
    const hint = elements?.bulkStockFetchDiagnosisHint;
    if (!button || !hint) return;
    const [{ diagnosisSiteId = '' }, sites] = await Promise.all([
        chrome.storage.local.get('diagnosisSiteId'), loadStockFetchDiagnosisSites()
    ]);
    const { site, reason } = resolveBulkStockFetchDiagnosisSite(diagnosisSiteId, sites);
    button.disabled = !site;
    hint.textContent = site ? `${site.name || site.id}: 在庫あり・なし ${site.samples.length}件を診断します。` : reason;
}

async function renderDiagnosisSiteDropdown() {
    const select = elements?.diagnosisSiteSelect;
    if (!select) return;

    const sites = await loadStockFetchDiagnosisSites();
    const stored = await chrome.storage.local.get('diagnosisSiteId');
    const selectedId = stored.diagnosisSiteId || '';

    select.innerHTML = '<option value="">-- サイトを選択 --</option>';
    sites.forEach((site) => {
        const sampleCount = site.samples?.length || 0;
        const option = document.createElement('option');
        option.value = site.id;
        option.textContent = `${site.name || site.id} (${sampleCount}件)`;
        option.selected = site.id === selectedId;
        select.appendChild(option);
    });

    await refreshBulkStockFetchDiagnosisAvailability();
}

async function handleDiagnosisSiteChange(event) {
    const siteId = event.target?.value || '';
    await chrome.storage.local.set({ diagnosisSiteId: siteId });
    await applyDiagnosisSiteDefaults(siteId);
    await refreshBulkStockFetchDiagnosisAvailability();
}

async function applyDiagnosisSiteDefaults(siteId) {
    if (!siteId) return;
    const sites = await loadEcSites();
    const site = sites.find((candidate) => candidate.id === siteId);
    const defaults = getEcSiteMonitorDefaultsFromSite(site);
    if (!defaults?.selector || !defaults?.keyword) return;
    if (elements?.diagnosisSelector) elements.diagnosisSelector.value = defaults.selector;
    if (elements?.diagnosisKeyword) elements.diagnosisKeyword.value = defaults.keyword;
}

function updateDiagnosisTargetTypeUI() {
    if (!elements?.diagnosisUrlContainer || !elements?.diagnosisUrl) return;
    const usesSpecifiedUrl = elements.diagnosisUrl.checked;
    elements.diagnosisUrlContainer.hidden = !usesSpecifiedUrl;
    if (elements.diagnosisTargetUrl) elements.diagnosisTargetUrl.required = usesSpecifiedUrl;
}

function getEcSiteById(siteId) {
    if (!Array.isArray(ecSitesCache)) {
        return null;
    }

    return ecSitesCache.find((site) => site.id === siteId) || null;
}

function getScheduledWatchProfilesFromSite(site) {
    const targetProfiles = ((typeof scheduledWatchSitesCache !== 'undefined' && scheduledWatchSitesCache) || [])
        .filter((target) => target?.source?.kind === 'buy-target' &&
            target?.notification?.siteId === site?.id &&
            typeof target?.id === 'string' && target.id.trim() &&
            typeof target?.url === 'string' && target.url.trim() &&
            typeof target?.selectors?.productLinks === 'string' && target.selectors.productLinks.trim())
        .map((target) => ({
            id: target.id,
            name: target.name || target.id,
            url: target.url,
            productSelector: target.selectors.productLinks,
            schedules: Array.isArray(target.schedules) ? target.schedules : []
        }));
    if (targetProfiles.length > 0) return targetProfiles;
    if (!Array.isArray(site?.scheduledWatchProfiles)) return [];
    return site.scheduledWatchProfiles.filter((profile) =>
        typeof profile?.id === 'string' && profile.id.trim() &&
        typeof profile?.url === 'string' && profile.url.trim() &&
        typeof profile?.productSelector === 'string' && profile.productSelector.trim()
    );
}

function getScheduledWatchProfile(siteId, profileId) {
    const site = getEcSiteById(siteId);
    return getScheduledWatchProfilesFromSite(site)
        .find((profile) => profile.id === profileId) || null;
}

function getDefaultScheduledWatchProfile(siteId) {
    const profiles = getScheduledWatchProfilesFromSite(getEcSiteById(siteId));
    return profiles.find((profile) => profile.isDefault === true) || profiles[0] || null;
}

function renderSingleScheduledWatchSiteSelect(singleScheduledWatch = {}) {
    const select = elements?.singleScheduledWatchSite;
    if (!select) return;

    const selectedSiteId = singleScheduledWatch.siteId || '';
    select.innerHTML = '<option value="">-- サイトを選択 --</option>';
    (ecSitesCache || []).filter((site) => getScheduledWatchProfilesFromSite(site).length > 0)
        .forEach((site) => {
            const option = document.createElement('option');
            option.value = site.id;
            option.textContent = site.name || site.id;
            option.selected = site.id === selectedSiteId;
            select.appendChild(option);
        });
}

function renderSingleScheduledWatchProfileSelect(siteId = '', selectedProfileId = '') {
    const select = elements?.singleScheduledWatchProfile;
    if (!select) return;

    select.innerHTML = '<option value="">-- プロファイルを選択 --</option>';
    const profiles = getScheduledWatchProfilesFromSite(getEcSiteById(siteId));
    profiles.forEach((profile) => {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = profile.name || profile.id;
        option.selected = profile.id === selectedProfileId;
        select.appendChild(option);
    });
    select.disabled = profiles.length === 0;
}

function renderMultipleListWatchSiteSelect(selectedSiteId = '') {
    const select = elements?.multipleListWatchSite;
    if (!select) return;
    select.innerHTML = '<option value="">-- サイトを選択 --</option>';
    (ecSitesCache || []).filter((site) => getScheduledWatchProfilesFromSite(site).length > 0)
        .forEach((site) => {
            const option = document.createElement('option');
            option.value = site.id;
            option.textContent = site.name || site.id;
            option.selected = site.id === selectedSiteId;
            select.appendChild(option);
        });
}

function renderMultipleListWatchProfileSelect(siteId = '', selectedProfileId = '') {
    const select = elements?.multipleListWatchProfile;
    if (!select) return;
    const profiles = getScheduledWatchProfilesFromSite(getEcSiteById(siteId));
    select.innerHTML = '<option value="">-- プロファイルを選択 --</option>';
    profiles.forEach((profile) => {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = profile.name || profile.id;
        option.selected = profile.id === selectedProfileId;
        select.appendChild(option);
    });
    select.disabled = profiles.length === 0;
}

function resetMultipleListWatchForm() {
    window._editingMultipleListWatchId = null;
    if (elements?.multipleListWatchName) elements.multipleListWatchName.value = '';
    if (elements?.multipleListWatchUrl) elements.multipleListWatchUrl.value = '';
    if (elements?.multipleListWatchStartTime) elements.multipleListWatchStartTime.value = '11:57';
    if (elements?.multipleListWatchEndTime) elements.multipleListWatchEndTime.value = '12:05';
    if (elements?.multipleListWatchInterval) elements.multipleListWatchInterval.value = '30';
    if (elements?.saveMultipleListWatchButton) elements.saveMultipleListWatchButton.textContent = '一覧監視を追加';
    if (elements?.cancelMultipleListWatchEditButton) elements.cancelMultipleListWatchEditButton.hidden = true;
}

function renderMultipleUrlSubtab(selectedSubtab = 'product') {
    const selected = selectedSubtab === 'list' ? 'list' : 'product';
    elements?.multipleUrlSubtabs?.forEach((button) => {
        const active = button.dataset.multipleUrlSubtab === selected;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
    });
    if (elements?.multipleProductWatchPanel) elements.multipleProductWatchPanel.hidden = selected !== 'product';
    if (elements?.multipleListWatchSection) elements.multipleListWatchSection.hidden = selected !== 'list';
    void loadAiSupportFilePreferenceForMultipleSubtab(selected);
}

async function loadAiSupportFilePreferenceForMultipleSubtab(selectedSubtab) {
    if (!elements?.downloadAiSupportFile || !configManager) return;
    const config = unwrapConfigFromManager(await configManager.loadConfig()) || {};
    const settings = selectedSubtab === 'list'
        ? config.multiple_list_watch_common_settings
        : config.multiple_common_settings;
    elements.downloadAiSupportFile.checked = settings?.downloadAiSupportFile === true;
}

function renderMultipleListWatchList(config = {}, validationErrors = [], selectedTargetIds = null) {
    const list = elements?.multipleListWatchList;
    if (!list) return;
    const targets = Array.isArray(config.multiple_list_watch_configs) ? config.multiple_list_watch_configs : [];
    const selectedIds = new Set(selectedTargetIds || getSelectedMultipleListWatchTargetIds());
    const errorsByTargetId = new Map((Array.isArray(validationErrors) ? validationErrors : [])
        .filter((error) => error?.id)
        .map((error) => [error.id, error.reason || '設定を確認してください。']));
    list.innerHTML = '';
    if (!targets.length) {
        list.innerHTML = '<p class="helper-note">検索結果・一覧ページは未登録です。</p>';
        list.classList.add('show');
        return;
    }
    targets.forEach((target) => {
        const item = document.createElement('div');
        const validationReason = errorsByTargetId.get(target.id) || '';
        item.className = `monitor-item ${validationReason ? 'disabled' : target.enabled === false ? 'disabled' : 'enabled'}`;
        const enabled = target.enabled !== false;
        const status = validationReason ? '設定要修正' : enabled ? '予約対象' : '無効';
        const statusClass = validationReason || !enabled ? 'disabled' : 'stopped';
        const errorMessage = validationReason ? `<div class="helper-note" role="alert">${escapeHtml(validationReason)}</div>` : '';
        const disabled = validationReason ? ' disabled' : '';
        const checked = !validationReason && selectedIds.has(target.id) ? ' checked' : '';
        item.innerHTML = `<div class="monitor-header"><span class="monitor-name">${escapeHtml(target.name || '名前なし')}</span><span class="monitor-status ${statusClass}">${status}</span></div><div class="monitor-url">${escapeHtml(target.url || '')}</div><div class="monitor-details">${escapeHtml(target.startTime || '')} 〜 ${escapeHtml(target.endTime || '')} / ${Number(target.intervalSeconds || 0)}秒</div>${errorMessage}<div class="checkbox-item"><input type="checkbox" data-list-watch-immediate-select data-list-watch-id="${escapeHtml(target.id)}"${disabled}${checked}><label>今すぐ監視の対象に選択</label></div><div class="monitor-controls"><button class="btn-small ${enabled ? 'btn-warning' : 'btn-primary'}" data-list-watch-action="toggle-enabled" data-list-watch-id="${target.id}">${enabled ? '予約を無効化' : '予約を有効化'}</button><button class="btn-small btn-warning" data-list-watch-action="edit" data-list-watch-id="${target.id}">編集</button><button class="btn-small btn-danger" data-list-watch-action="delete" data-list-watch-id="${target.id}">削除</button></div>`;
        list.appendChild(item);
    });
    list.classList.add('show');
    updateMultipleListWatchImmediateControls();
}

function formatMultipleListWatchStartResult(response = {}) {
    const skipped = (Array.isArray(response.results) ? response.results : [])
        .filter((result) => !result.success)
        .map((result) => {
            const reason = result.error || (result.reason === 'target_not_found'
                ? '設定を確認してください'
                : result.reason || '開始できませんでした');
            return `${result.targetId || '対象'}: ${reason}`;
        });
    if (!skipped.length) return '';
    return ` / スキップ理由: ${skipped.join('、')}`;
}

function getSelectedMultipleListWatchTargetIds() {
    return Array.from(elements?.multipleListWatchList?.querySelectorAll('[data-list-watch-immediate-select]:checked') || [])
        .map((input) => input.dataset.listWatchId)
        .filter(Boolean);
}

function updateMultipleListWatchImmediateControls() {
    const hasSelection = getSelectedMultipleListWatchTargetIds().length > 0;
    const hasActiveImmediateTarget = Array.isArray(globalThis.__multipleListWatchImmediateTargetIds) &&
        globalThis.__multipleListWatchImmediateTargetIds.length > 0;
    if (elements?.startMultipleListWatchNowButton) elements.startMultipleListWatchNowButton.disabled = !hasSelection;
    if (elements?.stopMultipleListWatchNowButton) elements.stopMultipleListWatchNowButton.disabled = !hasSelection && !hasActiveImmediateTarget;
}

async function startMultipleListWatchNow() {
    const targetIds = getSelectedMultipleListWatchTargetIds();
    const durationMinutes = Number(elements?.multipleListWatchImmediateDuration?.value || 0);
    if (!targetIds.length) throw new Error('即時監視する対象を選択してください');
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 480) {
        throw new Error('即時監視の継続時間は1〜480分で設定してください');
    }
    const response = await sendScheduledWatchMessage({ action: 'startPopupListWatchNow', targetIds, durationMinutes });
    if (!response?.success) throw new Error(response?.error || '一覧監視の即時開始に失敗しました');
    await refreshScheduledWatchSitesSafely();
    showMessage(`一覧監視を即時開始しました（開始 ${response.startedCount || 0}件 / スキップ ${response.skippedCount || 0}件）${formatMultipleListWatchStartResult(response)}`, 'success');
}

async function stopMultipleListWatchNow() {
    const selectedTargetIds = getSelectedMultipleListWatchTargetIds();
    const targetIds = selectedTargetIds.length > 0
        ? selectedTargetIds
        : Array.isArray(globalThis.__multipleListWatchImmediateTargetIds)
            ? globalThis.__multipleListWatchImmediateTargetIds
            : [];
    if (!targetIds.length) throw new Error('停止する即時監視の対象を選択してください');
    const response = await sendScheduledWatchMessage({ action: 'stopPopupListWatchNow', targetIds });
    if (!response?.success) throw new Error(response?.error || '一覧監視の即時停止に失敗しました');
    await refreshScheduledWatchSitesSafely();
    showMessage(`一覧監視の即時監視を停止しました（停止 ${response.stoppedCount || 0}件）`, 'success');
}

async function setMultipleListWatchTargetEnabled(targetId, enabled) {
    const config = unwrapConfigFromManager(await configManager.loadConfig()) || {};
    const targets = Array.isArray(config.multiple_list_watch_configs) ? config.multiple_list_watch_configs : [];
    const targetIndex = targets.findIndex((target) => target.id === targetId);
    if (targetIndex < 0) throw new Error('一覧監視の対象が見つかりません');
    targets[targetIndex] = { ...targets[targetIndex], enabled };
    config.multiple_list_watch_configs = targets;
    const saved = await configManager.saveConfig(config);
    if (!isConfigSaveSuccessful(saved)) throw new Error('一覧監視設定を保存できませんでした');
    const resync = await sendScheduledWatchMessage({ action: 'resyncScheduledWatchSites' });
    if (!resync?.success) throw new Error(resync?.error || '定時監視アラームを再同期できませんでした');
    renderMultipleListWatchList(config);
    await refreshScheduledWatchSitesSafely();
    showMessage(`一覧監視の予約を${enabled ? '有効化' : '無効化'}しました`, 'success');
}

async function saveMultipleListWatchTarget() {
    const siteId = elements?.multipleListWatchSite?.value || '';
    const profileId = elements?.multipleListWatchProfile?.value || '';
    const profile = getScheduledWatchProfile(siteId, profileId);
    const url = elements?.multipleListWatchUrl?.value.trim() || '';
    if (!profile || !url) throw new Error('サイト、検証済みプロファイル、検索結果・一覧ページURLを設定してください');
    if (new URL(url).hostname.replace(/^www\./, '') !== new URL(profile.url).hostname.replace(/^www\./, '')) {
        throw new Error('選択したサイトと同じホストのURLを入力してください');
    }
    const startTime = elements?.multipleListWatchStartTime?.value || '';
    const endTime = elements?.multipleListWatchEndTime?.value || '';
    const intervalSeconds = Number(elements?.multipleListWatchInterval?.value || 0);
    if (!startTime || !endTime || intervalSeconds < 30) throw new Error('開始・終了時刻と30秒以上の間隔を設定してください');
    if (endTime <= startTime) throw new Error('終了時刻は開始時刻より後に設定してください（日付またぎは未対応です）');
    const config = unwrapConfigFromManager(await configManager.loadConfig()) || {};
    const targets = Array.isArray(config.multiple_list_watch_configs) ? config.multiple_list_watch_configs : [];
    const id = window._editingMultipleListWatchId || `list_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const target = { id, name: elements?.multipleListWatchName?.value.trim() || profile.name || id, siteId, profileId, url, enabled: true, startTime, endTime, intervalSeconds };
    const index = targets.findIndex((item) => item.id === id);
    if (index >= 0) targets[index] = { ...targets[index], ...target }; else targets.push(target);
    config.multiple_list_watch_configs = targets;
    config.multiple_list_watch_common_settings = {
        openProductUrl: elements?.multipleListWatchOpenProductUrl?.checked === true,
        notifyExternalExtension: elements?.multipleListWatchNotifyExternal?.checked === true,
        externalExtensionId: elements?.multipleListWatchExternalId?.value.trim() || '',
        downloadAiSupportFile: elements?.downloadAiSupportFile?.checked === true
    };
    const saved = await configManager.saveConfig(config);
    if (!isConfigSaveSuccessful(saved)) throw new Error('一覧監視設定を保存できませんでした');
    resetMultipleListWatchForm();
    renderMultipleListWatchList(config);
    showMessage('一覧監視設定を保存しました', 'success');
}

function normalizeEcSitePattern(value) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().toLowerCase().replace(/^www\./, '');
}

function getMonitorHostname(url) {
    if (typeof url !== 'string' || !url.trim()) {
        return '';
    }

    try {
        return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch (error) {
        console.warn('URLからホスト名を取得できませんでした:', url, error);
        return '';
    }
}

function findEcSiteByHostname(hostname) {
    if (!hostname || !Array.isArray(ecSitesCache)) {
        return null;
    }

    const matchedSites = ecSitesCache.filter((site) =>
        Array.isArray(site?.patterns) &&
        site.patterns.some((pattern) => {
            const normalizedPattern = normalizeEcSitePattern(pattern);
            return normalizedPattern &&
                (hostname === normalizedPattern || hostname.endsWith(`.${normalizedPattern}`));
        })
    );

    return matchedSites.length === 1 ? matchedSites[0] : null;
}

function findEcSiteByMonitorFields(selector, keyword) {
    if (!Array.isArray(ecSitesCache)) {
        return null;
    }

    const normalizedSelector = typeof selector === 'string' ? selector.trim() : '';
    const normalizedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
    if (!normalizedSelector || !normalizedKeyword) {
        return null;
    }

    const matchedSites = ecSitesCache.filter((site) => {
        const defaults = getEcSiteMonitorDefaultsFromSite(site);
        return defaults.selector === normalizedSelector && defaults.keyword === normalizedKeyword;
    });

    return matchedSites.length === 1 ? matchedSites[0] : null;
}

function resolveEditModalEcSiteName(monitor, selector, keyword) {
    const siteByHostname = findEcSiteByHostname(getMonitorHostname(monitor?.url));
    if (siteByHostname) {
        return siteByHostname.name || siteByHostname.id;
    }

    const siteByFields = findEcSiteByMonitorFields(selector, keyword);
    if (siteByFields) {
        return siteByFields.name || siteByFields.id;
    }

    return '';
}

function getPrimarySelectorValue(value) {
    if (Array.isArray(value)) {
        return typeof value[0] === 'string' ? value[0] : '';
    }

    return typeof value === 'string' ? value : '';
}

function getEcSiteMonitorDefaultsFromSite(site) {
    const productPage = site?.selectors?.productPage;
    const pageRecorderMonitor = productPage?.pageRecorderMonitor;
    const selector = typeof pageRecorderMonitor?.selector === 'string'
        ? pageRecorderMonitor.selector.trim()
        : '';
    const keyword = typeof pageRecorderMonitor?.keyword === 'string'
        ? pageRecorderMonitor.keyword.trim()
        : '';

    if (selector && keyword) {
        return { selector, keyword };
    }

    return {
        selector: getPrimarySelectorValue(productPage?.inStock),
        keyword: getPrimarySelectorValue(productPage?.inStockText)
    };
}

// テストタブのテストサイト候補。監視条件と在庫ありサンプルがあるサイトだけを出し、
// 在庫なしサンプルがなければ在庫なし開始のシナリオを background 側で使えなくする。
function buildTestTabSiteCandidates(ecSites, diagnosisSites) {
    const diagnosisById = new Map((diagnosisSites || []).map((site) => [site?.id, site]));
    const findSampleUrls = (diagnosisSite, state) => {
        const urls = (diagnosisSite?.samples || [])
            .filter((item) => item?.state === state && typeof item?.url === 'string' && item.url.trim())
            .map((item) => item.url.trim());
        return [...new Set(urls)];
    };
    return (ecSites || []).map((site) => {
        const defaults = getEcSiteMonitorDefaultsFromSite(site);
        const diagnosisSite = diagnosisById.get(site?.id);
        const inStockUrls = findSampleUrls(diagnosisSite, 'in_stock');
        if (!site?.id || !defaults.selector || !defaults.keyword || !inStockUrls.length) return null;
        return {
            id: site.id,
            name: site.name || site.id,
            selector: defaults.selector,
            keyword: defaults.keyword,
            inStockUrls,
            outOfStockUrls: findSampleUrls(diagnosisSite, 'out_of_stock')
        };
    }).filter(Boolean);
}

function resolveTestTabSiteCandidate(candidates, storedSiteId) {
    const list = Array.isArray(candidates) ? candidates : [];
    return list.find((candidate) => candidate.id === storedSiteId) ||
        list.find((candidate) => candidate.id === 'nissan') ||
        list[0] || null;
}

async function renderSiteDropdowns() {
    const select = elements?.ecSiteSelectKeyword;
    if (!select) {
        return;
    }

    const sites = await loadEcSites();
    const stored = await chrome.storage.local.get('ecSiteEnabled');
    let ecSiteEnabled = stored.ecSiteEnabled || {};
    const normalizedSelection = normalizeSingleEcSiteSelection(ecSiteEnabled);
    if (normalizedSelection.didNormalize) {
        ecSiteEnabled = normalizedSelection.ecSiteEnabled;
        await chrome.storage.local.set({ ecSiteEnabled });
    }

    const selectedSiteId = Object.entries(ecSiteEnabled)
        .find(([, enabled]) => enabled)?.[0] || '';
    select.innerHTML = '<option value="">-- サイトを選択 --</option>';
    sites.forEach((site) => {
        const option = document.createElement('option');
        option.value = site.id;
        option.textContent = site.name || site.id;
        option.selected = site.id === selectedSiteId;
        select.appendChild(option);
    });

    await checkAutoFill(ecSiteEnabled);
    await refreshBulkStockFetchDiagnosisAvailability();
}

async function renderMultipleEcSiteSelect() {
    const select = elements?.multipleEcSiteSelect;
    if (!select) {
        return;
    }

    const sites = await loadEcSites();
    const storage = await chrome.storage.local.get(MULTIPLE_EC_SITE_STORAGE_KEY);
    const selectedSiteId = storage[MULTIPLE_EC_SITE_STORAGE_KEY] || '';

    select.innerHTML = '<option value="">-- サイトを選択 --</option>';

    sites.forEach((site) => {
        const option = document.createElement('option');
        option.value = site.id;
        option.textContent = site.name || site.id;
        option.selected = site.id === selectedSiteId;
        select.appendChild(option);
    });
}

async function handleMultipleEcSiteChange(event) {
    const selectedSiteId = event.target?.value || '';
    await chrome.storage.local.set({
        [MULTIPLE_EC_SITE_STORAGE_KEY]: selectedSiteId
    });

    if (elements?.addMonitorModal?.style.display === 'block' && !window._editingMonitorId) {
        await applySelectedEcSiteToModal();
    }
    await renderMultipleSharedTargetpages();
}

async function handleEcSiteDropdownChange(event) {
    const selectedSiteId = event.target?.value || '';
    const nextEcSiteEnabled = selectedSiteId ? { [selectedSiteId]: true } : {};
    await chrome.storage.local.set({ ecSiteEnabled: nextEcSiteEnabled });
    await renderSiteDropdowns();
}

function findSiteByUrl(url, sites) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace(/^www\./, '');

        for (const site of sites) {
            if (!site.patterns) continue;
            const match = site.patterns.some((pattern) => {
                const normalizedPattern = pattern.replace(/^www\./, '');
                return hostname === normalizedPattern || hostname.endsWith('.' + normalizedPattern);
            });
            if (match) return site;
        }
        return null;
    } catch {
        return null;
    }
}

let targetUrlDebounceTimer = null;

async function handleTargetUrlChange() {
    const url = elements?.targetUrl?.value?.trim();
    if (!url) return;

    const sites = await loadEcSites();
    const matchedSite = findSiteByUrl(url, sites);

    if (matchedSite) {
        const nextEcSiteEnabled = { [matchedSite.id]: true };
        await chrome.storage.local.set({ ecSiteEnabled: nextEcSiteEnabled });
        await renderSiteDropdowns();
    }
}

function normalizeSingleEcSiteSelection(ecSiteEnabled = {}) {
    const selectedIds = Object.entries(ecSiteEnabled)
        .filter(([, enabled]) => enabled)
        .map(([siteId]) => siteId);
    if (selectedIds.length <= 1) return { ecSiteEnabled, didNormalize: false };
    return {
        ecSiteEnabled: Object.fromEntries(Object.keys(ecSiteEnabled).map((siteId) => [siteId, false])),
        didNormalize: true
    };
}

async function checkAutoFill(ecSiteEnabled) {
    const enabledSiteIds = Object.entries(ecSiteEnabled || {})
        .filter(([, enabled]) => enabled)
        .map(([siteId]) => siteId);

    let didChange = false;
    if (enabledSiteIds.length === 1) {
        didChange = autoFillFromEcSites(enabledSiteIds[0]);
    } else {
        didChange = updateMonitorFields('', '');
    }

    if (didChange) {
        scheduleSingleSettingsSave(0);
    }
}

function autoFillFromEcSites(siteId) {
    const site = getEcSiteById(siteId);
    if (!site || !elements?.monitorSelector || !elements?.monitorKeyword) {
        return false;
    }

    const { selector, keyword } = getEcSiteMonitorDefaultsFromSite(site);

    return updateMonitorFields(selector, keyword);
}

function updateMonitorFields(selector, keyword) {
    if (!elements?.monitorSelector || !elements?.monitorKeyword) {
        return false;
    }

    const nextSelector = typeof selector === 'string' ? selector : '';
    const nextKeyword = typeof keyword === 'string' ? keyword : '';
    const didChange =
        elements.monitorSelector.value !== nextSelector ||
        elements.monitorKeyword.value !== nextKeyword;

    if (!didChange) {
        return false;
    }

    elements.monitorSelector.value = nextSelector;
    elements.monitorKeyword.value = nextKeyword;
    return true;
}

function getEcSiteMonitorDefaults(siteId) {
    const site = getEcSiteById(siteId);
    if (!site) {
        return { siteName: '', selector: '', keyword: '' };
    }

    return { siteName: site.name || site.id, ...getEcSiteMonitorDefaultsFromSite(site) };
}

async function applySelectedEcSiteToModal() {
    if (!elements?.modalMonitorSelector || !elements?.modalMonitorKeyword || !elements?.modalEcSiteHint) {
        return;
    }

    const selectedSiteId = elements.multipleEcSiteSelect?.value || '';
    const defaults = getEcSiteMonitorDefaults(selectedSiteId);

    elements.modalEcSiteHint.value = defaults.siteName || 'サイト未選択';
    elements.modalMonitorSelector.value = defaults.selector;
    elements.modalMonitorKeyword.value = defaults.keyword;
}

function setEditModalEcSiteHint(monitor, selector, keyword) {
    if (!elements?.modalEcSiteHint) {
        return;
    }

    elements.modalEcSiteHint.value =
        resolveEditModalEcSiteName(monitor, selector, keyword) ||
        '既存設定を編集中（サイト名の自動入力なし）';
}

function normalizeRecentMonitorUrl(value) {
    const url = typeof value === 'string' ? value.trim() : '';
    if (!url) return '';

    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol) ? url : '';
    } catch (_) {
        return '';
    }
}

function updateRecentMonitorUrlHistory(history, value, limit = RECENT_MONITOR_URL_LIMIT) {
    const url = normalizeRecentMonitorUrl(value);
    const current = (Array.isArray(history) ? history : [])
        .map(normalizeRecentMonitorUrl)
        .filter(Boolean);
    const unique = [...new Set(current)];
    if (!url) return unique.slice(0, limit);
    return [url, ...unique.filter((item) => item !== url)].slice(0, limit);
}

async function rememberRecentMonitorUrl(storageKey, value) {
    const url = normalizeRecentMonitorUrl(value);
    if (!url) return [];

    const stored = await chrome.storage.local.get(storageKey);
    const next = updateRecentMonitorUrlHistory(stored?.[storageKey], url);
    await chrome.storage.local.set({ [storageKey]: next });
    return next;
}

async function renderRecentMonitorUrlOptions(storageKey, datalist) {
    if (!datalist) return;

    const stored = await chrome.storage.local.get(storageKey);
    const urls = updateRecentMonitorUrlHistory(stored?.[storageKey], '');
    datalist.replaceChildren();
    urls.forEach((url) => {
        const option = document.createElement('option');
        option.value = url;
        datalist.appendChild(option);
    });
}

// 初期化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 DOMContentLoaded: 初期化開始');

    // DOM要素を取得
    elements = getElements();
    await restoreSingleUrlActiveSubtab();

    // DOM要素の存在確認
    if (!elements.modeOptions || elements.modeOptions.length === 0) {
        console.error('❌ 重要な DOM要素が見つかりません。HTML構造を確認してください。');
        showMessage('初期化エラー: DOM要素が見つかりません', 'error');
        return;
    }

    // background.jsのMonitoringConfigManagerインスタンスを取得
    configManager = await getConfigManagerFromBackground();

    await Promise.all([loadEcSites(), loadScheduledWatchSitesForPopup()]);
    await Promise.all([
        renderRecentMonitorUrlOptions(SINGLE_KEYWORD_RECENT_URLS_STORAGE_KEY, elements.singleKeywordRecentUrls),
        renderRecentMonitorUrlOptions(SINGLE_SCHEDULED_WATCH_RECENT_URLS_STORAGE_KEY, elements.singleScheduledWatchRecentUrls)
    ]);
    await restoreBulkStockFetchDiagnosis();
    await restoreStockFetchDiagnosis();
    
    // 🔥 重要修正: イベントリスナーを設定読み込み前に実行
    console.log('🎯 Phase 20修正: イベントリスナーを優先設定');
    await setupCollapsibleSections();
    setupEventListeners();
    
    // 設定読み込み（この時点で既にイベントリスナー設定済み）
    console.log('📋 設定読み込み開始（イベントリスナー設定後）');
    await loadSettings();
    // ポップアップは監視開始時に閉じることがあるため、再表示時に
    // Service Worker 側へ保存された二層監視テスト結果を復元する。
    try {
        const twoTierTest = await getTwoTierAcceptanceTestStatus();
        renderTwoTierAcceptanceTestStatus(twoTierTest);
        if (twoTierTest?.active) startTwoTierAcceptanceTestPolling();
    } catch (error) {
        console.warn('二層監視テスト状態の復元に失敗しました:', error);
    }
    try {
        await loadGmailNotificationSettingsForPopup();
    } catch (error) {
        console.error('Gmail 通知設定の読み込みに失敗しました:', error);
        renderGmailNotificationResult({ status: 'api_error', message: '設定を読み込めませんでした' });
    }
    try {
        await loadScheduledWatchDiffTestOptions();
    } catch (error) {
        console.warn('差分検知テスト設定の読み込みに失敗:', error);
    }
    try {
        await restoreInitialDetectedAutoTestStatus();
    } catch (error) {
        console.warn('自動判定状態の復元に失敗:', error);
    }
    try {
        await refreshTestTabSites();
        await restoreTestTabScenarioStatus();
    } catch (error) {
        console.warn('テストタブのサイト・状態の復元に失敗:', error);
    }

    // UI状態更新
    updateStatus();

    // ログレベルを取得してUIに反映
    await loadLogLevel();

    await renderSiteDropdowns();
    await renderDiagnosisSiteDropdown();
    await applyDiagnosisSiteDefaults(elements.diagnosisSiteSelect?.value || '');
    updateDiagnosisTargetTypeUI();
    await renderMultipleEcSiteSelect();
    await renderMultipleSharedTargetpages();
    try {
        await refreshScheduledWatchSitesSafely();
        await refreshScheduledWatchTestStatus();
    } catch (error) {
        console.warn('C 定時監視状態の読み込みに失敗:', error);
    }
    try {
        await refreshMonitoringExecutionHistory();
    } catch (error) {
        console.warn('実行履歴の読み込みに失敗:', error);
        if (elements?.monitoringExecutionHistoryList) elements.monitoringExecutionHistoryList.textContent = '実行履歴を読み込めませんでした';
    }
    startScheduledWatchStatusPolling();

    console.log('✅ DOMContentLoaded: 初期化完了 - Phase 20修正適用済み');

    // 🔧 緊急確認: 初期化完了後のstartAllButton最終状態
    setTimeout(() => {
        console.log('🔍 最終確認: startAllButton状態チェック', {
            elementsStartAllButton: elements?.startAllButton,
            directGetById: document.getElementById('startAllButton'),
            functionsName: 'DOMContentLoaded-final-check'
        });
    }, 100);
    
    // 🔧 追加確認: stopCondition要素の最終状態をログ出力
    setTimeout(() => {
        if (elements.stopCondition) {
            console.log('🔍 初期化完了後のstopCondition最終状態:', {
                value: elements.stopCondition.value,
                selectedIndex: elements.stopCondition.selectedIndex,
                selectedText: elements.stopCondition.options[elements.stopCondition.selectedIndex]?.text,
                containerVisible: elements.stopCustomDurationContainer?.style.display
            });
        }
    }, 500);
});

// background.jsから設定管理インスタンスを取得
async function getConfigManagerFromBackground() {
    try {
        console.log('🔄 Service Worker初期化開始');

    return new Promise((resolve) => {
        console.log('🔄 ConfigManager取得要求送信中...');

        // タイムアウト処理（30秒）
        const timeout = setTimeout(() => {
            console.error('❌ ConfigManager取得タイムアウト');
            console.log('⚠️ フォールバック版ConfigManagerを使用します');
            resolve(getFallbackConfigManager());
        }, 30000); // 30秒に延長

        chrome.runtime.sendMessage({ action: 'getConfigManager' }, (response) => {
            clearTimeout(timeout);

            // Chrome API エラーチェック
            if (chrome.runtime.lastError) {
                console.error('❌ Chrome Runtime エラー:', chrome.runtime.lastError);
                console.log('⚠️ フォールバック版ConfigManagerを使用します');
                resolve(getFallbackConfigManager());
                return;
            }

            console.log('📥 getConfigManager応答:', response);

            if (response && response.success) {
                console.log('✅ 正常版ConfigManagerを使用します');
                // 簡易的な設定管理オブジェクトを作成
                resolve({
                    async loadConfig() {
                        return new Promise((resolve) => {
                            chrome.runtime.sendMessage({ action: 'loadConfig' }, resolve);
                        });
                    },
                    async saveConfig(config) {
                        return new Promise((resolve) => {
                            chrome.runtime.sendMessage({ action: 'saveConfig', config }, resolve);
                        });
                    },
                    async changeMode(mode) {
                        console.log('📤 changeMode要求送信:', mode);
                        return new Promise((resolve) => {
                            chrome.runtime.sendMessage({ action: 'changeMode', mode }, (response) => {
                                console.log('📥 changeMode応答:', response);
                                resolve(response);
                            });
                        });
                    },
                    async addMonitoringTarget(target) {
                        return new Promise((resolve) => {
                            chrome.runtime.sendMessage({ action: 'addMonitoringTarget', target }, resolve);
                        });
                    },
                    async removeMonitoringTarget(targetId) {
                        return new Promise((resolve) => {
                            chrome.runtime.sendMessage({ action: 'removeMonitoringTarget', targetId }, resolve);
                        });
                    },
                    async updateMonitoringTarget(targetId, updates) {
                        return new Promise((resolve) => {
                            chrome.runtime.sendMessage({ action: 'updateMonitoringTarget', targetId, updates }, (response) => {
                                console.log('📥 updateMonitoringTarget応答:', response);
                                if (response && response.success) {
                                    resolve(true);
                                } else {
                                    console.error('❌ updateMonitoringTarget失敗:', response);
                                    resolve(false);
                                }
                            });
                        });
                    }
                });
            } else {
                // フォールバック: エラーハンドリング
                console.error('❌ ConfigManager取得に失敗、フォールバック版を使用します');
                console.error('応答内容:', response);
                if (response && response.error) {
                    console.error('背景エラー詳細:', response.error);
                }
                resolve(getFallbackConfigManager());
            }
        });
    });

    } catch (error) {
        console.error('❌ getConfigManagerFromBackgroundでエラーが発生:', error);
        console.log('⚠️ フォールバック版ConfigManagerを使用します');
        return getFallbackConfigManager();
    }
}

// フォールバック版ConfigManager（通信失敗時用）
function getFallbackConfigManager() {
    console.warn('⚠️ フォールバック版ConfigManagerを作成 - 機能制限あり');
    return {
                    async loadConfig() {
                        console.warn('⚠️ フォールバック版loadConfig - chrome.storage.local を優先して設定を返します');

                        try {
                            const storedConfig = await readMonitoringConfigFromChromeStorage();
                            if (storedConfig) {
                                const resolvedData = resolveMultipleMonitoringCollections(storedConfig);
                                console.log('📊 フォールバック版loadConfig データ解決:', {
                                    selectedSource: resolvedData.selectedSource,
                                    multipleConfigsCount: resolvedData.multipleConfigs.length,
                                    selectedCount: resolvedData.selectedTargets.length
                                });

                                return {
                                    success: true,
                                    config: {
                                        ...storedConfig,
                                        mode: storedConfig.mode || 'single',
                                        single_config: storedConfig.single_config || {
                                            url: '',
                                            settings: {}
                                        },
                                        multiple_configs: resolvedData.multipleConfigs
                                    }
                                };
                            }

                            // ローカルストレージから保存されたモードを取得
                            const savedMode = localStorage.getItem('fallback_mode') || 'single';

                            // ローカル保存された監視対象を取得
                            const targetsKey = 'fallback_monitoring_targets';
                            const savedTargets = localStorage.getItem(targetsKey);
                            const multipleConfigs = savedTargets ? JSON.parse(savedTargets) : [];

                            console.log('📊 フォールバック版loadConfig ローカル保存解決:', {
                                selectedSource: 'fallback_monitoring_targets',
                                multipleConfigsCount: multipleConfigs.length,
                                selectedCount: multipleConfigs.length
                            });

                            // 設定を返す
                            return {
                                success: true,
                                config: {
                                    mode: savedMode,
                                    version: '1.7.0',
                                    single_config: {
                                        url: '',
                                        settings: {}
                                    },
                                    multiple_configs: multipleConfigs
                                }
                            };
                        } catch (error) {
                            console.error('❌ フォールバック版loadConfigエラー:', error);
                            // エラー時はデフォルト設定を返す
                            return {
                                success: true,
                                config: {
                                    mode: 'single',
                                    version: '1.7.0',
                                    single_config: {
                                        url: '',
                                        settings: {}
                                    },
                                    multiple_configs: []
                                }
                            };
                        }
                    },
                    async saveConfig(config) {
            console.error('❌ フォールバック版saveConfig - 設定保存は利用できません');
            showMessage('設定保存エラー: background.jsとの通信に失敗', 'error');
                        return false;
                    },
                    async changeMode(mode) {
                        console.warn('⚠️ フォールバック版changeMode - ローカル状態のみ変更');
                        console.log('要求されたモード:', mode);

                        // ローカル状態を変更してUIの動作を可能にする
                        try {
                            // ローカルストレージにモードを保存
                            localStorage.setItem('fallback_mode', mode);

                            // 成功メッセージを表示
                            showMessage(`モード変更: ${mode} (フォールバック版)`, 'success');

                            console.log('✅ フォールバック版モード変更完了:', mode);
                            return { success: true, mode: mode };
                        } catch (error) {
                            console.error('❌ フォールバック版モード変更エラー:', error);
                            showMessage(`モード変更エラー: ${error.message}`, 'error');
                            return { success: false, error: error.message };
                        }
                    },
                                        async addMonitoringTarget(target) {
                        console.warn('⚠️ フォールバック版addMonitoringTarget - ローカル保存で監視対象を追加');

                        try {
                            // 既存の監視対象を取得
                            const existingKey = 'fallback_monitoring_targets';
                            const existing = localStorage.getItem(existingKey);
                            const targets = existing ? JSON.parse(existing) : [];

                            // 新しい監視対象を追加
                            const newTarget = {
                                id: target.id || `fallback_${Date.now()}`,
                                name: target.name || target.monitorName || '未設定',
                                url: target.url || '',
                                enabled: target.enabled !== false,
                                keyword: target.keyword || target.monitorKeyword || '',
                                selector: target.selector || 'body',
                                detectMode: target.detectMode || '出現検知',
                                interval: target.interval || 30,
                                duration: target.duration || 60,
                                stopCondition: target.stopCondition || '時間経過',
                                downloadFormat: target.downloadFormat || 'screenshot,page_source',
                                initialDetection: target.initialDetection !== false,
                                notification: target.notification !== false,
                                createdAt: target.createdAt || new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };

                            targets.push(newTarget);

                            // ローカルストレージに保存
                            localStorage.setItem(existingKey, JSON.stringify(targets));

                            console.log('✅ フォールバック版で監視対象追加完了:', newTarget);
                            console.log('📊 現在のローカル保存監視対象数:', targets.length);

                            return {
                                success: true,
                                target: newTarget,
                                message: 'フォールバック版で監視対象を追加しました（ローカル保存済み）',
                                totalCount: targets.length
                            };

                        } catch (error) {
                            console.error('❌ フォールバック版addMonitoringTargetエラー:', error);
                            return {
                                success: false,
                                error: `フォールバック版での監視対象追加に失敗しました: ${error.message}`
                            };
                        }
                    },
                    async removeMonitoringTarget(targetId) {
            console.error('❌ フォールバック版removeMonitoringTarget - 監視対象削除は利用できません');
                        return false;
                    },
                    async exportToExcel(format = 'csv') {
                        console.warn('⚠️ フォールバック版exportToExcel - 基本的なCSV出力を実行');

                        try {
                            // 基本的なCSVデータを生成
                            const csvData = [
                                ['ID', '監視名', 'URL', '有効状態', '監視キーワード', 'セレクター', '検知モード', '監視間隔(秒)', '監視時間(分)', '停止条件', 'ダウンロード形式', '初期検知', '通知設定', '作成日時', '更新日時'],
                                ['1', 'サンプル監視対象', 'https://example.com', '有効', 'サンプルキーワード', 'body', '出現検知', '30', '60', '時間経過', 'screenshot,page_source', '有効', '有効', new Date().toISOString(), new Date().toISOString()]
                            ];

                            // CSV文字列を生成
                            const csvContent = csvData.map(row =>
                                row.map(cell => `"${cell}"`).join(',')
                            ).join('\n');

                            // Blobを作成
                            const blob = new Blob([csvContent], { type: 'text/csv; charset=utf-8' });

                            // ファイル名を生成
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                            const filename = `監視設定リスト_${timestamp}.csv`;

                            return {
                                success: true,
                                blob: blob,
                                filename: filename,
                                format: 'csv',
                                message: 'フォールバック版CSV出力（基本的なサンプルデータ）'
                            };
                        } catch (error) {
                            console.error('フォールバック版CSV出力エラー:', error);
                            return {
                                success: false,
                                error: 'フォールバック版でのCSV出力に失敗しました'
                            };
                        }
                    },
                    async importFromExcel(fileData) {
                        console.warn('⚠️ フォールバック版importFromExcel - 基本的なCSV取込を実行');

                        try {
                            // ファイルデータをテキストとして読み込み
                            const textDecoder = new TextDecoder('utf-8');
                            const csvText = textDecoder.decode(fileData);

                            // CSV行を分割
                            const lines = csvText.split('\n').filter(line => line.trim());

                            if (lines.length < 2) {
                                return {
                                    success: false,
                                    error: 'CSVファイルにデータが不足しています（ヘッダー行とデータ行が必要）'
                                };
                            }

                            // ヘッダー行を解析
                            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
                            console.log('📋 検出されたヘッダー:', headers);

                            // データ行を解析
                            const importedData = [];
                            for (let i = 1; i < lines.length; i++) {
                                const line = lines[i];
                                if (!line.trim()) continue;

                                // CSV行を分割（カンマ区切り、ダブルクォート対応）
                                const values = line.match(/(".*?"|[^,]+)/g)?.map(v => v.replace(/"/g, '').trim()) || [];

                                if (values.length >= 3) { // 最低限ID, 監視名, URLが必要
                                    const row = {
                                        id: values[0] || `fallback_${Date.now()}_${i}`,
                                        name: values[1] || '未設定',
                                        url: values[2] || '',
                                        enabled: values[3] === '有効' || values[3] === 'true',
                                        keyword: values[4] || '',
                                        selector: values[5] || 'body',
                                        detectMode: values[6] || '出現検知',
                                        interval: parseInt(values[7]) || 30,
                                        duration: parseInt(values[8]) || 60,
                                        stopCondition: values[9] || '時間経過',
                                        downloadFormat: values[10] || 'screenshot,page_source',
                                        initialDetection: values[11] === '有効' || values[11] === 'true',
                                        notification: values[12] === '有効' || values[12] === 'true',
                                        createdAt: values[13] || new Date().toISOString(),
                                        updatedAt: values[14] || new Date().toISOString()
                                    };

                                    importedData.push(row);
                                    console.log(`✅ 行${i+1}のデータ解析完了:`, row);
                                } else {
                                    console.warn(`⚠️ 行${i+1}のデータが不足:`, values);
                                }
                            }

                            if (importedData.length === 0) {
                                return {
                                    success: false,
                                    error: '有効なデータが見つかりませんでした'
                                };
                            }

                            // ローカルストレージに一時保存
                            const importKey = `excel_import_${Date.now()}`;
                            localStorage.setItem(importKey, JSON.stringify(importedData));

                            console.log(`✅ フォールバック版CSV取込完了: ${importedData.length}件`);

                            return {
                                success: true,
                                importedCount: importedData.length,
                                data: importedData,
                                message: `フォールバック版で${importedData.length}件のデータを取込しました（ローカル保存済み）`,
                                importKey: importKey
                            };

                        } catch (error) {
                            console.error('❌ フォールバック版CSV取込エラー:', error);
                            return {
                                success: false,
                                error: `フォールバック版でのCSV取込に失敗しました: ${error.message}`
                            };
                        }
                    }
                };
            }

function unwrapConfigFromManager(response) {
    if (!response) return null;
    if (response.success === true && response.config) return response.config;
    const normalizedStatus = normalizeGetStatusResponse(response);
    if (normalizedStatus?.mode !== undefined) return normalizedStatus;
    return null;
}

function isConfigSaveSuccessful(response) {
    return response === true || response?.success === true;
}

function collectUISettingsForSingleMode() {
    const stopCustomDurationValue =
        elements.stopCustomDuration?.value ||
        elements.stopCustomDuration?.defaultValue ||
        60;

    return {
        downloadSource: elements.downloadSource.checked,
        downloadSourceWithoutFooter: elements.downloadSourceWithoutFooter.checked,
        downloadScreenshot: elements.downloadScreenshot.checked,
        downloadAiSupportFile: elements.downloadAiSupportFile.checked,
        captureMode: elements.captureMode?.value === 'fetch' ? 'fetch' : 'reload',
        monitorType: elements.monitorActiveTab.checked ? 'activeTab' : 'url',
        targetUrl: elements.targetUrl.value,
        monitorSelector: elements.monitorSelector.value,
        monitorKeyword: elements.monitorKeyword.value,
        detectMode: elements.detectAppear.checked ? 'appear' : 'disappear',
        initialKeywordDetection: elements.initialKeywordDetection.checked,
        monitoringMode: elements.monitoringMode ? elements.monitoringMode.value : 'high_frequency',
        interval:
            elements.interval.value === 'custom'
                ? parseInt(elements.customInterval.value)
                : parseInt(elements.interval.value),
        duration:
            elements.duration.value === 'custom'
                ? parseInt(elements.customDuration.value) * 60
                : parseInt(elements.duration.value),
        stopCondition: elements.stopCondition.value,
        customInterval: parseInt(elements.customInterval.value),
        customDuration: parseInt(elements.customDuration.value),
        stopCustomDuration: parseInt(stopCustomDurationValue),
        stopCount: parseInt(elements.stopCount.value)
    };
}

function normalizeTargetpageProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    const { id, environment, siteId, externalExtensionId } = profile;
    if (
        typeof id !== 'string' || !id ||
        !['test', 'prod'].includes(environment) ||
        typeof siteId !== 'string' || !siteId ||
        typeof externalExtensionId !== 'string' || !externalExtensionId
    ) {
        return null;
    }
    return { id, environment, siteId, externalExtensionId };
}

async function loadSharedTargetpages() {
    if (sharedTargetpagesCache) return sharedTargetpagesCache;
    const response = await fetch(chrome.runtime.getURL('src/config/page-recorder-targetpages.json'));
    if (!response.ok) throw new Error(`targetpage 設定を読み込めません (${response.status})`);
    const data = await response.json();
    sharedTargetpagesCache = Array.isArray(data?.targets) ? data.targets : [];
    return sharedTargetpagesCache;
}

function getSharedTargetpageSites(targets, environment) {
    return [...new Set(targets
        .filter((target) => target.environment === environment)
        .map((target) => target.siteId)
        .filter(Boolean))];
}

function filterSharedTargetpages(targets, environment, siteId = '') {
    return targets.filter((target) => target.environment === environment && (!siteId || target.siteId === siteId));
}

function getSharedTargetpageDisplayName(target) {
    const title = target?.title || target?.name || target?.id || '';
    const stateLabel = target?.state === 'in_stock'
        ? '🟢 在庫あり｜'
        : target?.state === 'out_of_stock'
            ? '⚪ 在庫なし｜'
            : '';
    return `${stateLabel}${title}`;
}

function normalizeMonitoringTargetUrl(url) {
    const value = typeof url === 'string' ? url.trim() : '';
    if (!value) return '';
    try {
        return new URL(value).href;
    } catch (_) {
        return value;
    }
}

function filterUnregisteredSharedTargetpages(targets, monitoringConfigs = []) {
    const configuredUrlSet = new Set((Array.isArray(monitoringConfigs) ? monitoringConfigs : [])
        .map((config) => normalizeMonitoringTargetUrl(config?.url))
        .filter(Boolean));
    return (Array.isArray(targets) ? targets : [])
        .filter((target) => !configuredUrlSet.has(normalizeMonitoringTargetUrl(target?.url)));
}

function getAvailableMultipleSharedTargetpages(targets, monitoringConfigs = [], environment = 'test', siteId = '') {
    return filterUnregisteredSharedTargetpages(targets, monitoringConfigs)
        .filter((target) => target.environment === environment)
        .filter((target) => !siteId || target.siteId === siteId);
}

function groupMultipleSharedTargetpagesByState(targets = []) {
    const groups = [
        { state: 'in_stock', label: '🟢 在庫あり' },
        { state: 'out_of_stock', label: '⚪ 在庫なし' }
    ].map((group) => ({
        ...group,
        targets: targets.filter((target) => target?.state === group.state)
    })).filter((group) => group.targets.length > 0);

    const otherTargets = targets.filter((target) => !['in_stock', 'out_of_stock'].includes(target?.state));
    if (otherTargets.length > 0) groups.push({ state: 'other', label: 'その他', targets: otherTargets });
    return groups;
}

function buildSharedTargetpageMultipleMonitoringTarget(target, commonSettings = {}) {
    const monitor = target?.monitor || {};
    const targetpage = normalizeTargetpageProfile({
        id: target?.id,
        environment: target?.environment,
        siteId: target?.siteId,
        externalExtensionId: target?.notification?.externalExtensionId
    });
    if (!target || !targetpage || typeof target.url !== 'string' || !target.url || !monitor.selector || !monitor.keyword) {
        throw new Error('選択した targetpage の設定が不正です');
    }

    const detectionMode = monitor.detectMode === 'disappear' ? 'disappear' : 'appear';
    return {
        name: target.title || target.name || target.id,
        url: target.url,
        selector: monitor.selector,
        keyword: monitor.keyword,
        detection_mode: detectionMode,
        settings: {
            monitorKeyword: monitor.keyword,
            monitorSelector: monitor.selector,
            detectMode: detectionMode,
            initialKeywordDetection: commonSettings.initialKeywordDetection,
            interval: commonSettings.interval,
            duration: commonSettings.duration,
            reloadWaitAfterReload: commonSettings.reloadWaitAfterReload,
            downloadSource: true,
            downloadSourceWithoutFooter: false,
            downloadScreenshot: true,
            targetpage,
            notifyExternalExtension: true,
            externalExtensionId: targetpage.externalExtensionId
        },
        enabled: true
    };
}

async function renderMultipleSharedTargetpages(monitoringConfigs = latestMultipleConfigs) {
    if (!elements?.multipleSharedTargetpageSelect || !elements?.multipleSharedTargetpageEnvironment) return;

    const targets = await loadSharedTargetpages();
    const environment = elements.multipleSharedTargetpageEnvironment.value || 'test';
    const selectedSiteId = elements.multipleEcSiteSelect?.value || '';
    const availableTargets = getAvailableMultipleSharedTargetpages(targets, monitoringConfigs, environment, selectedSiteId);

    elements.multipleSharedTargetpageSelect.replaceChildren(new Option('商品を選択', ''));
    groupMultipleSharedTargetpagesByState(availableTargets).forEach((group) => {
        const optionGroup = document.createElement('optgroup');
        optionGroup.label = group.label;
        group.targets.forEach((target) => {
            optionGroup.appendChild(new Option(target.title || target.name || target.id, target.id));
        });
        elements.multipleSharedTargetpageSelect.add(optionGroup);
    });
}

async function addSharedTargetpageToMultipleMonitoring() {
    const targetId = elements?.multipleSharedTargetpageSelect?.value;
    if (!targetId) {
        showMessage('追加する商品を選択してください', 'error');
        return;
    }

    const [targets, rawConfig] = await Promise.all([
        loadSharedTargetpages(),
        configManager.loadConfig()
    ]);
    const target = targets.find((item) => item.id === targetId);
    const config = unwrapConfigFromManager(rawConfig) || {};
    const existingTargets = Array.isArray(config.multiple_configs) ? config.multiple_configs : [];
    const availableTargetIds = new Set(filterUnregisteredSharedTargetpages(targets, existingTargets).map((item) => item.id));

    if (!target || !availableTargetIds.has(target.id)) {
        await renderMultipleSharedTargetpages(existingTargets);
        showMessage('この商品はすでに監視対象へ追加されています', 'error');
        return;
    }
    const targetLabel = target.title || target.name || target.id;
    if (target.environment === 'prod' && !window.confirm(`prod targetpage「${targetLabel}」を追加しますか？`)) {
        return;
    }

    const { commonSettings } = await getSyncedMultipleMonitoringStartData();
    const monitoringTarget = buildSharedTargetpageMultipleMonitoringTarget(target, commonSettings);
    const result = await configManager.addMonitoringTarget(monitoringTarget);
    if (!result || result.success === false) {
        throw new Error('共有 targetpage を監視対象へ追加できませんでした');
    }

    const latestRawConfig = await configManager.loadConfig();
    const latestConfig = unwrapConfigFromManager(latestRawConfig) || {};
    loadMultipleModeSettings(latestConfig.multiple_configs || []);
    showMessage(`共有 targetpage「${targetLabel}」を監視対象へ追加しました`, 'success');
}

async function renderSharedTargetpages() {
    if (!elements?.sharedTargetpageSelect || !elements?.sharedTargetpageEnvironment || !elements?.sharedTargetpageSite) return;
    const [targets, ecSites] = await Promise.all([loadSharedTargetpages(), loadEcSites()]);
    const environment = elements.sharedTargetpageEnvironment.value || 'test';
    const selectedId = selectedTargetpageProfile?.id || '';
    const selectedTarget = targets.find((target) => target.id === selectedId && target.environment === environment);
    const siteIds = getSharedTargetpageSites(targets, environment);
    const selectedSiteId = selectedTarget?.siteId || elements.sharedTargetpageSite.value;

    elements.sharedTargetpageSite.replaceChildren(new Option('すべてのサイト', ''));
    siteIds.forEach((siteId) => {
        const site = ecSites.find((candidate) => candidate.id === siteId);
        elements.sharedTargetpageSite.add(new Option(site?.name || siteId, siteId));
    });
    elements.sharedTargetpageSite.value = siteIds.includes(selectedSiteId) ? selectedSiteId : '';

    elements.sharedTargetpageSelect.replaceChildren(new Option('手入力', ''));
    filterSharedTargetpages(targets, environment, elements.sharedTargetpageSite.value).forEach((target) => {
        elements.sharedTargetpageSelect.add(new Option(getSharedTargetpageDisplayName(target), target.id));
    });
    elements.sharedTargetpageSelect.value = filterSharedTargetpages(targets, environment, elements.sharedTargetpageSite.value)
        .some((target) => target.id === selectedId)
        ? selectedId
        : '';
    renderTargetpageNotificationStatus();
}

function renderTargetpageNotificationStatus() {
    if (!elements?.targetpageNotificationStatus) return;
    const profile = normalizeTargetpageProfile(selectedTargetpageProfile);
    elements.targetpageNotificationStatus.textContent = profile
        ? `AutoCartAgent 通知: 有効（${profile.environment} / ${profile.siteId}）`
        : 'AutoCartAgent 通知: 無効（共有 targetpage を選択すると有効）';
}

function clearSharedTargetpageSelection() {
    if (isApplyingSharedTargetpage || !selectedTargetpageProfile) return;
    selectedTargetpageProfile = null;
    if (elements?.sharedTargetpageSelect) elements.sharedTargetpageSelect.value = '';
    renderTargetpageNotificationStatus();
}

async function applySharedTargetpage() {
    const targetId = elements?.sharedTargetpageSelect?.value;
    if (!targetId) {
        selectedTargetpageProfile = null;
        renderTargetpageNotificationStatus();
        scheduleSingleSettingsSave(0);
        return;
    }
    const targets = await loadSharedTargetpages();
    const target = targets.find((item) => item.id === targetId);
    const profile = normalizeTargetpageProfile({
        ...target,
        externalExtensionId: target?.notification?.externalExtensionId
    });
    if (!target || !profile || !target.monitor || typeof target.url !== 'string') {
        throw new Error('選択した targetpage の設定が不正です');
    }
    if (target.environment === 'prod' && !window.confirm(`prod targetpage「${target.name || target.id}」を設定しますか？`)) {
        elements.sharedTargetpageSelect.value = '';
        return;
    }

    isApplyingSharedTargetpage = true;
    try {
        selectedTargetpageProfile = profile;
        elements.monitorUrl.checked = true;
        elements.urlContainer.style.display = 'block';
        elements.targetUrl.value = target.url;
        elements.monitorSelector.value = target.monitor.selector || '';
        elements.monitorKeyword.value = target.monitor.keyword || '';
        elements.detectDisappear.checked = target.monitor.detectMode === 'disappear';
        elements.detectAppear.checked = !elements.detectDisappear.checked;
    } finally {
        isApplyingSharedTargetpage = false;
    }
    renderTargetpageNotificationStatus();
    await flushSingleSettingsSave();
    showMessage(`共有 targetpage「${target.name || target.id}」を設定しました`, 'success');
}

function buildSingleConfigFromUISettings(settings) {
    const candidate = typeof selectedTargetpageProfile !== 'undefined'
        ? selectedTargetpageProfile
        : null;
    const targetpage = candidate &&
        typeof candidate.id === 'string' && candidate.id &&
        ['test', 'prod'].includes(candidate.environment) &&
        typeof candidate.siteId === 'string' && candidate.siteId &&
        typeof candidate.externalExtensionId === 'string' && candidate.externalExtensionId
        ? candidate
        : null;
    return {
        url: settings.monitorType === 'url' ? settings.targetUrl : '',
        settings: {
            downloadSource: settings.downloadSource,
            downloadSourceWithoutFooter: settings.downloadSourceWithoutFooter,
            downloadScreenshot: settings.downloadScreenshot,
            downloadAiSupportFile: settings.downloadAiSupportFile,
            captureMode: settings.captureMode === 'fetch' ? 'fetch' : 'reload',
            monitorSelector: settings.monitorSelector,
            monitorKeyword: settings.monitorKeyword,
            detectMode: settings.detectMode,
            initialKeywordDetection: settings.initialKeywordDetection,
            monitoringMode: settings.monitoringMode,
            interval: settings.interval,
            duration: settings.duration,
            stopCondition: settings.stopCondition,
            stopCount: settings.stopCount,
            stopCustomDuration: settings.stopCustomDuration,
            ...(targetpage ? {
                targetpage,
                notifyExternalExtension: true,
                externalExtensionId: targetpage.externalExtensionId
            } : {})
        }
    };
}

function collectSingleScheduledWatchFromUI() {
    const immediateDurationMinutes = parseInt(elements.singleScheduledWatchImmediateDuration?.value, 10);
    return {
        url: elements.singleScheduledWatchUrl?.value.trim() || '',
        monitorSelector: elements.singleScheduledWatchSelector?.value.trim() || '',
        siteId: elements.singleScheduledWatchSite?.value || '',
        profileId: elements.singleScheduledWatchProfile?.value || '',
        enabled: elements.singleScheduledWatchEnabled?.checked === true,
        startTime: elements.singleScheduledWatchStart?.value || '11:57',
        endTime: elements.singleScheduledWatchEnd?.value || '12:05',
        intervalSeconds: parseInt(elements.singleScheduledWatchInterval?.value, 10) || 30,
        immediateDurationMinutes: Number.isFinite(immediateDurationMinutes) ? immediateDurationMinutes : 3,
        openDetectedUrl: elements.singleScheduledWatchOpenDetectedUrl?.checked === true,
        notifyExternalExtension: elements.singleScheduledWatchNotifyExternal?.checked === true,
        externalExtensionId: elements.singleScheduledWatchExternalExtensionId?.value.trim() || '',
        discordChannelId: elements.singleScheduledWatchDiscordChannelId?.value.trim() || ''
    };
}

function loadSingleScheduledWatchSettings(singleScheduledWatch = {}) {
    if (!elements) return;
    renderSingleScheduledWatchSiteSelect(singleScheduledWatch);
    renderSingleScheduledWatchProfileSelect(singleScheduledWatch.siteId || '', singleScheduledWatch.profileId || '');
    if (elements.singleScheduledWatchEnabled) elements.singleScheduledWatchEnabled.checked = singleScheduledWatch.enabled === true;
    if (elements.singleScheduledWatchUrl) elements.singleScheduledWatchUrl.value = singleScheduledWatch.url || '';
    if (elements.singleScheduledWatchSelector) elements.singleScheduledWatchSelector.value = singleScheduledWatch.monitorSelector || '';
    if (elements.singleScheduledWatchStart) elements.singleScheduledWatchStart.value = singleScheduledWatch.startTime || '11:57';
    if (elements.singleScheduledWatchEnd) elements.singleScheduledWatchEnd.value = singleScheduledWatch.endTime || '12:05';
    if (elements.singleScheduledWatchInterval) elements.singleScheduledWatchInterval.value = singleScheduledWatch.intervalSeconds || 30;
    if (elements.singleScheduledWatchImmediateDuration) elements.singleScheduledWatchImmediateDuration.value = singleScheduledWatch.immediateDurationMinutes || 3;
    if (elements.singleScheduledWatchOpenDetectedUrl) elements.singleScheduledWatchOpenDetectedUrl.checked = singleScheduledWatch.openDetectedUrl === true;
    if (elements.singleScheduledWatchNotifyExternal) elements.singleScheduledWatchNotifyExternal.checked = singleScheduledWatch.notifyExternalExtension === true;
    if (elements.singleScheduledWatchExternalExtensionId) elements.singleScheduledWatchExternalExtensionId.value = singleScheduledWatch.externalExtensionId || '';
    if (elements.singleScheduledWatchDiscordChannelId) elements.singleScheduledWatchDiscordChannelId.value = singleScheduledWatch.discordChannelId || '';
}

async function applySingleScheduledWatchProfile(siteId, profileId) {
    const profile = getScheduledWatchProfile(siteId, profileId);
    if (!profile) return false;

    if (elements.singleScheduledWatchSite) elements.singleScheduledWatchSite.value = siteId;
    renderSingleScheduledWatchProfileSelect(siteId, profileId);
    if (elements.singleScheduledWatchUrl) elements.singleScheduledWatchUrl.value = profile.url;
    if (elements.singleScheduledWatchSelector) elements.singleScheduledWatchSelector.value = profile.productSelector;
    const schedule = profile.schedules?.[0];
    if (schedule) {
        if (elements.singleScheduledWatchStart) elements.singleScheduledWatchStart.value = schedule.startTime;
        if (elements.singleScheduledWatchEnd) elements.singleScheduledWatchEnd.value = schedule.endTime;
        if (elements.singleScheduledWatchInterval) elements.singleScheduledWatchInterval.value = schedule.intervalSeconds;
    }
    await saveSingleScheduledWatchSettings();
    await rememberRecentMonitorUrl(SINGLE_SCHEDULED_WATCH_RECENT_URLS_STORAGE_KEY, profile.url);
    await renderRecentMonitorUrlOptions(SINGLE_SCHEDULED_WATCH_RECENT_URLS_STORAGE_KEY, elements.singleScheduledWatchRecentUrls);
    return true;
}

async function handleSingleScheduledWatchSiteChange(event) {
    const siteId = event.target?.value || '';
    if (!siteId) {
        renderSingleScheduledWatchProfileSelect();
        await saveSingleScheduledWatchSettings();
        return;
    }
    const profile = getDefaultScheduledWatchProfile(siteId);
    if (profile) await applySingleScheduledWatchProfile(siteId, profile.id);
}

async function handleSingleScheduledWatchProfileChange(event) {
    const siteId = elements?.singleScheduledWatchSite?.value || '';
    const profileId = event.target?.value || '';
    if (!profileId) {
        await saveSingleScheduledWatchSettings();
        return;
    }
    await applySingleScheduledWatchProfile(siteId, profileId);
}

function clearSingleScheduledWatchProfileSelection() {
    if (elements?.singleScheduledWatchSite) elements.singleScheduledWatchSite.value = '';
    renderSingleScheduledWatchProfileSelect();
}

function formatLocalTimeHHMM(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function getSingleScheduledWatchTimePreset(now = new Date()) {
    return {
        startTime: formatLocalTimeHHMM(new Date(now.getTime() + 2 * 60 * 1000)),
        endTime: formatLocalTimeHHMM(new Date(now.getTime() + 3 * 60 * 1000))
    };
}

function getMultipleListWatchTimePreset(now = new Date()) {
    return getSingleScheduledWatchTimePreset(now);
}

async function setSingleScheduledWatchTimesFromNow() {
    const preset = getSingleScheduledWatchTimePreset();
    if (elements?.singleScheduledWatchStart) elements.singleScheduledWatchStart.value = preset.startTime;
    if (elements?.singleScheduledWatchEnd) elements.singleScheduledWatchEnd.value = preset.endTime;
    await saveSingleScheduledWatchSettings();
    showMessage('開始時刻を現在＋2分、終了時刻を現在＋3分に設定しました', 'success');
}

function collectSingleKeywordScheduleFromUI() {
    return {
        enabled: elements?.singleKeywordScheduleEnabled?.checked === true,
        startTime: elements?.singleKeywordScheduleTime?.value || '11:57'
    };
}

function loadSingleKeywordScheduleSettings(schedule = {}) {
    if (elements?.singleKeywordScheduleEnabled) {
        elements.singleKeywordScheduleEnabled.checked = schedule.enabled === true;
    }
    if (elements?.singleKeywordScheduleTime) {
        elements.singleKeywordScheduleTime.value = schedule.startTime || '11:57';
    }
    updateSingleKeywordScheduleControls();
}

function updateSingleKeywordScheduleControls() {
    const canSchedule = elements?.monitorUrl?.checked === true;
    [
        elements?.singleKeywordScheduleEnabled,
        elements?.singleKeywordScheduleTime,
        elements?.setSingleKeywordScheduleTimeFromNowButton
    ].filter(Boolean).forEach((control) => { control.disabled = !canSchedule; });
    if (elements?.singleKeywordScheduleHint) {
        elements.singleKeywordScheduleHint.textContent = canSchedule
            ? '予約は保存済みの商品ページURLを新しいタブで開いて開始します。'
            : '予約は「商品ページURLを指定」を選んだ場合に利用できます。';
    }
    return canSchedule;
}

async function setSingleKeywordScheduleTimeFromNow() {
    const startTime = formatLocalTimeHHMM(new Date(Date.now() + 2 * 60 * 1000));
    if (elements?.singleKeywordScheduleTime) elements.singleKeywordScheduleTime.value = startTime;
    await saveSettings();
    showMessage('開始時刻を現在＋2分に設定しました', 'success');
}

function setMultipleListWatchTimesFromNow() {
    const preset = getMultipleListWatchTimePreset();
    if (elements?.multipleListWatchStartTime) elements.multipleListWatchStartTime.value = preset.startTime;
    if (elements?.multipleListWatchEndTime) elements.multipleListWatchEndTime.value = preset.endTime;
    showMessage('開始時刻を現在＋2分、終了時刻を現在＋3分に入力しました', 'success');
}

async function setMultipleScheduledMonitoringTimeFromNow() {
    const startTime = formatLocalTimeHHMM(new Date(Date.now() + 2 * 60 * 1000));
    if (elements?.multiScheduleTime) elements.multiScheduleTime.value = startTime;
    const saved = await saveMultipleModeCommonSettings({ showScheduleMessage: true });
    if (!saved) throw new Error('毎日一括開始予約の開始時刻を保存できませんでした');
    showMessage('開始時刻を現在＋2分に設定して保存しました', 'success');
}

async function saveSingleScheduledWatchSettings() {
    const raw = await configManager.loadConfig();
    const config = unwrapConfigFromManager(raw) || { mode: 'single', single_config: { url: '', settings: {} } };
    config.single_scheduled_watch = collectSingleScheduledWatchFromUI();
    config.last_updated = new Date().toISOString();
    const saved = await configManager.saveConfig(config);
    if (!isConfigSaveSuccessful(saved)) {
        throw new Error('B の定時監視設定を保存できませんでした');
    }
    return true;
}

async function startSingleScheduledWatchNow() {
    await saveSingleScheduledWatchSettings();
    const response = await sendScheduledWatchMessage({ action: 'startSingleScheduledWatchNow' });
    if (!response?.success) throw new Error(response?.error || 'B の即時監視を開始できませんでした');
    showMessage('B の即時監視を開始しました', 'success');
    updateStatus();
}

async function stopSingleScheduledWatchNow() {
    const response = await sendScheduledWatchMessage({ action: 'stopSingleScheduledWatchNow' });
    if (!response?.success) throw new Error(response?.error || 'B の即時監視を停止できませんでした');
    showMessage('B の即時監視を停止しました', 'success');
    updateStatus();
}

function buildMultipleModeCommonSettingsFromUI() {
    const detectMode =
        elements.multiDetectAppear && elements.multiDetectAppear.checked
            ? 'appear'
            : 'disappear';
    const initialKeywordDetection = elements.multiInitialKeywordDetection
        ? elements.multiInitialKeywordDetection.checked
        : false;

    const interval =
        elements.multiInterval && elements.multiInterval.value === 'custom'
            ? parseInt(elements.multiCustomInterval?.value, 10) || 20
            : parseInt(elements.multiInterval?.value, 10) || 20;

    const duration =
        elements.multiDuration && elements.multiDuration.value === 'custom'
            ? (parseInt(elements.multiCustomDuration?.value, 10) || 1) * 60
            : parseInt(elements.multiDuration?.value, 10) || 60;

    const parsedReloadWaitAfterReload = elements.multiReloadWaitAfterReload
        ? parseInt(elements.multiReloadWaitAfterReload.value, 10)
        : NaN;
    const reloadWaitAfterReload = Number.isFinite(parsedReloadWaitAfterReload)
        ? parsedReloadWaitAfterReload
        : 3;

    return {
        scheduleEnabled: elements.multiScheduleEnabled?.checked === true,
        scheduleTime: elements.multiScheduleTime?.value || '11:57',
        monitoringMode: elements.multiMonitoringMode
            ? elements.multiMonitoringMode.value
            : 'high_frequency',
        detectMode,
        initialKeywordDetection,
        reloadWaitAfterReload,
        captureMode: elements.multiCaptureMode?.value === 'fetch' ? 'fetch' : 'reload',
        downloadAiSupportFile: elements.downloadAiSupportFile
            ? elements.downloadAiSupportFile.checked
            : false,
        interval,
        duration,
        stopCondition: 'time'
    };
}

function syncMonitorWithMultipleCommonSettings(target, commonSettings) {
    if (!target || typeof target !== 'object') {
        return target;
    }

    const settings = {
        ...(target.settings || {})
    };

    if (commonSettings && typeof commonSettings === 'object') {
        settings.initialKeywordDetection = !!commonSettings.initialKeywordDetection;
        settings.monitoringMode = commonSettings.monitoringMode || settings.monitoringMode || 'high_frequency';
        settings.interval = commonSettings.interval ?? settings.interval ?? 20;
        settings.duration = commonSettings.duration ?? settings.duration ?? 60;
        settings.reloadWaitAfterReload =
            commonSettings.reloadWaitAfterReload ?? settings.reloadWaitAfterReload ?? 3;
        settings.captureMode = commonSettings.captureMode === 'fetch' ? 'fetch' : 'reload';
        settings.downloadAiSupportFile = commonSettings.downloadAiSupportFile === true;
    }

    return {
        ...target,
        settings
    };
}

function syncMultipleConfigsWithCommonSettings(config, commonSettings) {
    const multipleConfigs = Array.isArray(config?.multiple_configs)
        ? config.multiple_configs.map((target) =>
            syncMonitorWithMultipleCommonSettings(target, commonSettings)
        )
        : [];

    return {
        ...config,
        multiple_configs: multipleConfigs
    };
}

function resolveMultipleModeCommonSettings(config, fallbackCommonSettings) {
    if (config?.multiple_common_settings && typeof config.multiple_common_settings === 'object') {
        return config.multiple_common_settings;
    }

    return fallbackCommonSettings;
}

function getMultipleMonitoringTargets(config) {
    return resolveMultipleMonitoringCollections(config).selectedTargets;
}

function resolveEnabledMultipleMonitoringTargets(config) {
    return getMultipleMonitoringTargets(config)
        .filter((monitor) => monitor.enabled);
}

function createStartAllMonitoringRequestId() {
    return `startAll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildStartAllMonitoringMessage(configs, commonSettings, requestId = createStartAllMonitoringRequestId()) {
    return {
        action: 'startAllMonitoring',
        configs,
        commonSettings,
        requestId,
        monitoringOrigin: 'immediate'
    };
}

function warnStartAllResultCountMismatch(expectedCount, response, requestId) {
    const actualCount = Array.isArray(response?.results) ? response.results.length : null;
    if (actualCount === null || actualCount === expectedCount) {
        return false;
    }

    console.warn('⚠️ 全体開始件数不一致:', {
        requestId,
        expectedCount,
        actualCount,
        successCount: response?.successCount,
        failureCount: response?.failureCount,
        results: response?.results
    });
    return true;
}

async function getSyncedMultipleMonitoringStartData() {
    const fallbackCommonSettings = buildMultipleModeCommonSettingsFromUI();

    if (!configManager) {
        return {
            commonSettings: fallbackCommonSettings,
            multipleConfigs: []
        };
    }

    const latestConfig = unwrapConfigFromManager(await configManager.loadConfig()) || {};
    const commonSettings = resolveMultipleModeCommonSettings(
        latestConfig,
        fallbackCommonSettings
    );
    const syncedConfig = syncMultipleConfigsWithCommonSettings(latestConfig, commonSettings);

    return {
        commonSettings,
        multipleConfigs: Array.isArray(syncedConfig.multiple_configs)
            ? syncedConfig.multiple_configs
            : []
    };
}

// 複数監視共通設定を保存
async function saveMultipleModeCommonSettings({ showScheduleMessage = false } = {}) {
    try {
        if (!configManager) {
            console.warn('configManager未初期化');
            return false;
        }

        // 現在の設定を取得
        const config = unwrapConfigFromManager(await configManager.loadConfig());
        if (!config) {
            console.error('複数監視共通設定: 設定の読み込みに失敗');
            return false;
        }

        const commonSettings = buildMultipleModeCommonSettingsFromUI();

        // 設定を更新
        config.multiple_common_settings = commonSettings;
        const syncedConfig = syncMultipleConfigsWithCommonSettings(
            config,
            commonSettings
        );
        syncedConfig.last_updated = new Date().toISOString();

        // 設定を保存
        const saveResult = await configManager.saveConfig(syncedConfig);
        if (isConfigSaveSuccessful(saveResult)) {
            console.log('複数監視共通設定保存成功:', commonSettings);
            if (showScheduleMessage && commonSettings.scheduleEnabled) {
                const enabledTargetCount = (syncedConfig.multiple_configs || [])
                    .filter((target) => target?.enabled).length;
                if (enabledTargetCount === 0) {
                    showMessage('有効な監視対象が0件のため、定時監視は予約されません', 'error');
                } else {
                    showMessage(`毎日 ${commonSettings.scheduleTime} に ${enabledTargetCount}件の監視を開始します`, 'success');
                }
            }
            return true;
        } else {
            console.error('複数監視共通設定保存失敗');
            return false;
        }
    } catch (error) {
        console.error('複数監視共通設定保存エラー:', error);
        return false;
    }
}

// 設定を保存（monitoring_config のみ）
// 入力欄の blur と開始ボタンの click は連続して発火するため、同じ保存を並行実行しない。
let singleSettingsSavePromise = null;

async function saveSettings() {
    if (singleSettingsSavePromise) {
        return singleSettingsSavePromise;
    }

    singleSettingsSavePromise = saveSettingsInternal();
    try {
        return await singleSettingsSavePromise;
    } finally {
        singleSettingsSavePromise = null;
    }
}

async function saveSettingsInternal() {
    try {
        console.log('💾 saveSettings実行開始');

        if (!configManager) {
            console.warn('configManager未初期化のため保存をスキップ');
            return 'idle';
        }

        const settings = collectUISettingsForSingleMode();
        console.log('📋 保存対象設定:', settings);

        const raw = await configManager.loadConfig();
        const config =
            unwrapConfigFromManager(raw) || {
                mode: 'single',
                single_config: { url: '', settings: {} },
                multiple_configs: [],
                last_updated: new Date().toISOString()
            };

        if (config.mode !== 'single') {
            console.log('複数モードのため単一UI設定は monitoring_config に反映しません');
            return;
        }

        config.single_config = buildSingleConfigFromUISettings(settings);
        config.single_keyword_schedule = collectSingleKeywordScheduleFromUI();
        config.last_updated = new Date().toISOString();

        const saveResult = await configManager.saveConfig(config);
        if (isConfigSaveSuccessful(saveResult)) {
            console.log('✅ monitoring_config に保存完了');
            // 保存とbackground側のアラーム同期が終わった後だけ、予約状態を再取得する。
            updateStatus();
            return true;
        } else {
            console.error('❌ monitoring_config への保存に失敗:', saveResult);
            return false;
        }
    } catch (error) {
        console.error('❌ 設定保存エラー:', error);
        return false;
    }
}

let singleSettingsSaveTimer = null;

function scheduleSingleSettingsSave(delayMs = 250) {
    if (singleSettingsSaveTimer) {
        clearTimeout(singleSettingsSaveTimer);
    }

    singleSettingsSaveTimer = setTimeout(async () => {
        try {
            await saveSettings();
            console.log('✅ 単一監視設定を自動保存しました');
        } catch (error) {
            console.error('❌ 単一監視設定の自動保存エラー:', error);
        }
    }, delayMs);
}

async function flushSingleSettingsSave() {
    if (singleSettingsSaveTimer) {
        clearTimeout(singleSettingsSaveTimer);
        singleSettingsSaveTimer = null;
    }

    try {
        const saveResult = await saveSettings();
        console.log('✅ 単一監視設定を即時保存しました');
        return saveResult;
    } catch (error) {
        console.error('❌ 単一監視設定の即時保存エラー:', error);
        return false;
    }
}

// AI判断サポートのON/OFFは、popupを直後に閉じても失われないよう即時保存する。
// test モードは単一監視設定を共有する既存仕様に従う。
async function persistAiSupportFilePreference(activeMode) {
    if (activeMode === 'multiple') {
        const activeSubtab = typeof document !== 'undefined'
            ? document.querySelector('[data-multiple-url-subtab].active')?.dataset.multipleUrlSubtab
            : null;
        if (activeSubtab === 'list') {
            return saveMultipleListWatchAiSupportFilePreference();
        }
        return saveMultipleModeCommonSettings();
    }

    return flushSingleSettingsSave();
}

async function saveMultipleListWatchAiSupportFilePreference() {
    const config = unwrapConfigFromManager(await configManager.loadConfig()) || {};
    config.multiple_list_watch_common_settings = {
        ...(config.multiple_list_watch_common_settings || {}),
        downloadAiSupportFile: elements?.downloadAiSupportFile?.checked === true
    };
    config.last_updated = new Date().toISOString();
    const saved = await configManager.saveConfig(config);
    return isConfigSaveSuccessful(saved);
}

async function runSingleStartAfterSettingsSave({ save, start }) {
    const saveResult = await save();
    if (saveResult === false) {
        return false;
    }

    await start();
    return true;
}


// セレクタの不正文字を削除するサニタイゼーション関数
function sanitizeSelector(selector) {
    if (!selector || typeof selector !== 'string') {
        return selector;
    }

    // 前後の空白削除
    let cleaned = selector.trim();

    // 不正な文字を削除・正規化
    cleaned = cleaned
        .replace(/"/g, '')      // ダブルクォート削除
        .replace(/'/g, "'")     // シングルクォート正規化（全角→半角）
        .replace(/\n/g, '')     // 改行削除
        .replace(/\r/g, '')     // キャリッジリターン削除
        .replace(/\t/g, ' ')    // タブをスペースに変換
        .replace(/\s+/g, ' ')   // 連続スペースを1つに
        .trim();                // 再度前後の空白削除

    // クリーニング結果をログ出力（デバッグ用）
    if (cleaned !== selector) {
        console.log('🧹 セレクタをクリーンアップしました:', {
            original: selector,
            cleaned: cleaned,
            removedChars: {
                doubleQuotes: (selector.match(/"/g) || []).length,
                newlines: (selector.match(/\n/g) || []).length,
                tabs: (selector.match(/\t/g) || []).length
            }
        });
    }

    return cleaned;
}

// ボタンの状態を更新
function updateButtonState(isRunning, mode) {
    elements.startButton.disabled = isRunning;
    elements.startButton.textContent = '開始';
    elements.stopButton.disabled = !isRunning;

    StatusIndicator.render({
        indicator: elements.statusIndicator,
        textElement: elements.statusText,
        state: isRunning ? 'running' : 'idle',
        text: isRunning ? '監視中' : '準備完了'
    });
}

function getActivePopupMode() {
    const activeOption = Array.from(elements?.modeOptions || []).find((option) =>
        option.classList?.contains('active')
    );
    return activeOption?.dataset?.mode || 'single';
}

function updateKeywordMonitoringFetchConditionsState() {
    const section = elements?.keywordMonitoringFetchConditions;
    if (!section) {
        return false;
    }

    section.classList.remove('is-disabled');
    section.setAttribute('aria-disabled', 'false');
    [elements.interval, elements.customInterval, elements.duration, elements.customDuration]
        .filter(Boolean)
        .forEach((control) => { control.disabled = false; });
    return false;
}

function normalizeSingleUrlSubtab(value) {
    return value === 'scheduled' ? 'scheduled' : 'keyword';
}

function setSingleUrlActiveSubtab(tab, { persist = true } = {}) {
    const nextTab = normalizeSingleUrlSubtab(tab);
    elements?.singleUrlSubtabButtons?.forEach((button) => {
        const isActive = button.dataset.singleUrlSubtab === nextTab;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', String(isActive));
    });
    if (elements?.singleKeywordPanel) elements.singleKeywordPanel.hidden = nextTab !== 'keyword';
    if (elements?.singleScheduledPanel) elements.singleScheduledPanel.hidden = nextTab !== 'scheduled';
    if (persist) {
        chrome.storage.local.set({ [SINGLE_URL_ACTIVE_SUBTAB_STORAGE_KEY]: nextTab });
    }
    return nextTab;
}

async function restoreSingleUrlActiveSubtab() {
    const stored = await chrome.storage.local.get(SINGLE_URL_ACTIVE_SUBTAB_STORAGE_KEY);
    return setSingleUrlActiveSubtab(stored[SINGLE_URL_ACTIVE_SUBTAB_STORAGE_KEY], { persist: false });
}

// ステータスの更新
function updateStatus() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, response => {
        if (!response) return;
        const single = response.status?.singleModeStatus || response.status || response; // レスポンス構造対応
        const isRunning = !!single.isRunning;
        latestMultipleModeStatus = response.status?.multipleModeStatus || response.multipleModeStatus || null;
        updateButtonState(isRunning);
        renderSingleKeywordScheduleStatus(single.keywordScheduledWatch);
        renderSingleScheduledWatchStatus(single.scheduledWatch);
        renderMultipleScheduledMonitoringStatus(latestMultipleModeStatus?.scheduledWatch);
        renderMultipleModeSummary();
        if (latestMultipleConfigs.length > 0) {
            renderMonitoringList(latestMultipleConfigs);
        }

        // 監視状態に応じて更新頻度を調整
        if (isRunning) {
            const iter = single.iteration ?? 0;
            const total = single.totalIterations ?? 0;
            StatusIndicator.render({
                indicator: elements.statusIndicator,
                textElement: elements.statusText,
                state: 'running',
                text: `監視中 (${iter}/${total})`
            });

            // 監視中は高頻度更新（2秒間隔）
            adjustUpdateInterval(2000);
        } else {
            // 監視停止中は低頻度更新（10秒間隔）
            adjustUpdateInterval(10000);
        }
    });
}

// メッセージ表示
function showMessage(text, type) {
    elements.message.textContent = text;
    elements.message.className = type === 'success' ? 'message-success' : 'message-error';
    elements.message.style.display = 'block';

    setTimeout(() => {
        elements.message.style.display = 'none';
    }, 3000);
}

// ストレージキー調査機能
async function investigateStorageKeys() {
    try {
        console.log('🔍 Chrome Storage調査開始');
        
        // 全てのキーを取得
        const allData = await chrome.storage.local.get(null);
        console.log('📊 Chrome Storage全データ:', allData);
        console.log('📋 Chrome Storageキー一覧:', Object.keys(allData));
        
        // 各キーの詳細を確認
        for (const [key, value] of Object.entries(allData)) {
            console.log(`🔑 キー: ${key}`);
            console.log(`📄 データ型: ${typeof value}`);
            console.log(`📏 データサイズ: ${JSON.stringify(value).length}文字`);
            
            if (key.includes('monitor') || key.includes('config')) {
                console.log(`🎯 監視関連キー詳細 [${key}]:`, value);
                
                if (typeof value === 'object' && value !== null) {
                    console.log(`🔍 ${key}の構造:`, Object.keys(value));
                    
                    if (value.multiple_configs) {
                        console.log(`📊 ${key}.multiple_configs:`, value.multiple_configs.length, '件');
                    }
                }
            }
        }
        
        return allData;
    } catch (error) {
        console.error('❌ ストレージ調査エラー:', error);
        return {};
    }
}

// データ完全リセット機能（強化版）
async function clearAllData() {
    try {
        console.log('🚨 データ完全リセット開始（強化版）');
        
        // まず現在のストレージ状況を調査
        const beforeData = await investigateStorageKeys();
        
        // 特定された全てのキーを明示的に削除
        const keysToRemove = Object.keys(beforeData);
        console.log('🗑️ 削除対象キー:', keysToRemove);
        
        if (keysToRemove.length > 0) {
            // 個別キー削除
            for (const key of keysToRemove) {
                await chrome.storage.local.remove(key);
                console.log(`✅ キー削除完了: ${key}`);
            }
            
            // 念のため全体クリアも実行
            await chrome.storage.local.clear();
            console.log('✅ chrome.storage.local.clear()実行完了');
        } else {
            console.log('ℹ️ 削除対象のキーがありません');
        }
        
        // 削除確認
        console.log('🔍 削除後の確認開始');
        const afterData = await chrome.storage.local.get(null);
        console.log('📊 削除後のストレージ:', afterData);
        console.log('📋 残存キー:', Object.keys(afterData));
        
        if (Object.keys(afterData).length > 0) {
            console.warn('⚠️ 一部のデータが残存しています:', afterData);
            // 残存データも強制削除
            for (const key of Object.keys(afterData)) {
                await chrome.storage.local.remove(key);
                console.log(`🔧 残存キー強制削除: ${key}`);
            }
        }
        
        // Service Worker完全リセット
        const response = await chrome.runtime.sendMessage({
            action: 'restartServiceWorker'
        });
        
        if (response && response.status === 'success') {
            console.log('✅ Service Worker再起動完了');
        } else {
            console.warn('⚠️ Service Worker再起動応答なし');
        }
        
        // 初期化確認のため少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 最終確認
        const finalCheck = await chrome.storage.local.get(null);
        console.log('🎯 最終確認 - ストレージ状況:', finalCheck);
        
        if (Object.keys(finalCheck).length === 0) {
            console.log('✅ データ完全削除成功');
            showMessage('データ完全リセット完了。システムが初期化されました。', 'success');
        } else {
            console.warn('⚠️ 一部データが残存している可能性があります');
            showMessage('データリセット完了（一部データが残存している可能性があります）', 'warning');
        }
        
        // UI初期化
        if (typeof loadSettings === 'function') {
            setTimeout(() => {
                loadSettings();
            }, 500);
        }
        
        return true;
    } catch (error) {
        console.error('❌ データリセットエラー:', error);
        showMessage('データリセット中にエラーが発生しました: ' + error.message, 'error');
        return false;
    }
}

// backgroundからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'statusUpdate') {
        updateStatus();
    } else if (message.action === 'monitoringComplete') {
        showMessage('監視が完了しました', 'success');
        updateButtonState(false);
        stopStatusUpdates(); // 監視完了時にステータス更新を停止
    } else if (message.action === 'error') {
        showMessage(message.message, 'error');
    }
});

// ページ読み込み時にステータスを更新（最適化版）
let statusUpdateInterval = null;

function startStatusUpdates() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }
    statusUpdateInterval = setInterval(updateStatus, 5000); // 5秒間隔に変更
}

function stopStatusUpdates() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = null;
    }
}

// 更新間隔を安全に調整する関数
function adjustUpdateInterval(intervalMs) {
    // 現在の間隔と同じ場合は何もしない
    if (statusUpdateInterval && statusUpdateInterval._interval === intervalMs) {
        return;
    }

    // 既存のタイマーをクリア
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }

    // 新しいタイマーを設定
    statusUpdateInterval = setInterval(updateStatus, intervalMs);
    statusUpdateInterval._interval = intervalMs; // 間隔を記録

    console.log(`ステータス更新間隔を ${intervalMs}ms に調整しました`);
}

// 初期化時に開始（監視状態に応じて動的調整）
startStatusUpdates();

// === モード選択機能の実装 ===

// モードUIの更新（重複削除済み）
function updateModeUI(mode) {
    try {
        console.log('🔧 [DEBUG] updateModeUI実行開始:', mode);

        // 実行前の状態確認
        if (elements && elements.modeOptions) {
            console.log('🔍 [DEBUG] updateModeUI実行前状態:');
            elements.modeOptions.forEach((btn, idx) => {
                console.log(`  ボタン${idx}: mode="${btn.dataset.mode}", active=${btn.classList.contains('active')}, text="${btn.textContent.trim()}"`);
            });
        }

        // 引数チェック
        if (!mode || !['single', 'multiple', 'test'].includes(mode)) {
            console.error('❌ 無効なモード値:', mode);
        return false;
    }

        // elements存在確認
        if (!elements || !elements.singleModeUI || !elements.multipleModeUI || !elements.testModeUI) {
            console.error('❌ 必要なUI要素が未初期化:', {
                elements: !!elements,
                singleModeUI: !!elements?.singleModeUI,
                multipleModeUI: !!elements?.multipleModeUI,
                testModeUI: !!elements?.testModeUI
            });
            return false;
        }

        // モード説明文更新
        if (elements.modeDescription) {
        const descriptions = {
            single: '個別確認や EC 向け補助設定を行います',
                multiple: '複数のURLを同時監視します（通常運用）',
                test: 'single / multiple 監視のテスト用シナリオを一括適用します'
            };
            elements.modeDescription.textContent = descriptions[mode];
        }

        // UI表示切り替え
        const multipleGlobalControlsSection = document.getElementById('multipleGlobalControlsSection');
        if (mode === 'single') {
            elements.singleModeUI.style.display = 'block';
            elements.multipleModeUI.style.display = 'none';
            elements.testModeUI.style.display = 'none';
            if (multipleGlobalControlsSection) multipleGlobalControlsSection.style.display = 'none';
            console.log('✅ 単一モードUI表示');
        } else if (mode === 'multiple') {
            elements.singleModeUI.style.display = 'none';
            elements.multipleModeUI.style.display = 'block';
            elements.testModeUI.style.display = 'none';
            if (multipleGlobalControlsSection) multipleGlobalControlsSection.style.display = 'block';
            console.log('✅ 複数モードUI表示');
        } else if (mode === 'test') {
            elements.singleModeUI.style.display = 'none';
            elements.multipleModeUI.style.display = 'none';
            elements.testModeUI.style.display = 'block';
            if (multipleGlobalControlsSection) multipleGlobalControlsSection.style.display = 'none';
            console.log('✅ テストモードUI表示');
        }

        // モード選択ボタンの状態更新（NodeListの適切な処理）
        if (elements.modeOptions && elements.modeOptions.length > 0) {
            console.log('🔄 ボタン状態更新開始 - ターゲットモード:', mode);

            elements.modeOptions.forEach((button, index) => {
                const buttonMode = button.dataset.mode;
                const isActive = buttonMode === mode;
                const currentlyActive = button.classList.contains('active');

                console.log(`🔘 [DEBUG] ボタン${index}[${buttonMode}]処理:`, {
                    buttonMode,
                    targetMode: mode,
                    isActive,
                    currentlyActive,
                    text: button.textContent.trim(),
                    willAdd: isActive,
                    willRemove: !isActive
                });

                if (isActive) {
                    button.classList.add('active');
                    console.log(`✅ ボタン${index}[${buttonMode}]をアクティブ化`);
        } else {
                    button.classList.remove('active');
                    console.log(`➖ ボタン${index}[${buttonMode}]を非アクティブ化`);
        }
            });
        } else {
            console.warn('⚠️ modeOptions要素が見つからないか空です');
        }

        // 実行後の状態確認
        if (elements && elements.modeOptions) {
            console.log('🔍 [DEBUG] updateModeUI実行後状態:');
            elements.modeOptions.forEach((btn, idx) => {
                console.log(`  ボタン${idx}: mode="${btn.dataset.mode}", active=${btn.classList.contains('active')}, text="${btn.textContent.trim()}"`);
            });
        }

        console.log('✅ [DEBUG] updateModeUI完了:', mode);
        return true;

    } catch (error) {
        console.error('❌ updateModeUI エラー:', error);
        return false;
    }
}

function getMultipleMonitorRuntimeState(config) {
    const activeMonitors = latestMultipleModeStatus?.activeMonitors || [];
    const activeMonitor = activeMonitors.find((monitor) => monitor.id === config.id);

    if (activeMonitor) {
        const status = activeMonitor.status || 'stopped';
        return {
            status,
            statusLabel: status === 'running' ? '監視中' : status === 'error' ? 'エラー' : '停止中'
        };
    }

    if (config.enabled === false) {
        return {
            status: 'disabled',
            statusLabel: '停止中'
        };
    }

    return {
        status: 'stopped',
        statusLabel: '停止中'
    };
}

function renderMultipleModeSummary(monitoringConfigs = latestMultipleConfigs) {
    if (!elements?.runningMonitorCount || !elements?.stoppedMonitorCount || !elements?.disabledMonitorCount) {
        return;
    }

    const configs = Array.isArray(monitoringConfigs) ? monitoringConfigs : [];
    const runningCount = configs.filter((config) => getMultipleMonitorRuntimeState(config).status === 'running').length;
    const disabledCount = configs.filter((config) => config?.enabled === false).length;
    const stoppedCount = Math.max(configs.length - runningCount - disabledCount, 0);

    elements.runningMonitorCount.textContent = String(runningCount);
    elements.stoppedMonitorCount.textContent = String(stoppedCount);
    elements.disabledMonitorCount.textContent = String(disabledCount);
}

function getMultipleMonitorDisplayPriority(config) {
    if (getMultipleMonitorRuntimeState(config).status === 'running') return 0;
    if (config?.enabled === false) return 2;
    return 1;
}

function sortMultipleMonitoringConfigsForDisplay(monitoringConfigs = []) {
    return (Array.isArray(monitoringConfigs) ? monitoringConfigs : [])
        .map((config, index) => ({ config, index }))
        .sort((left, right) => {
            const priorityDifference =
                getMultipleMonitorDisplayPriority(left.config) - getMultipleMonitorDisplayPriority(right.config);
            return priorityDifference || left.index - right.index;
        })
        .map(({ config }) => config);
}

async function setupCollapsibleSections() {
    return Collapsible.init({
        root: document,
        storage: chrome.storage.local,
        storageKey: COLLAPSIBLE_STATE_STORAGE_KEY,
        defaultCollapsed: true
    });
}

// 単一モード設定の読み込み
function loadSingleModeSettings(singleConfig) {
    console.log('🔧 loadSingleModeSettings実行開始:', singleConfig);
    
    if (!singleConfig) return;

    const settings = singleConfig.settings || {};
    const singleUrl = singleConfig.url || '';
    selectedTargetpageProfile = normalizeTargetpageProfile(settings.targetpage);
    if (selectedTargetpageProfile && elements.sharedTargetpageEnvironment) {
        elements.sharedTargetpageEnvironment.value = selectedTargetpageProfile.environment;
    }

    console.log('📋 読み込み対象設定:', settings);

    // ダウンロード設定
    elements.downloadSource.checked = settings.downloadSource !== undefined ? settings.downloadSource : true;
    elements.downloadSourceWithoutFooter.checked = settings.downloadSourceWithoutFooter !== undefined ? settings.downloadSourceWithoutFooter : false;
    elements.downloadScreenshot.checked = settings.downloadScreenshot !== undefined ? settings.downloadScreenshot : true;
    elements.downloadAiSupportFile.checked = settings.downloadAiSupportFile !== undefined ? settings.downloadAiSupportFile : false;
    if (elements.captureMode) elements.captureMode.value = settings.captureMode === 'fetch' ? 'fetch' : 'reload';

    // URL設定
    if (singleUrl) {
        elements.monitorUrl.checked = true;
        elements.targetUrl.value = singleUrl;
        elements.urlContainer.style.display = 'block';
    } else {
        elements.monitorActiveTab.checked = true;
        elements.urlContainer.style.display = 'none';
    }

    // 監視設定
    elements.monitorSelector.value = settings.monitorSelector || '';
    elements.monitorKeyword.value = settings.monitorKeyword || '';

    if (settings.detectMode === 'disappear') {
        elements.detectDisappear.checked = true;
    } else {
        elements.detectAppear.checked = true;
    }

    // 即座検知設定
    if (elements.initialKeywordDetection) {
        elements.initialKeywordDetection.checked = settings.initialKeywordDetection !== undefined ? settings.initialKeywordDetection : false;
        toggleManualTestSettings();
    }
    if (elements.monitoringMode) {
        elements.monitoringMode.value = settings.monitoringMode || 'high_frequency';
    }
    if (elements.reloadWaitAfterReload) {
        elements.reloadWaitAfterReload.value =
            settings.reloadWaitAfterReload ?? SINGLE_RELOAD_WAIT_AFTER_RELOAD_DEFAULT;
    }

    // 間隔・期間設定
    updateIntervalUI(settings.interval || 30);
    updateDurationUI(settings.duration || 60);
    applySingleMonitoringModeConstraints();
    
    // 🔥 重要修正: stopConditionの読み込み改善
    const stopCondition = settings.stopCondition || 'time'; // デフォルトをtimeに変更
    console.log('🎯 stopCondition読み込み:', {
        originalValue: settings.stopCondition,
        resolvedValue: stopCondition,
        hasStopCustomDuration: !!settings.stopCustomDuration
    });
    
    // stopCondition要素の値を直接設定
    if (elements.stopCondition) {
        elements.stopCondition.value = stopCondition;
        console.log('📝 stopCondition要素値設定:', elements.stopCondition.value);
    }
    
    // UI更新を遅延実行してイベントリスナー設定後に確実に実行
    setTimeout(() => {
        updateStopConditionUI(stopCondition);
        console.log('⏰ 遅延実行でupdateStopConditionUI完了:', stopCondition);
    }, 100);

    // stopCount設定
    if (settings.stopCount) {
        elements.stopCount.value = settings.stopCount;
        elements.stopCountValue.textContent = settings.stopCount;
        console.log('📊 stopCount設定:', settings.stopCount);
    }
    
    // 停止条件カスタム期間設定（重要修正）
    if (settings.stopCustomDuration && elements.stopCustomDuration) {
        elements.stopCustomDuration.value = settings.stopCustomDuration;
        elements.stopCustomDurationValue.textContent = settings.stopCustomDuration;
        console.log('⏱️ stopCustomDuration設定:', settings.stopCustomDuration);
        
        // カスタム期間が保存されている場合は確実にUI表示
        if (stopCondition === 'custom') {
            setTimeout(() => {
                console.log('🔧 カスタム期間UI強制表示実行');
                updateStopConditionUI('custom');
            }, 200);
        }
    }
    
    updateSingleKeywordScheduleControls();
    renderSharedTargetpages().catch((error) => console.warn('共有 targetpage の表示に失敗:', error));
    console.log('✅ loadSingleModeSettings完了');
}

async function applySingleTestScenario() {
    try {
        if (!configManager) {
            showMessage('設定管理システムが未初期化です', 'error');
            return;
        }

        const scenario = getSingleScenarioById(selectedTestScenarioId);
        const currentConfig =
            unwrapConfigFromManager(await configManager.loadConfig()) || {
                mode: 'single',
                single_config: mergeSingleScenarioConfig(),
                multiple_configs: []
            };
        const nextConfig = buildSingleTestScenarioAppliedConfig(currentConfig, scenario);

        const saveResult = await configManager.saveConfig(nextConfig);
        if (!isConfigSaveSuccessful(saveResult)) {
            showMessage('シナリオ適用に失敗しました', 'error');
            return;
        }

        loadSingleModeSettings(nextConfig.single_config);
        renderTestModeState(nextConfig);
        updateModeUI('single');
        showMessage(`テストシナリオ「${scenario.label}」を single に適用しました`, 'success');
    } catch (error) {
        console.error('single テストシナリオ適用エラー:', error);
        showMessage('シナリオ適用でエラーが発生しました', 'error');
    }
}

async function applyMultipleTestScenario() {
    try {
        if (!configManager) {
            showMessage('設定管理システムが未初期化です', 'error');
            return;
        }

        const scenario = getTestScenarioByModeAndId('multiple', resolveSelectedTestScenarioId('multiple'));
        const currentConfig =
            unwrapConfigFromManager(await configManager.loadConfig()) || {
                mode: 'multiple',
                single_config: mergeSingleScenarioConfig(),
                multiple_configs: [],
                multiple_common_settings: {}
            };
        const nextConfig = buildMultipleTestScenarioAppliedConfig(currentConfig, scenario);

        const saveResult = await configManager.saveConfig(nextConfig);
        if (!isConfigSaveSuccessful(saveResult)) {
            showMessage('複数シナリオ適用に失敗しました', 'error');
            return;
        }

        loadMultipleModeCommonSettings(nextConfig);
        await loadMultipleModeSettings(nextConfig.multiple_configs);
        renderTestModeState(nextConfig);
        updateModeUI('multiple');
        showMessage(`テストシナリオ「${scenario.label}」を multiple に適用しました`, 'success');
    } catch (error) {
        console.error('multiple テストシナリオ適用エラー:', error);
        showMessage('複数シナリオ適用でエラーが発生しました', 'error');
    }
}

function resolveInitialDetectedNotificationDisplay(notification) {
    switch (notification?.status) {
        case 'created':
            return { text: '完了通知: 送信済み', needsSettingsGuide: false };
        case 'permission_denied':
            return { text: '完了通知: 許可されていない', needsSettingsGuide: true };
        case 'not_found_after_create':
        case 'error':
        default:
            return { text: '完了通知: 確認できない', needsSettingsGuide: true };
    }
}

function resolveInitialDetectedAutoTestStatusPresentation(status) {
    const presentations = {
        running: { label: '実行中', title: '自動判定を実行中', tone: 'running' },
        passed: { label: '合格', title: '自動判定に合格', tone: 'passed' },
        failed: { label: '不合格', title: '自動判定は未達', tone: 'failed' },
        needs_review: { label: '要確認', title: '自動判定は要確認', tone: 'needs-review' }
    };
    return presentations[status] || presentations.needs_review;
}

function orderInitialDetectedVerificationItems(items, status) {
    if (!Array.isArray(items) || status === 'passed') return items || [];
    return [
        ...items.filter((item) => item?.passed !== true),
        ...items.filter((item) => item?.passed === true)
    ];
}

function renderInitialDetectedAutoTestStatus(test) {
    const container = elements?.initialDetectedAutoTestStatus;
    if (!container) return;
    if (!test || test.status === 'idle') {
        container.hidden = true;
        return;
    }
    const checks = test.checks || {};
    const fallbackDetail = test.status === 'running'
        ? (test.checkSummary || 'ページ準備、DOM再現、検知、保存、終了を確認中です。')
        : (test.checkSummary || `DOM再現:${checks.domReproduced ? '○' : '×'} / 検知:${checks.detected ? '○' : '×'} / HTML:${checks.htmlSaved ? '○' : '×'} / スクリーンショット:${checks.screenshotSaved ? '○' : '×'} / 終了:${checks.sessionEnded ? '○' : '×'}`);
    const verificationItems = Array.isArray(test.verificationItems) ? test.verificationItems : [];
    const orderedItems = orderInitialDetectedVerificationItems(verificationItems, test.status);
    const presentation = resolveInitialDetectedAutoTestStatusPresentation(test.status);
    const reasonLabel = test.status === 'passed' ? '合格理由' : '判定理由';
    const detail = test.decisionReason || fallbackDetail;
    container.hidden = false;
    container.className = `test-status auto-test-result-card status-${presentation.tone}`;
    container.replaceChildren();

    const header = document.createElement('div');
    header.className = 'auto-test-result-header';
    const badge = document.createElement('span');
    badge.className = 'auto-test-result-badge';
    badge.textContent = presentation.label;
    const title = document.createElement('span');
    title.className = 'auto-test-result-title';
    title.textContent = presentation.title;
    header.append(badge, title);

    const reasonLabelElement = document.createElement('div');
    reasonLabelElement.className = 'auto-test-result-reason-label';
    reasonLabelElement.textContent = reasonLabel;
    const reason = document.createElement('div');
    reason.className = 'auto-test-result-reason';
    reason.textContent = test.failureReason && test.failureReason !== detail
        ? `${detail}（${test.failureReason}）`
        : detail;

    const verificationList = document.createElement('div');
    verificationList.className = 'auto-test-verification-list';
    orderedItems.forEach((item) => {
        const itemStatus = item?.passed === true
            ? 'passed'
            : test.status === 'running'
                ? 'pending'
                : test.status === 'needs_review'
                    ? 'needs-review'
                    : 'failed';
        const row = document.createElement('div');
        row.className = `auto-test-verification-item is-${itemStatus}`;
        const icon = document.createElement('span');
        icon.className = 'auto-test-verification-icon';
        icon.textContent = item?.passed === true ? '✓' : itemStatus === 'pending' ? '–' : '!';
        const label = document.createElement('span');
        label.className = 'auto-test-verification-label';
        label.textContent = item?.label || '確認項目';
        const itemReason = document.createElement('span');
        itemReason.className = 'auto-test-verification-reason';
        itemReason.textContent = item?.reason || '根拠なし';
        row.append(icon, label, itemReason);
        verificationList.append(row);
    });

    container.append(header, reasonLabelElement, reason, verificationList);
    if (!test.active) {
        const display = resolveInitialDetectedNotificationDisplay(test.notification);
        const notification = document.createElement('div');
        notification.className = 'auto-test-notification-status';
        notification.textContent = display.needsSettingsGuide
            ? `${display.text}。Chrome拡張の通知許可、macOSのChrome通知、集中モードを確認してください`
            : display.text;
        container.append(notification);
    }
}

function stopInitialDetectedAutoTestPolling() {
    if (initialDetectedAutoTestPollingTimer) {
        clearInterval(initialDetectedAutoTestPollingTimer);
        initialDetectedAutoTestPollingTimer = null;
    }
}

function renderTwoTierAcceptanceTestStatus(test) {
    const container = elements?.twoTierAcceptanceTestStatus;
    if (!container) return;
    if (!test || test.status === 'idle') { container.hidden = true; return; }
    const detected = Array.isArray(test.detectedSessionIds) ? test.detectedSessionIds.length : 0;
    const expired = Array.isArray(test.expiredSessionIds) ? test.expiredSessionIds.length : 0;
    const checkCounts = Object.values(test.checkCounts || {}).reduce((total, count) => total + Number(count || 0), 0);
    const passed = test.status === 'passed';
    container.hidden = false;
    container.className = `test-status auto-test-result-card status-${passed ? 'passed' : test.status === 'failed' ? 'failed' : 'running'}`;
    const modeLabel = {
        high_frequency_single_duration: '高頻度・単一URL 継続/期限',
        high_frequency_single_detect: '高頻度・単一URL 変化検知',
        high_frequency_multiple_duration: '高頻度・複数URL 継続/期限',
        high_frequency_multiple_detect: '高頻度・複数URL 変化検知',
        long_running_single: '長期・単一URL'
    }[test.scenarioId] || '二層監視';
    const checks = test.verification || {};
    const checksList = [
        ['セッション作成', checks.sessionCreated], ['対象タブ', checks.targetTabs],
        ['監視間隔で再読込を予約', checks.cadenceScheduled],
        ['DOM変化を検知して停止', /_detect$/.test(test.scenarioId || '') ? checks.detectedAndStopped : null],
        ['未検知URLを継続・時間満了', /_duration$/.test(test.scenarioId || '') || test.scenarioId === 'high_frequency_multiple_detect' ? checks.continuedAndExpired : null],
        ['古いページ報告を無視', test.scenarioId === 'long_running_single' ? null : checks.staleReportIgnored],
        ['長期アラーム', test.scenarioId === 'long_running_single' ? checks.longRunningAlarmFired : null],
        ['Service Worker再起動後に復元', test.scenarioId === 'long_running_single'
            ? (checks.serviceWorkerRestartRestored ? true : 'not_run')
            : null],
        ['B/C監視へ影響なし', checks.bcAlarmsUnchanged], ['設定を復元', checks.settingsRestored],
    ];
    const checkSummary = checksList.map(([label, value]) => {
        const state = value === null ? '対象外' : value === 'not_run' ? '未実施' : value ? '成功' : '確認中';
        const className = value === null || value === 'not_run' ? 'neutral' : value ? 'passed' : 'pending';
        return `<li class="${className}"><span>${label}</span><strong>${state}</strong></li>`;
    }).join('');
    const stopLabel = test.active ? '監視中' : test.stopReason ? '監視停止完了' : '停止待ち';
    container.innerHTML = `<div class="two-tier-result-header"><strong>${modeLabel}: ${passed ? '合格' : test.status === 'failed' ? '不合格' : '実行中'}</strong><span class="two-tier-stop-state ${test.active ? 'running' : 'stopped'}">${stopLabel}</span></div>` +
        `<div class="two-tier-stop-reason">${test.active ? '監視を継続しています' : `停止理由: ${test.stopReason || '確認中'}`}</div>` +
        `<div class="two-tier-result-meta">対象タブ: ${test.targetTabCount || 0} / 検知・停止: ${detected}/${test.expectedDetections || 0} / 時間満了: ${expired}/${(test.expectedExpirationSessionIds || []).length} / 確認回数: ${checkCounts} / session: ${(test.sessionIds || []).join(', ') || '作成中'}</div>` +
        `<ul class="two-tier-result-checks">${checkSummary}</ul>`;
}

function stopTwoTierAcceptanceTestPolling() {
    if (twoTierAcceptanceTestPollingTimer) clearInterval(twoTierAcceptanceTestPollingTimer);
    twoTierAcceptanceTestPollingTimer = null;
    elements?.twoTierAcceptanceStartButtons?.forEach((button) => { button.disabled = false; });
}

async function getTwoTierAcceptanceTestStatus() {
    return new Promise((resolve, reject) => chrome.runtime.sendMessage({ action: 'getTwoTierAcceptanceTestStatus' }, (response) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response?.test || null);
    }));
}

function startTwoTierAcceptanceTestPolling() {
    stopTwoTierAcceptanceTestPolling();
    twoTierAcceptanceTestPollingTimer = setInterval(async () => {
        try {
            const test = await getTwoTierAcceptanceTestStatus();
            renderTwoTierAcceptanceTestStatus(test);
            if (!test?.active) stopTwoTierAcceptanceTestPolling();
        } catch (_) { stopTwoTierAcceptanceTestPolling(); }
    }, 500);
}

async function startTwoTierAcceptanceTest(scenarioId) {
    const response = await new Promise((resolve, reject) => chrome.runtime.sendMessage({ action: 'startTwoTierAcceptanceTest', scenarioId }, (result) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(result);
    }));
    if (!response?.success) throw new Error(response?.error || '二層監視テストを開始できませんでした');
    renderTwoTierAcceptanceTestStatus(response.test);
    if (response.test?.active) startTwoTierAcceptanceTestPolling();
    else stopTwoTierAcceptanceTestPolling();
}

async function getInitialDetectedAutoTestStatus() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getInitialDetectedAutoTestStatus' }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve(response?.test || null);
        });
    });
}

function startInitialDetectedAutoTestPolling() {
    stopInitialDetectedAutoTestPolling();
    initialDetectedAutoTestPollingTimer = setInterval(async () => {
        if (!isSelectedInitialDetectedAutoJudgement()) {
            stopInitialDetectedAutoTestPolling();
            return;
        }
        try {
            const test = await getInitialDetectedAutoTestStatus();
            if (!isSelectedInitialDetectedAutoJudgement()) {
                stopInitialDetectedAutoTestPolling();
                return;
            }
            renderInitialDetectedAutoTestStatus(test);
            if (!test?.active) stopInitialDetectedAutoTestPolling();
        } catch (error) {
            stopInitialDetectedAutoTestPolling();
            renderInitialDetectedAutoTestStatus({ status: 'needs_review', failureReason: error.message, checks: {} });
        }
    }, 500);
}

async function restoreInitialDetectedAutoTestStatus() {
    const test = await getInitialDetectedAutoTestStatus();
    if (!test || test.status === 'idle') {
        return test;
    }

    // popup はスクリーンショット撮影時に閉じるため、再オープン時は結果の
    // 対象シナリオを選び直してから表示する。ユーザーが別シナリオ／手動確認へ
    // 切り替えた後は既存の切替処理が表示とポーリングを隠す。
    if (selectedTestScenarioMode === 'single') {
        selectedTestScenarioId = test.scenarioId || 'initial_detected';
        renderTestScenarioPreview(selectedTestScenarioId);
    }
    if (!isSelectedInitialDetectedAutoJudgement()) return test;

    renderInitialDetectedAutoTestStatus(test);
    if (test.active) startInitialDetectedAutoTestPolling();
    return test;
}

async function startSingleIntegrationAutoTest(scenarioId) {
    const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'startSingleIntegrationAutoTest', scenarioId }, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve(result);
        });
    });
    if (!response?.success) throw new Error(response?.error || '通常監視の自動判定開始に失敗しました');
    renderInitialDetectedAutoTestStatus(response.test);
    if (response.test?.active) startInitialDetectedAutoTestPolling();
}

async function completeKeywordMissingAutoTest() {
    const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'completeKeywordMissingAutoTest' }, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve(result);
        });
    });
    if (!response?.success) throw new Error(response?.error || '空キーワードの自動判定完了に失敗しました');
    renderInitialDetectedAutoTestStatus(response.test);
}

// テストタブの A: single / A: multiple シナリオは、background が本番と同じ二層セッションで実行し、
// 結果を自動で判定する。popup は選択・開始・表示だけを受け持つ。
const TEST_TAB_RESULT_LABELS = {
    detected: '検知',
    expired: '時間満了',
    selector_error: 'セレクタエラー',
    start_failed: '開始失敗',
    manual_stop: '手動停止',
    test_tab_completed: 'テスト終了で停止'
};

function sendTestTabMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve(response);
        });
    });
}

function getSelectedTestTabSite() {
    return testTabSiteCandidates.find((candidate) => candidate.id === selectedTestTabSiteId) || null;
}

async function refreshTestTabSites() {
    const [ecSites, diagnosisSites] = await Promise.all([loadEcSites(), loadStockFetchDiagnosisSites()]);
    testTabSiteCandidates = buildTestTabSiteCandidates(ecSites, diagnosisSites);
    const selected = resolveTestTabSiteCandidate(testTabSiteCandidates, selectedTestTabSiteId);
    selectedTestTabSiteId = selected?.id || '';
    const select = elements?.testTabSiteSelect;
    if (select) {
        select.innerHTML = testTabSiteCandidates
            .map((candidate) => `<option value="${escapeHtml(candidate.id)}">${escapeHtml(candidate.name)}</option>`)
            .join('');
        select.value = selectedTestTabSiteId;
        select.disabled = testTabSiteCandidates.length === 0;
    }
    if (elements?.testTabSiteNote) {
        elements.testTabSiteNote.textContent = selected
            ? `監視条件: ${selected.selector} / キーワード: ${selected.keyword} / 在庫あり${selected.inStockUrls.length}件 / 在庫なし${selected.outOfStockUrls.length}件`
            : '使えるテストサイトがありません。ec-sites.json の監視条件と在庫診断の在庫ありサンプルを確認してください。';
    }
    await renderTestTabScenarioSummary();
}

function setTestTabSite(siteId) {
    selectedTestTabSiteId = siteId;
    writeTestTabLocalValue(TEST_TAB_SITE_STORAGE_KEY, siteId);
    void refreshTestTabSites();
}

function setTestTabReproductionMode(mode) {
    testTabReproductionMode = mode === 'manual' ? 'manual' : 'auto';
    writeTestTabLocalValue(TEST_TAB_REPRODUCTION_MODE_STORAGE_KEY, testTabReproductionMode);
    renderTestScenarioPreview(resolveSelectedTestScenarioId(selectedTestScenarioMode));
}

async function previewTestTabScenario(scenarioId) {
    const response = await sendTestTabMessage({
        action: 'previewTestTabScenario',
        scenarioId,
        site: getSelectedTestTabSite(),
        reproductionMode: testTabReproductionMode
    });
    return response || { run: { ok: false, reason: 'no_response', message: 'background から応答がありません' }, manualCode: '' };
}

// 二層セッションで動くシナリオでは、日産固定の手順やコードを書いた旧来の説明欄を隠し、
// background から得た実行内容の要約だけを表示する。
function setLegacyTestScenarioCodeSectionsHidden(hidden) {
    ['testScenarioDevtoolsSection', 'testScenarioExtraDevtoolsSection', 'testScenarioAutoReproduceSection'].forEach((id) => {
        const section = document.getElementById(id);
        if (section) section.hidden = hidden;
    });
    ['testScenarioDescription'].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.hidden = hidden;
    });
    ['testScenarioPreconditions', 'testScenarioPopupSettings', 'testScenarioCautions', 'testScenarioExpectedResults'].forEach((id) => {
        const section = document.getElementById(id)?.closest('.detail-section');
        if (section) section.hidden = hidden;
    });
}

async function renderTestTabScenarioSummary() {
    const summary = elements?.testTabScenarioSummary;
    if (!summary || !['single', 'multiple'].includes(selectedTestScenarioMode)) return;
    const requestId = ++testTabPreviewRequestId;
    const scenarioId = resolveSelectedTestScenarioId(selectedTestScenarioMode);
    let preview;
    try {
        preview = await previewTestTabScenario(scenarioId);
    } catch (error) {
        preview = { run: { ok: false, reason: 'no_response', message: error.message }, manualCode: '' };
    }
    if (requestId !== testTabPreviewRequestId) return;
    const { run, manualCode } = preview;
    if (run?.reason === 'unknown_scenario') {
        // 監視を使わないシナリオ（空キーワード・Chrome通知）は既存の流れのまま表示する。
        summary.hidden = true;
        if (elements?.testTabManualCodeSection) elements.testTabManualCodeSection.hidden = true;
        setLegacyTestScenarioCodeSectionsHidden(false);
        if (elements?.startTestScenarioButton) elements.startTestScenarioButton.disabled = false;
        return;
    }
    setLegacyTestScenarioCodeSectionsHidden(true);
    summary.hidden = false;
    if (!run?.ok) {
        summary.textContent = run?.message || 'このシナリオは使えません。';
        if (elements?.startTestScenarioButton) elements.startTestScenarioButton.disabled = true;
        if (elements?.testTabManualCodeSection) elements.testTabManualCodeSection.hidden = true;
        return;
    }
    const site = getSelectedTestTabSite();
    const first = run.configs[0];
    const lines = [
        `テストサイト: ${site?.name || ''}（${first.start === 'out_of_stock' ? '在庫なしサンプルで開始' : '在庫ありサンプルで開始'}）`,
        ...run.configs.map((config) => `監視URL: ${config.url}`),
        `セレクタ: ${first.selector} / キーワード: ${first.keyword}`,
        `本番と同じ高頻度監視: 間隔${first.settings.interval}秒・時間${first.settings.duration}秒 / 期待結果: ${TEST_TAB_RESULT_LABELS[first.expected] || first.expected}`,
        first.twoTierTestBehavior === 'none'
            ? '検知の再現: このシナリオは在庫状態を変えません'
            : `検知の再現: ${run.reproductionMode === 'manual' ? '手動（基準取得後に20秒の受付時間を設けます）' : '自動（基準取得後に拡張が文言を変えます）'}`
    ];
    summary.textContent = lines.join('\n');
    summary.style.whiteSpace = 'pre-line';
    if (elements?.startTestScenarioButton) elements.startTestScenarioButton.disabled = false;
    if (elements?.testTabManualCodeSection) elements.testTabManualCodeSection.hidden = !manualCode;
    if (elements?.testTabManualCode) elements.testTabManualCode.textContent = manualCode || '';
}

function formatTestTabScenarioTimestamp(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
}

function renderTestTabScenarioStatus(test) {
    const container = elements?.testTabScenarioStatus;
    if (!container) return;
    if (!test || test.status === 'idle') {
        container.hidden = true;
        if (elements?.stopTestTabScenarioButton) elements.stopTestTabScenarioButton.hidden = true;
        return;
    }
    const statusLabel = {
        starting: '開始中',
        running: '実行中',
        completing: '判定中',
        passed: '成功',
        failed: '失敗',
        unavailable: '使用不可'
    }[test.status] || test.status;
    const lines = [`テストタブ: ${statusLabel} / ${test.scenarioId || ''}（${test.siteName || ''}）`];
    const startedAt = formatTestTabScenarioTimestamp(test.startedAt);
    const completedAt = formatTestTabScenarioTimestamp(test.completedAt);
    if (startedAt) lines.push(`開始日時: ${startedAt}`);
    if (completedAt) lines.push(`完了日時: ${completedAt}`);
    if (test.status === 'unavailable') lines.push(test.message || '');
    (test.sessions || []).forEach((session) => {
        const expected = TEST_TAB_RESULT_LABELS[session.expected] || session.expected;
        const actual = session.reason ? (TEST_TAB_RESULT_LABELS[session.reason] || session.reason) : '監視中';
        lines.push(`・${session.name}: 期待 ${expected} / 結果 ${actual}`);
    });
    Object.values(test.manualWindow || {}).forEach((window) => {
        if (window.phase === 'start' || window.phase === 'progress') {
            lines.push(`手動変更の受付時間中（残り${window.remainingSeconds}秒）`);
        }
    });
    (test.failures || []).forEach((failure) => lines.push(`理由: ${failure.message}`));
    container.hidden = false;
    container.style.whiteSpace = 'pre-line';
    container.className = `test-status auto-test-result-card status-${test.status === 'passed' ? 'passed' : test.status === 'failed' || test.status === 'unavailable' ? 'failed' : 'running'}`;
    container.textContent = lines.join('\n');
    if (elements?.stopTestTabScenarioButton) elements.stopTestTabScenarioButton.hidden = !test.active;
}

function stopTestTabScenarioPolling() {
    if (testTabScenarioPollingTimer) clearInterval(testTabScenarioPollingTimer);
    testTabScenarioPollingTimer = null;
}

function startTestTabScenarioPolling() {
    stopTestTabScenarioPolling();
    testTabScenarioPollingTimer = setInterval(async () => {
        try {
            const response = await sendTestTabMessage({ action: 'getTestTabScenarioStatus' });
            renderTestTabScenarioStatus(response?.test);
            if (!response?.test?.active) stopTestTabScenarioPolling();
        } catch (_) {
            stopTestTabScenarioPolling();
        }
    }, 1000);
}

async function restoreTestTabScenarioStatus() {
    try {
        const response = await sendTestTabMessage({ action: 'getTestTabScenarioStatus' });
        renderTestTabScenarioStatus(response?.test);
        if (response?.test?.active) startTestTabScenarioPolling();
    } catch (error) {
        console.warn('[PageRecorder] テストタブの状態を取得できませんでした:', error);
    }
}

// 二層セッションで動くシナリオなら開始して true を返す。対象外のシナリオは false を返し、既存の流れに任せる。
async function tryStartTestTabScenario(scenarioId) {
    const preview = await previewTestTabScenario(scenarioId);
    if (preview?.run?.reason === 'unknown_scenario') return false;
    if (!preview?.run?.ok) {
        showMessage(preview?.run?.message || 'このシナリオは使えません', 'error');
        return true;
    }
    const response = await sendTestTabMessage({
        action: 'startTestTabScenario',
        scenarioId,
        site: getSelectedTestTabSite(),
        reproductionMode: testTabReproductionMode
    });
    renderTestTabScenarioStatus(response?.test);
    if (!response?.success) {
        showMessage(response?.error || 'テストを開始できませんでした', 'error');
        return true;
    }
    if (response.test?.active) startTestTabScenarioPolling();
    return true;
}

async function stopTestTabScenarioFromPopup() {
    try {
        const response = await sendTestTabMessage({ action: 'stopTestTabScenario' });
        renderTestTabScenarioStatus(response?.test);
        stopTestTabScenarioPolling();
    } catch (error) {
        showMessage(`テストを停止できませんでした: ${error.message}`, 'error');
    }
}

async function startSelectedSingleTestScenario() {
    try {
        if (await tryStartTestTabScenario(resolveSelectedTestScenarioId('single'))) return;
        // 監視を使わない2シナリオだけが、テストタブの本番経路の対象外として残る。
        const selectedScenario = getSingleScenarioById(resolveSelectedTestScenarioId('single'));
        if (selectedScenario.id === 'keyword_missing_check') {
            // 空キーワードは popup の開始前バリデーションそのものを確認する。
            // background の開始 message を送らないため、通常監視は起動しない。
            const failureReason = validateSingleMonitoringSettings({
                monitorType: 'url', targetUrl: 'https://example.com/', monitorKeyword: ''
            });
            if (!failureReason) {
                renderInitialDetectedAutoTestStatus({
                    scenarioId: selectedScenario.id,
                    status: 'failed',
                    active: false,
                    checks: {},
                    checkSummary: '空キーワードの開始前バリデーションを確認できませんでした。',
                    failureReason: '空キーワードが開始前に拒否されませんでした。'
                });
                return;
            }
            await completeKeywordMissingAutoTest();
            return;
        }
        if (selectedScenario.id === 'chrome_notification_check') {
            await startSingleIntegrationAutoTest(selectedScenario.id);
            return;
        }
        showMessage('このシナリオは実行できません', 'error');
    } catch (error) {
        console.error('single テスト即開始エラー:', error);
        showMessage('single テスト開始でエラーが発生しました', 'error');
    }
}

async function startSelectedMultipleTestScenario() {
    try {
        if (await tryStartTestTabScenario(resolveSelectedTestScenarioId('multiple'))) return;
        showMessage('このシナリオは実行できません', 'error');
    } catch (error) {
        console.error('multiple テスト即開始エラー:', error);
        showMessage('multiple テスト開始でエラーが発生しました', 'error');
    }
}

async function restoreSingleConfigBackup() {
    try {
        if (!configManager) {
            showMessage('設定管理システムが未初期化です', 'error');
            return;
        }

        const currentConfig = unwrapConfigFromManager(await configManager.loadConfig());
        if (!currentConfig?.single_config_backup?.config) {
            renderTestBackupState(null);
            showMessage('復元できる backup がありません', 'error');
            return;
        }

        currentConfig.single_config = deepClone(currentConfig.single_config_backup.config);
        currentConfig.mode = 'single';
        currentConfig.last_updated = new Date().toISOString();

        const saveResult = await configManager.saveConfig(currentConfig);
        if (!isConfigSaveSuccessful(saveResult)) {
            showMessage('backup 復元に失敗しました', 'error');
            return;
        }

        loadSingleModeSettings(currentConfig.single_config);
        renderTestModeState(currentConfig);
        updateModeUI('single');
        showMessage('single backup を復元しました', 'success');
    } catch (error) {
        console.error('single backup 復元エラー:', error);
        showMessage('backup 復元でエラーが発生しました', 'error');
    }
}

async function restoreMultipleConfigBackup() {
    try {
        showMessage('multiple テストは本番一覧を変更しないため、復元操作は不要です', 'success');
    } catch (error) {
        console.error('multiple backup 復元エラー:', error);
        showMessage('backup 復元でエラーが発生しました', 'error');
    }
}

async function setSelectedTestScenarioMode(mode) {
    selectedTestScenarioMode = normalizeTestScenarioMode(mode);
    persistTestScenarioMode(selectedTestScenarioMode);
    if (selectedTestScenarioMode === 'scheduled') {
        stopInitialDetectedAutoTestPolling();
        renderInitialDetectedAutoTestStatus(null);
        renderTestModeState({});
        await refreshScheduledWatchTestPanel();
        return;
    }
    if (selectedTestScenarioMode === 'acceptance') {
        stopInitialDetectedAutoTestPolling();
        renderInitialDetectedAutoTestStatus(null);
        renderTestScenarioModeUI(selectedTestScenarioMode);
        return;
    }
    if (selectedTestScenarioMode === 'diagnosis') {
        stopInitialDetectedAutoTestPolling();
        renderInitialDetectedAutoTestStatus(null);
        renderTestScenarioModeUI(selectedTestScenarioMode);
        return;
    }
    selectedTestScenarioId = resolveSelectedTestScenarioId(selectedTestScenarioMode);
    const currentConfig = configManager
        ? (unwrapConfigFromManager(await configManager.loadConfig()) || {})
        : {};
    renderTestModeState(currentConfig);
}


/**
 * 複数モードの監視対象を読み込む
 * @returns {Promise<void>}
 */
// 監視対象をUIに追加
function addMonitorItemToUI(config) {
    const monitorDiv = document.createElement('div');
    monitorDiv.className = `monitor-item ${config.enabled ? 'enabled' : 'disabled'}`;
    monitorDiv.dataset.id = config.id;

    monitorDiv.innerHTML = `
        <div class="monitor-header">
            <span class="monitor-name">${config.name || '無名の監視対象'}</span>
            <span class="monitor-status stopped">停止中</span>
        </div>
        <div class="monitor-url">${config.url}</div>
        <div class="monitor-controls">
            <button class="btn-small btn-success" data-action="start" data-monitor-id="${config.id}">開始</button>
            <button class="btn-small btn-danger" data-action="stop" data-monitor-id="${config.id}">停止</button>
            <button class="btn-small btn-warning" data-action="edit" data-monitor-id="${config.id}">編集</button>
            <button class="btn-small btn-danger" data-action="delete" data-monitor-id="${config.id}">削除</button>
        </div>
    `;

    elements.monitoringList.appendChild(monitorDiv);
}

// 間隔UI更新
function updateIntervalUI(interval) {
    if ([15, 20, 30, 60].includes(interval)) {
        elements.interval.value = interval;
        elements.customIntervalContainer.style.display = 'none';
    } else {
        elements.interval.value = 'custom';
        elements.customInterval.value = interval;
        elements.customIntervalValue.textContent = interval;
        elements.customIntervalContainer.style.display = 'block';
    }
}

function applyMonitoringModeConstraints(mode, {
    intervalSelect,
    customInterval,
    customIntervalValue,
    durationSelect,
    customDuration,
    customDurationValue
} = {}) {
    const isLongRunning = mode === 'long_running';
    const minInterval = isLongRunning ? 30 : 5;
    const maxInterval = isLongRunning ? 300 : 20;
    const minDurationMinutes = isLongRunning ? 30 : 1;
    const maxDurationMinutes = isLongRunning ? 480 : 60;

    if (customInterval) {
        customInterval.min = String(minInterval);
        customInterval.max = String(maxInterval);
    }
    if (customDuration) {
        customDuration.min = String(minDurationMinutes);
        customDuration.max = String(maxDurationMinutes);
    }

    const intervalValue = intervalSelect?.value === 'custom'
        ? Number(customInterval?.value)
        : Number(intervalSelect?.value);
    if (!Number.isFinite(intervalValue) || intervalValue < minInterval || intervalValue > maxInterval) {
        if (intervalSelect) intervalSelect.value = String(isLongRunning ? 30 : 20);
        if (customInterval) customInterval.value = String(isLongRunning ? 30 : 20);
        if (customIntervalValue) customIntervalValue.textContent = String(isLongRunning ? 30 : 20);
    }

    const durationValue = durationSelect?.value === 'custom'
        ? Number(customDuration?.value) * 60
        : Number(durationSelect?.value);
    if (!Number.isFinite(durationValue) || durationValue < minDurationMinutes * 60 || durationValue > maxDurationMinutes * 60) {
        if (durationSelect) durationSelect.value = String(isLongRunning ? 1800 : 60);
        if (customDuration) customDuration.value = String(minDurationMinutes);
        if (customDurationValue) customDurationValue.textContent = String(minDurationMinutes);
    }
}

function applySingleMonitoringModeConstraints() {
    applyMonitoringModeConstraints(elements.monitoringMode?.value, {
        intervalSelect: elements.interval,
        customInterval: elements.customInterval,
        customIntervalValue: elements.customIntervalValue,
        durationSelect: elements.duration,
        customDuration: elements.customDuration,
        customDurationValue: elements.customDurationValue
    });
}

function applyMultipleMonitoringModeConstraints() {
    applyMonitoringModeConstraints(elements.multiMonitoringMode?.value, {
        intervalSelect: elements.multiInterval,
        customInterval: elements.multiCustomInterval,
        customIntervalValue: elements.multiCustomIntervalValue,
        durationSelect: elements.multiDuration,
        customDuration: elements.multiCustomDuration,
        customDurationValue: elements.multiCustomDurationValue
    });
}

// 期間UI更新
function updateDurationUI(duration) {
    if ([60, 180, 300, 600, 1800, 3600, 14400, 28800].includes(duration)) {
        elements.duration.value = duration;
        elements.customDurationContainer.style.display = 'none';
    } else {
        elements.duration.value = 'custom';
        const minutes = Math.floor(duration / 60);
        elements.customDuration.value = minutes;
        elements.customDurationValue.textContent = minutes;
        elements.customDurationContainer.style.display = 'block';
    }
}

// 停止条件UI更新
function updateStopConditionUI(stopCondition) {
    console.log('🔧 updateStopConditionUI実行開始:', stopCondition);
    
    if (!elements.stopCondition) {
        console.error('❌ elements.stopCondition が見つかりません');
        return;
    }
    
    elements.stopCondition.value = stopCondition;
    
    // 要素存在確認
    console.log('🔍 停止条件関連要素存在確認:', {
        stopCountContainer: !!elements.stopCountContainer,
        stopCustomDurationContainer: !!elements.stopCustomDurationContainer,
        stopCustomDuration: !!elements.stopCustomDuration,
        stopCustomDurationValue: !!elements.stopCustomDurationValue
    });
    
    // 全ての条件別コンテナを初期化（非表示）
    if (elements.stopCountContainer) {
        elements.stopCountContainer.style.display = 'none';
        console.log('➖ stopCountContainer を非表示にしました');
    }
    if (elements.stopCustomDurationContainer) {
        elements.stopCustomDurationContainer.style.display = 'none';
        console.log('➖ stopCustomDurationContainer を非表示にしました');
    }
    
    // 選択された条件に応じて表示制御
    if (stopCondition === 'count') {
        if (elements.stopCountContainer) {
            elements.stopCountContainer.style.display = 'block';
            console.log('✅ count条件: stopCountContainer を表示しました');
        } else {
            console.error('❌ count条件: stopCountContainer が見つかりません');
        }
    } else if (stopCondition === 'custom') {
        if (elements.stopCustomDurationContainer) {
            elements.stopCustomDurationContainer.style.display = 'block';
            console.log('✅ custom条件: stopCustomDurationContainer を表示しました');
            
            // スライダー値も確認
            if (elements.stopCustomDuration) {
                console.log('🎚️ stopCustomDuration値:', elements.stopCustomDuration.value);
                console.log('🎚️ stopCustomDurationValue内容:', elements.stopCustomDurationValue?.textContent);
            }
        } else {
            console.error('❌ custom条件: stopCustomDurationContainer が見つかりません');
        }
    }
    
    console.log('🔧 updateStopConditionUI完了:', stopCondition);
    // 'time', 'manual', 'onKeywordChange' は追加UI不要なので何もしない
}

// 複数監視共通設定の読み込み
function loadMultipleModeCommonSettings(config) {
    console.log('複数監視共通設定読み込み:', config);

    if (!config || !config.multiple_common_settings) {
        // デフォルト値を設定
        if (elements.multiDetectAppear) elements.multiDetectAppear.checked = true;
        if (elements.multiDetectDisappear) elements.multiDetectDisappear.checked = false;
        if (elements.multiInitialKeywordDetection) elements.multiInitialKeywordDetection.checked = false;
        if (elements.multiReloadWaitAfterReload) elements.multiReloadWaitAfterReload.value = '3';
        if (elements.multiInterval) elements.multiInterval.value = '20';
        if (elements.multiDuration) elements.multiDuration.value = '60';
        if (elements.multiCaptureMode) elements.multiCaptureMode.value = 'reload';
        if (elements.multiScheduleEnabled) elements.multiScheduleEnabled.checked = false;
        if (elements.multiScheduleTime) elements.multiScheduleTime.value = '11:57';
        if (elements.downloadAiSupportFile) elements.downloadAiSupportFile.checked = false;
        toggleMultiManualTestSettings();
        return;
    }

    const commonSettings = config.multiple_common_settings;

    if (elements.multiScheduleEnabled) {
        elements.multiScheduleEnabled.checked = commonSettings.scheduleEnabled === true;
    }
    if (elements.multiScheduleTime) {
        elements.multiScheduleTime.value = commonSettings.scheduleTime || '11:57';
    }

    if (elements.downloadAiSupportFile) {
        elements.downloadAiSupportFile.checked = commonSettings.downloadAiSupportFile === true;
    }

    if (elements.multiMonitoringMode) {
        elements.multiMonitoringMode.value = commonSettings.monitoringMode || 'high_frequency';
    }
    if (elements.multiCaptureMode) {
        elements.multiCaptureMode.value = commonSettings.captureMode === 'fetch' ? 'fetch' : 'reload';
    }

    if (elements.refreshMonitoringExecutionHistoryButton) {
        elements.refreshMonitoringExecutionHistoryButton.addEventListener('click', async () => {
            try {
                await refreshMonitoringExecutionHistory();
                showMessage('実行履歴を更新しました', 'success');
            } catch (error) {
                showMessage(error?.message || '実行履歴の更新に失敗しました', 'error');
            }
        });
    }

    // 検知モード設定
    if (commonSettings.detectMode === 'appear') {
        if (elements.multiDetectAppear) elements.multiDetectAppear.checked = true;
        if (elements.multiDetectDisappear) elements.multiDetectDisappear.checked = false;
    } else {
        if (elements.multiDetectAppear) elements.multiDetectAppear.checked = false;
        if (elements.multiDetectDisappear) elements.multiDetectDisappear.checked = true;
    }

    // 初期検知設定
    if (elements.multiInitialKeywordDetection) {
        elements.multiInitialKeywordDetection.checked = !!commonSettings.initialKeywordDetection;
        toggleMultiManualTestSettings();
    }

    // リロード後待機時間設定
    if (elements.multiReloadWaitAfterReload) {
        elements.multiReloadWaitAfterReload.value = `${commonSettings.reloadWaitAfterReload ?? 3}`;
    }

    // interval設定
    const interval = commonSettings.interval || 20;
    if ([15, 20, 30, 60].includes(interval)) {
        if (elements.multiInterval) elements.multiInterval.value = interval.toString();
        if (elements.multiCustomIntervalContainer) elements.multiCustomIntervalContainer.style.display = 'none';
    } else {
        if (elements.multiInterval) elements.multiInterval.value = 'custom';
        if (elements.multiCustomInterval) elements.multiCustomInterval.value = interval;
        if (elements.multiCustomIntervalValue) elements.multiCustomIntervalValue.textContent = interval;
        if (elements.multiCustomIntervalContainer) elements.multiCustomIntervalContainer.style.display = 'block';
    }

    // duration設定
    const duration = commonSettings.duration || 60;
    if ([60, 180, 300, 600, 1800, 3600, 14400, 28800].includes(duration)) {
        if (elements.multiDuration) elements.multiDuration.value = duration.toString();
        if (elements.multiCustomDurationContainer) elements.multiCustomDurationContainer.style.display = 'none';
    } else {
        if (elements.multiDuration) elements.multiDuration.value = 'custom';
        const minutes = Math.floor(duration / 60);
        if (elements.multiCustomDuration) elements.multiCustomDuration.value = minutes;
        if (elements.multiCustomDurationValue) elements.multiCustomDurationValue.textContent = minutes;
        if (elements.multiCustomDurationContainer) elements.multiCustomDurationContainer.style.display = 'block';
    }
    applyMultipleMonitoringModeConstraints();
}

// 監視対象のUI要素を作成
function createMonitorItemElement(config, monitoringStatus) {
    const item = document.createElement('div');
    item.className = 'monitor-item';
    item.dataset.monitorId = config.id;

    // 監視状態を取得
    let status = 'stopped';
    let statusLabel = '停止中';
    if (monitoringStatus && monitoringStatus.multipleModeStatus && monitoringStatus.multipleModeStatus.activeMonitors) {
        const activeMonitor = monitoringStatus.multipleModeStatus.activeMonitors.find(m => m.id === config.id);
        if (activeMonitor) {
            status = activeMonitor.status || 'stopped';
            statusLabel = status === 'running' ? '監視中' : status === 'error' ? 'エラー' : '停止中';
        }
    }

    // 有効・無効状態でクラス設定
    if (config.enabled) {
        item.classList.add('enabled');
    } else {
        item.classList.add('disabled');
    }

    // セレクターとキーワードの情報を取得
    const selector = config.settings?.monitorSelector || config.selector || 'body';
    const keyword = config.settings?.monitorKeyword || config.keyword || '';

    console.log('🔍 監視対象UI作成:', {
        id: config.id,
        name: config.name,
        selector: selector,
        keyword: keyword,
        originalSelector: config.selector,
        settingsSelector: config.settings?.monitorSelector
    });

    item.innerHTML = `
        <div class="monitor-header">
            <div class="monitor-name">${escapeHtml(config.name)}</div>
            <div class="monitor-status ${status}">${statusLabel}</div>
        </div>
        <div class="monitor-url">${escapeHtml(config.url)}</div>
        <div class="monitor-details">
            <span class="monitor-keyword">キーワード: ${escapeHtml(keyword)}</span>
            <span class="monitor-selector">セレクター: ${escapeHtml(selector)}</span>
        </div>
        <div class="monitor-controls">
            <button class="btn-small btn-success" data-action="start" data-monitor-id="${config.id}" ${status === 'running' ? 'disabled' : ''}>開始</button>
            <button class="btn-small btn-danger" data-action="stop" data-monitor-id="${config.id}" ${status !== 'running' ? 'disabled' : ''}>停止</button>
            <button class="btn-small btn-warning" data-action="edit" data-monitor-id="${config.id}">編集</button>
            <button class="btn-small btn-danger" data-action="delete" data-monitor-id="${config.id}">削除</button>
        </div>
    `;

    return item;
}

// HTMLエスケープ関数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function handleMonitoringListClick(event) {
    const actionButton = event.target?.closest?.('button[data-action][data-monitor-id]');
    if (!actionButton || !elements?.monitoringList?.contains(actionButton) || actionButton.disabled) {
        return;
    }

    const action = actionButton.dataset.action;
    const monitorId = actionButton.dataset.monitorId;
    if (!action || !monitorId) {
        return;
    }

    const actionHandlers = {
        start: () => window.startSingleMonitor(monitorId),
        stop: () => window.stopSingleMonitor(monitorId),
        edit: () => editMonitor(monitorId),
        delete: () => removeMonitor(monitorId)
    };
    const handler = actionHandlers[action];

    if (!handler) {
        console.warn('未対応の監視リスト操作です:', action);
        return;
    }

    await handler();
}

// === 監視対象操作関数 ===

// 単一監視対象の開始
window.startSingleMonitor = async function(targetId) {
    console.log('個別監視開始:', targetId);
    try {
        await saveMultipleModeCommonSettings();
        const {
            commonSettings,
            multipleConfigs
        } = await getSyncedMultipleMonitoringStartData();
        const target = multipleConfigs.find(t => t.id === targetId);
        if (!target) {
            showMessage('監視対象が見つかりません', 'error');
            return;
        }

        // 個別監視開始要求
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'startAllMonitoring',
                configs: [syncMonitorWithMultipleCommonSettings(target, commonSettings)],
                commonSettings
            }, resolve);
        });

        if (response && response.success) {
            showMessage(`${target.name}の監視を開始しました`, 'success');
            setTimeout(() => loadSettings(), 1000); // 状態更新
        } else {
            showMessage(`監視開始に失敗しました: ${response.message || '不明なエラー'}`, 'error');
        }
    } catch (error) {
        console.error('個別監視開始エラー:', error);
        showMessage('監視開始でエラーが発生しました', 'error');
    }
};

// 単一監視対象の停止
window.stopSingleMonitor = async function(targetId) {
    console.log('個別監視停止:', targetId);
    try {
        // 全監視停止後、他の監視対象を再開始する方式で実装
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'stopAllMonitoring' }, resolve);
        });

        if (response && response.success) {
            await saveMultipleModeCommonSettings();
            const {
                commonSettings,
                multipleConfigs
            } = await getSyncedMultipleMonitoringStartData();
            const remainingTargets = multipleConfigs
                .filter(t => t.id !== targetId && t.enabled)
                .map((target) => syncMonitorWithMultipleCommonSettings(target, commonSettings));

            if (remainingTargets.length > 0) {
                // 他の監視対象を再開始
                setTimeout(async () => {
                    await new Promise((resolve) => {
                        chrome.runtime.sendMessage({
                            action: 'startAllMonitoring',
                            configs: remainingTargets,
                            commonSettings
                        }, resolve);
                    });
                }, 500);
            }

            showMessage('監視を停止しました', 'success');
            setTimeout(() => loadSettings(), 1000); // 状態更新
        } else {
            showMessage('監視停止に失敗しました', 'error');
        }
    } catch (error) {
        console.error('個別監視停止エラー:', error);
        showMessage('監視停止でエラーが発生しました', 'error');
    }
};

// 監視対象の編集（古い実装 - 削除）
// window.editMonitor = function(targetId) {
//     console.log('監視対象編集:', targetId);
//     showMessage('編集機能は次のバージョンで実装予定です', 'error');
// };


// 新しい監視対象を追加
async function addNewMonitorTarget() {
    const name = elements.modalMonitorName.value.trim();
    const url = elements.modalMonitorUrl.value.trim();
    const keyword = elements.modalMonitorKeyword.value.trim();
    const selector = elements.modalMonitorSelector.value.trim();

    // 🔍 検知モード設定の詳細デバッグ
    console.log('🔍 検知モードDOM要素状態確認:', {
        modalDetectAppearExists: !!elements.modalDetectAppear,
        modalDetectAppearChecked: elements.modalDetectAppear?.checked,
        modalDetectDisappearExists: !!elements.modalDetectDisappear,
        modalDetectDisappearChecked: elements.modalDetectDisappear?.checked
    });

    console.log('🔍 監視対象データ取得:', {
        name: name,
        url: url,
        keyword: keyword,
        selector: selector,
        isEditing: !!window._editingMonitorId,
        editingId: window._editingMonitorId,
        modalSelectorElement: {
            exists: !!elements.modalMonitorSelector,
            value: elements.modalMonitorSelector?.value,
            type: elements.modalMonitorSelector?.type
        }
    });

    // バリデーション
    if (!name) {
        showMessage('名前を入力してください', 'error');
        return;
    }
    if (!url) {
        showMessage('URLを入力してください', 'error');
        return;
    }
    if (!keyword) {
        showMessage('監視キーワードを入力してください', 'error');
        return;
    }

    // URL形式の検証
    try {
        new URL(url);
    } catch (error) {
        showMessage('有効なURLを入力してください', 'error');
        return;
    }

    const {
        commonSettings
    } = await getSyncedMultipleMonitoringStartData();

    // 🔧 モーダル内の個別設定を取得（共通設定より優先）- より安全な方法で取得
    let modalDetectMode = 'appear'; // デフォルト値
    if (elements.modalDetectAppear && elements.modalDetectDisappear) {
        if (elements.modalDetectAppear.checked) {
            modalDetectMode = 'appear';
        } else if (elements.modalDetectDisappear.checked) {
            modalDetectMode = 'disappear';
        }
        console.log('🎯 モーダル検知モード取得結果:', {
            modalDetectAppearChecked: elements.modalDetectAppear.checked,
            modalDetectDisappearChecked: elements.modalDetectDisappear.checked,
            finalModalDetectMode: modalDetectMode,
            logic: 'appear優先, disappearがtrue時のみdisappear'
        });
    } else {
        console.warn('⚠️ モーダル検知モード要素が見つかりません - デフォルト値使用');
    }

    const monitoringTarget = {
        name: name,
        url: url,
        keyword: keyword,
        selector: selector,
        detection_mode: modalDetectMode, // モーダル内設定を優先
        settings: {
            // フォーム入力値をsettings内にも保存（editMonitor関数との整合性確保）
            monitorKeyword: keyword,
            monitorSelector: selector,
            // 🔧 検知モードをsettings内にも保存（editMonitor関数対応）
            detectMode: modalDetectMode,
            // 既存の下位互換性設定
            initialKeywordDetection: commonSettings.initialKeywordDetection,
            interval: commonSettings.interval,
            duration: commonSettings.duration,
            reloadWaitAfterReload: commonSettings.reloadWaitAfterReload,
            downloadSource: true,
            downloadSourceWithoutFooter: false,
            downloadScreenshot: true
        },
        enabled: true
    };

    console.log('📝 作成される監視対象データ:', monitoringTarget);
    console.log('🔑 保存されるkeyword/selector:', {
        topLevel: { keyword: monitoringTarget.keyword, selector: monitoringTarget.selector },
        settings: { monitorKeyword: monitoringTarget.settings.monitorKeyword, monitorSelector: monitoringTarget.settings.monitorSelector }
    });
    console.log('🎯 保存される検知モード:', {
        topLevel: { detection_mode: monitoringTarget.detection_mode },
        settings: { detectMode: monitoringTarget.settings.detectMode },
        modalInput: { modalDetectMode: modalDetectMode },
        verification: {
            both_match: monitoringTarget.detection_mode === monitoringTarget.settings.detectMode,
            expected_mode: modalDetectMode
        }
    });

    try {
        let result;

        // 編集モードかどうかを確認
        if (window._editingMonitorId) {
            // 編集の場合
            console.log('🔄 監視対象更新実行:', {
                editingId: window._editingMonitorId,
                updates: monitoringTarget
            });

            result = await configManager.updateMonitoringTarget(window._editingMonitorId, monitoringTarget);

            if (result) {
                console.log('✅ 監視対象更新成功');
                elements.addMonitorModal.style.display = 'none';
                clearModalInputs();

                // 編集モードフラグをクリア
                delete window._editingMonitorId;

                // ボタンテキストを元に戻す
                if (elements.modalAddButton) {
                    elements.modalAddButton.textContent = '追加';
                }

                // 編集後の設定再読み込み（削除機能と同じパターン）
                console.log('🔄 編集後の設定再読み込み開始');
                const latestConfig = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: 'loadConfig' }, resolve);
                });
                if (latestConfig && latestConfig.success && latestConfig.config) {
                    const multipleConfigs = latestConfig.config.multiple_configs || [];
                    console.log('📊 編集後の監視対象数:', multipleConfigs.length);
                    await loadMultipleModeSettings(multipleConfigs);
                } else {
                    console.log('⚠️ 設定取得失敗 - 空のリストで更新');
                    await loadMultipleModeSettings([]);
                }
                console.log('✅ 編集後UI更新完了');

                showMessage('監視対象を更新しました', 'success');
                console.log('✅ 編集処理完全完了');
            } else {
                console.error('❌ 監視対象更新失敗');
                showMessage('監視対象の更新に失敗しました', 'error');
                console.log('❌ 編集処理失敗');
            }

        } else {
            // 新規追加の場合
            console.log('➕ 監視対象新規追加実行');
            result = await configManager.addMonitoringTarget(monitoringTarget);

            if (result) {
                console.log('✅ 監視対象追加成功、ID:', result);
                elements.addMonitorModal.style.display = 'none';
                clearModalInputs();

                // 最新の設定を直接取得してUIを更新
                console.log('🔄 最新設定取得開始');
                const latestConfig = await configManager.loadConfig();
                console.log('📊 最新設定:', latestConfig);
                console.log('🔍 最新設定の詳細構造:', {
                    keys: Object.keys(latestConfig || {}),
                    type: typeof latestConfig,
                    isObject: latestConfig && typeof latestConfig === 'object',
                    hasConfig: latestConfig && 'config' in latestConfig,
                    configKeys: latestConfig?.config ? Object.keys(latestConfig.config) : [],
                    hasMultipleConfigs: latestConfig?.config && 'multiple_configs' in latestConfig.config,
                    multipleConfigsType: latestConfig?.config?.multiple_configs ? typeof latestConfig.config.multiple_configs : 'undefined',
                    multipleConfigsLength: latestConfig?.config?.multiple_configs?.length || 'N/A'
                });

                if (latestConfig && latestConfig.success && latestConfig.config) {
                    console.log('🔄 最新の複数モード設定でUI更新開始');

                    // データ構造統一化を実行して最新データを取得
                    try {
                        console.log('🔄 データ構造統一化を実行して最新データを取得中...');
                        const unifyResponse = await new Promise((resolve) => {
                            chrome.runtime.sendMessage({ action: 'unifyDataStructure' }, resolve);
                        });

                        if (unifyResponse && unifyResponse.success) {
                            console.log('✅ データ構造統一化完了、最新データを取得中...');

                            // メッセージングの問題を回避するため、Chrome Storageから直接取得を優先
                            try {
                                console.log('🔄 Chrome Storageから直接取得を試行中...');
                                const config = await readMonitoringConfigFromChromeStorage();
                                if (config) {
                                    const resolvedData = logMultipleMonitoringResolution(
                                        'addMonitoringTarget Chrome Storage 直接取得',
                                        config
                                    );

                                    if (resolvedData.selectedTargets.length > 0) {
                                        await loadMultipleModeSettings(resolvedData.selectedTargets);
                                        console.log('✅ Chrome Storageからの直接取得でUI更新完了');
                                        return;
                                    }
                                }
                            } catch (error) {
                                console.warn('⚠️ Chrome Storageからの直接取得でエラー:', error);
                            }

                            // フォールバック: 3段階フォールバックgetStatusを試行
                            console.log('🔄 addMonitorTarget: フォールバック開始');
                            const updatedResponse = await getStatusWithFallback();

                            if (updatedResponse && updatedResponse.success) {
                                console.log('🔍 統一化後のgetStatus応答詳細:', {
                                    response: updatedResponse,
                                    keys: Object.keys(updatedResponse || {}),
                                    multipleConfigsExists: !!updatedResponse?.multiple_configs,
                                    multipleConfigsType: typeof updatedResponse?.multiple_configs,
                                    multipleConfigsIsArray: Array.isArray(updatedResponse?.multiple_configs)
                                });

                                // サマリー応答形式への対応
                                let resolvedData = resolveMultipleMonitoringCollections(updatedResponse);

                                // サマリー形式の場合、Chrome Storageから直接取得
                                if (updatedResponse.multiple_configs_summary) {
                                    const optimizationInfo = updatedResponse.size_optimized ? 
                                        'サイズ最適化による軽量化応答' : 'サマリー応答';
                                    console.log(`📦 ${optimizationInfo}を検出、Chrome Storageから完全データを取得`);
                                    try {
                                        const config = await readMonitoringConfigFromChromeStorage();
                                        if (config) {
                                            resolvedData = logMultipleMonitoringResolution(
                                                'addMonitoringTarget 完全データ再取得',
                                                config
                                            );
                                        }
                                    } catch (error) {
                                        console.warn('⚠️ Chrome Storage完全データ取得エラー:', error);
                                        // サマリーからサンプルデータを使用
                                        resolvedData = resolveMultipleMonitoringCollections({
                                            multiple_configs: updatedResponse.multiple_configs_summary?.sample || []
                                        });
                                    }
                                }

                                console.log('✅ 統一化後の最新データ取得成功:', {
                                    multipleConfigsCount: resolvedData.multipleConfigs.length,
                                    selectedSource: resolvedData.selectedSource,
                                    selectedCount: resolvedData.selectedTargets.length,
                                    isSummaryResponse: !!updatedResponse.multiple_configs_summary
                                });

                                if (resolvedData.selectedTargets.length > 0) {
                                    await loadMultipleModeSettings(resolvedData.selectedTargets);
                                    console.log('✅ 統一化後の最新データでUI更新完了');
                                    return;
                                } else {
                                    console.warn('⚠️ 統一化後のgetStatusから有効なデータが取得できませんでした');
                                }
                            } else {
                                console.warn('⚠️ 統一化後のgetStatusが失敗しました:', updatedResponse);
                            }
                        } else {
                            console.warn('⚠️ データ構造統一化が失敗しました:', unifyResponse);
                        }
                    } catch (error) {
                        console.warn('⚠️ データ構造統一化でエラーが発生:', error);
                    }

                    // フォールバック: 元の設定からデータを取得
                    console.log('📊 フォールバック: 元の設定からデータを取得');

                    const configData = latestConfig.config;
                    const resolvedData = logMultipleMonitoringResolution(
                        'addMonitoringTarget configManager フォールバック',
                        configData
                    );

                    if (resolvedData.selectedTargets.length === 0) {
                        console.log('⚠️ 監視データが見つかりません。利用可能なキー:', Object.keys(configData));
                        // 設定の全構造をログ出力
                        Object.keys(configData).forEach(key => {
                            const value = configData[key];
                            console.log(`🔍 ${key}:`, {
                                type: typeof value,
                                isArray: Array.isArray(value),
                                length: Array.isArray(value) ? value.length : 'N/A',
                                value: value
                            });
                        });
                    }

                    await loadMultipleModeSettings(resolvedData.selectedTargets);
                    console.log('✅ 最新設定でのUI更新完了');
                } else {
                    console.log('⚠️ 最新設定の取得に失敗、通常の再読み込みを実行');
                    await loadSettings();
                }

                showMessage('監視対象を追加しました', 'success');
            } else {
                console.error('❌ 監視対象追加失敗');
                showMessage('監視対象の追加に失敗しました', 'error');
            }
        }
    } catch (error) {
        console.error('❌ 監視対象処理エラー:', error);
        showMessage(`エラーが発生しました: ${error.message}`, 'error');
    }
}

// モーダル入力欄をクリア
function clearModalInputs() {
    elements.modalMonitorName.value = '';
    elements.modalMonitorUrl.value = '';
    elements.modalMonitorKeyword.value = '';
    elements.modalMonitorSelector.value = '';
    if (elements.modalEcSiteHint) {
        elements.modalEcSiteHint.value = 'サイト未選択';
    }

    // 編集モード関連のクリーンアップ
    if (window._editingMonitorId) {
        delete window._editingMonitorId;

        // ボタンテキストを元に戻す
        if (elements.modalAddButton) {
            elements.modalAddButton.textContent = '追加';
        }
    }
}

async function openAddMonitorModal() {
    clearModalInputs();

    if (elements.modalDetectAppear) {
        elements.modalDetectAppear.checked = true;
    }
    if (elements.modalDetectDisappear) {
        elements.modalDetectDisappear.checked = false;
    }
    if (elements.modalAddButton) {
        elements.modalAddButton.textContent = '追加';
    }

    await applySelectedEcSiteToModal();

    if (elements.addMonitorModal) {
        elements.addMonitorModal.style.display = 'block';
    }
}

// === Phase 4: 複数モード基本機能 ===

// 複数モード設定の読み込み（整合性チェック付き）
function loadMultipleModeSettings(multipleConfigs) {
    console.log('🔄 loadMultipleModeSettings実行開始', {
        multipleConfigs: multipleConfigs,
        isArray: Array.isArray(multipleConfigs),
        length: Array.isArray(multipleConfigs) ? multipleConfigs.length : 'N/A'
    });

    if (!multipleConfigs || !Array.isArray(multipleConfigs)) {
        latestMultipleConfigs = [];
        console.log('複数モード設定が見つかりません');
        renderMonitoringList([]);
        renderMultipleSharedTargetpages([]).catch((error) => console.warn('複数監視用共有 targetpage の表示に失敗:', error));
        return;
    }

    // データの整合性チェック
    console.log('🔍 読み込みデータの整合性チェック:', {
        count: multipleConfigs.length,
        names: multipleConfigs.map(c => c.name),
        ids: multipleConfigs.map(c => c.id),
        urls: multipleConfigs.map(c => c.url)
    });

    // 重複チェック
    const duplicateIds = multipleConfigs.filter((item, index, arr) =>
        arr.findIndex(t => t.id === item.id) !== index
    );
    if (duplicateIds.length > 0) {
        console.warn('⚠️ 重複IDが検出されました:', duplicateIds);
    }

    // データの妥当性チェック
    const validConfigs = multipleConfigs.filter(config =>
        config && config.id && config.name && config.url
    );

    if (validConfigs.length !== multipleConfigs.length) {
        console.warn('⚠️ 不正なデータが含まれています:', {
            total: multipleConfigs.length,
            valid: validConfigs.length,
            invalid: multipleConfigs.length - validConfigs.length
        });
    }

    latestMultipleConfigs = validConfigs;
    console.log('✅ 複数モード設定を読み込み:', validConfigs);
    renderMonitoringList(validConfigs);
    renderMultipleSharedTargetpages(validConfigs).catch((error) => console.warn('複数監視用共有 targetpage の表示に失敗:', error));
}

// 監視リストのレンダリング
function renderMonitoringList(monitoringConfigs) {
    console.log('🔄 renderMonitoringList実行開始', {
        monitoringConfigs: monitoringConfigs,
        length: monitoringConfigs.length,
        elementsMonitoringList: !!elements?.monitoringList,
        elements: !!elements,
        monitoringListElement: elements?.monitoringList
    });

    if (!elements) {
        console.error('❌ elements未初期化');
        return;
    }

    if (!elements.monitoringList) {
        console.error('❌ 監視リスト要素が見つかりません');
        console.error('🔍 利用可能な要素:', Object.keys(elements || {}));
        return;
    }

    // リストをクリア
    elements.monitoringList.innerHTML = '';
    console.log('📋 監視リストクリア完了');

    if (monitoringConfigs.length === 0) {
        latestMultipleConfigs = [];
        elements.monitoringList.innerHTML = '<p style="text-align: center; color: #666; margin: 20px 0;">監視対象がありません。上の「対象を追加」から登録してください。</p>';
        elements.monitoringList.classList.remove('show');
        renderMultipleModeSummary([]);
        console.log('📝 空の監視リストメッセージ表示');
        return;
    }

    // 各監視対象をレンダリング
    const displayConfigs = sortMultipleMonitoringConfigsForDisplay(monitoringConfigs);
    console.log(`📝 ${displayConfigs.length}件の監視対象をレンダリング開始`);
    displayConfigs.forEach((config, index) => {
        console.log(`📝 監視対象${index + 1}レンダリング:`, config.name || '名前なし');
        const monitorItem = createMonitorItem(config);
        elements.monitoringList.appendChild(monitorItem);
    });

    // リストを表示
    elements.monitoringList.classList.add('show');
    renderMultipleModeSummary(monitoringConfigs);
    console.log('✅ 監視リストレンダリング完了');
}

// 監視対象アイテムの作成
function createMonitorItem(config) {
    const div = document.createElement('div');
    div.className = `monitor-item ${config.enabled ? 'enabled' : 'disabled'}`;
    div.dataset.monitorId = config.id;
    const runtimeState = getMultipleMonitorRuntimeState(config);

    div.innerHTML = `
        <div class="monitor-header">
            <span class="monitor-name">${escapeHtml(config.name || '名前なし')}</span>
            <span class="monitor-status ${runtimeState.status}">
                ${runtimeState.statusLabel}
            </span>
        </div>
        <div class="monitor-url">${escapeHtml(config.url || '')}</div>
        <div class="monitor-controls">
            <button class="btn-small btn-success" data-action="start" data-monitor-id="${config.id}" ${runtimeState.status === 'running' ? 'disabled' : ''}>開始</button>
            <button class="btn-small btn-danger" data-action="stop" data-monitor-id="${config.id}" ${runtimeState.status !== 'running' ? 'disabled' : ''}>停止</button>
            <button class="btn-small btn-warning" data-action="edit" data-monitor-id="${config.id}">編集</button>
            <button class="btn-small btn-danger" data-action="delete" data-monitor-id="${config.id}">削除</button>
        </div>
    `;

    return div;
}

// 監視対象の有効/無効切り替え
async function toggleMonitorEnabled(monitorId) {
    console.log('🎯 toggleMonitorEnabled実行開始:', monitorId);

    try {
        if (!configManager) {
            showMessage('設定管理が初期化されていません', 'error');
            return;
        }

        // 統一されたデータソースから最新データを取得
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'loadConfig'
            }, resolve);
        });

        console.log('📊 無効化用設定取得:', response);
        console.log('🔍 loadConfig応答の詳細分析 (無効化):', {
            responseKeys: Object.keys(response || {}),
            responseType: typeof response,
            hasConfig: !!response?.config,
            hasMultipleConfigs: !!response?.config?.multiple_configs,
            multipleConfigsType: typeof response?.config?.multiple_configs,
            multipleConfigsIsArray: Array.isArray(response?.config?.multiple_configs),
            multipleConfigsLength: response?.config?.multiple_configs?.length || 0
        });

        if (!response || !response.success) {
            console.error('❌ 設定取得失敗:', response);
            showMessage('設定の取得に失敗しました', 'error');
            return;
        }

        // 統一されたデータソースから設定を取得
        let multipleConfigs = response.config?.multiple_configs || [];
        console.log('✅ 統一データソースから取得 (無効化):', {
            configLength: multipleConfigs.length,
            configIds: multipleConfigs.map(c => c.id || 'no-id')
        });

        // データが取得できない場合はエラー
        if (multipleConfigs.length === 0) {
            console.error('❌ 統一データソースからデータが取得できません (無効化)');
            showMessage('監視設定データが見つかりません', 'error');
            return;
        }

        const monitor = multipleConfigs.find(m => m.id === monitorId);

        console.log('🔍 無効化対象検索結果:', {
            targetId: monitorId,
            found: !!monitor,
            monitor: monitor ? { id: monitor.id, name: monitor.name, enabled: monitor.enabled } : null,
            totalConfigs: multipleConfigs.length
        });

        if (!monitor) {
            console.error('❌ 指定されたIDの監視対象が見つかりません:', monitorId);
            showMessage('指定された監視対象が見つかりません', 'error');
            return;
        }

        const newEnabledStatus = !monitor.enabled;
        console.log('🔄 有効状態変更:', monitor.enabled, '→', newEnabledStatus);

        // monitoringConfigManagerで更新処理を実行
        const updateResponse = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'updateMonitoringTarget',
                targetId: monitorId,
                updates: {
                    enabled: newEnabledStatus,
                    updated_at: new Date().toISOString()
                }
            }, resolve);
        });

        console.log('📊 更新処理結果:', updateResponse);

        if (updateResponse && updateResponse.success) {
            console.log('✅ 監視対象有効状態変更完了:', {
                id: monitorId,
                name: monitor.name,
                newStatus: newEnabledStatus ? '有効' : '無効'
            });

            // UI更新: 現在の設定を再読み込み
            const currentModeButton = document.querySelector('button[data-mode].active');
            const isMultipleMode = currentModeButton && currentModeButton.dataset.mode === 'multiple';

            if (isMultipleMode) {
                console.log('🔄 複数モード - 監視リスト再読み込み開始');

                // より確実な方法で最新データを取得
                let latestMultipleConfigs = [];

                try {
                    // まず3段階フォールバックgetStatusを試行
                    console.log('🔄 監視対象処理: 最新設定取得開始');
                    const latestConfig = await getStatusWithFallback();

                    if (latestConfig && latestConfig.success) {
                        latestMultipleConfigs = latestConfig.multiple_configs || [];
                        console.log('📊 getStatusから取得した監視対象数:', latestMultipleConfigs.length);
                    }

                    // データが失われている場合はChrome Storageから直接取得
                    if (latestMultipleConfigs.length === 0) {
                        console.log('⚠️ 再読み込み時にgetStatusからデータが取得できません。Chrome Storageから直接取得を試行します');
                        const storageData = await new Promise((resolve) => {
                            chrome.storage.local.get('monitoring_config', resolve);
                        });

                        if (storageData.monitoring_config) {
                            const config = storageData.monitoring_config;
                            latestMultipleConfigs = config.multiple_configs || [];
                            console.log('✅ 再読み込み時のChrome Storageから直接取得成功:', {
                                multipleConfigsCount: latestMultipleConfigs.length
                            });
                        }
                    }

                    console.log('📊 最終的な監視対象数:', latestMultipleConfigs.length);

                    if (latestMultipleConfigs.length > 0) {
                        await loadMultipleModeSettings(latestMultipleConfigs);
                        console.log('✅ 監視リスト更新完了');
                    } else {
                        console.log('⚠️ データが取得できません - 全設定再読み込み');
                        await loadSettings();
                    }
                } catch (error) {
                    console.error('❌ 再読み込み処理でエラーが発生:', error);
                    console.log('🔄 エラー発生時のフォールバック - 全設定再読み込み');
                    await loadSettings();
                }

                console.log('✅ 複数モード - 監視リスト更新完了');
            } else {
                console.log('🔄 単一モード - 全設定再読み込み');
                await loadSettings();
            }

            showMessage(`監視対象を${newEnabledStatus ? '有効' : '無効'}にしました`, 'success');
        } else {
            const errorMsg = updateResponse?.error || '設定の更新に失敗しました';
            console.error('❌ 監視対象更新失敗:', errorMsg);
            showMessage(errorMsg, 'error');
        }

    } catch (error) {
        console.error('❌ 監視対象切り替えエラー:', error);
        showMessage('エラーが発生しました: ' + error.message, 'error');
    }
}

// 監視対象の編集
async function editMonitor(monitorId) {
    console.log('🎯 editMonitor関数実行開始:', monitorId);

    try {
        if (!configManager) {
            showMessage('設定管理が初期化されていません', 'error');
            return;
        }

        // 🛠️ 多重フォールバック機構による確実なデータ取得
        let multipleConfigs = [];
        let dataSource = 'unknown';
        
        // Method 1: 統一されたデータソースから最新データを取得
        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'loadConfig'
                }, resolve);
            });

            console.log('📊 統合データソース取得結果:', {
                success: response?.success,
                hasConfig: !!response?.config,
                configKeys: response?.config ? Object.keys(response.config) : [],
                multipleConfigsExists: !!response?.config?.multiple_configs,
                multipleConfigsLength: response?.config?.multiple_configs?.length || 0
            });

            if (response?.success && response?.config?.multiple_configs) {
                multipleConfigs = response.config.multiple_configs;
                dataSource = 'unified-datasource';
                console.log('✅ 統合データソースから取得成功 - 件数:', multipleConfigs.length);
            }
        } catch (error) {
            console.warn('⚠️ 統合データソース取得エラー:', error);
        }

        // Method 2: Chrome Storage直接アクセス (フォールバック1)
        if (multipleConfigs.length === 0) {
            try {
                console.log('🔄 Chrome Storage直接アクセス開始...');
                const storedConfig = await readMonitoringConfigFromChromeStorage();

                console.log('📋 Chrome Storage内容確認:', {
                    hasMonitoring_config: !!storedConfig,
                    monitoring_configKeys: storedConfig ? Object.keys(storedConfig) : []
                });

                if (storedConfig) {
                    const resolvedData = logMultipleMonitoringResolution(
                        'editMonitor Chrome Storage',
                        storedConfig
                    );
                    if (resolvedData.selectedTargets.length > 0) {
                        multipleConfigs = resolvedData.selectedTargets;
                        dataSource = resolvedData.selectedSource === 'multiple_configs'
                            ? 'chrome-storage'
                            : 'chrome-storage-legacy-targets';
                        console.log('✅ Chrome Storageから取得成功 - 件数:', multipleConfigs.length);
                    }
                }
            } catch (error) {
                console.warn('⚠️ Chrome Storage直接アクセスエラー:', error);
            }
        }

        // Method 3: configManager直接呼び出し (フォールバック2)
        if (multipleConfigs.length === 0) {
            try {
                console.log('🔄 configManager直接呼び出し開始...');
                const directConfig = await configManager.loadConfig();
                console.log('📊 configManager直接呼び出し結果:', {
                    hasConfig: !!directConfig,
                    configKeys: directConfig ? Object.keys(directConfig) : [],
                    multipleConfigsExists: !!directConfig?.multiple_configs,
                    multipleConfigsLength: directConfig?.multiple_configs?.length || 0
                });

                if (directConfig?.multiple_configs) {
                    multipleConfigs = directConfig.multiple_configs;
                    dataSource = 'config-manager-direct';
                    console.log('✅ configManager直接から取得成功 - 件数:', multipleConfigs.length);
                }
            } catch (error) {
                console.warn('⚠️ configManager直接呼び出しエラー:', error);
            }
        }

        // データ取得結果の最終確認
        console.log('🔍 最終データ取得状況:', {
            source: dataSource,
            configCount: multipleConfigs.length,
            targetId: monitorId,
            configIds: multipleConfigs.map(c => c.id || 'no-id')
        });

        // データが取得できない場合はエラー
        if (multipleConfigs.length === 0) {
            console.error('❌ 全てのデータソースからデータ取得失敗');
            showMessage('監視設定データが見つかりません。まず監視対象を追加してください。', 'error');
            return;
        }

        // 編集対象を検索
        const monitor = multipleConfigs.find(m => m.id === monitorId);
        console.log('🔍 編集対象検索結果:', {
            targetId: monitorId,
            found: !!monitor,
            monitorData: monitor ? {
                id: monitor.id,
                name: monitor.name,
                url: monitor.url,
                keyword: monitor.keyword,
                selector: monitor.selector,
                hasSettings: !!monitor.settings,
                settingsKeys: monitor.settings ? Object.keys(monitor.settings) : []
            } : null
        });

        if (!monitor) {
            console.error('❌ 指定されたIDの監視対象が見つかりません:', monitorId);
            showMessage('指定された監視対象が見つかりません', 'error');
            return;
        }

        // 🔍 完全なデータ構造デバッグ - JSON.stringifyで実データを表示
        console.log('🔬 取得したmonitorオブジェクトの完全実データ:');
        console.log('📄 monitor完全JSON:', JSON.stringify(monitor, null, 2));
        console.log('🔑 monitor.keyword:', monitor.keyword);
        console.log('🔑 monitor.selector:', monitor.selector);
        console.log('🏗️ monitor.settings:', JSON.stringify(monitor.settings, null, 2));
        
        // Chrome Storageから実データも確認
        try {
            const storageData = await new Promise((resolve) => {
                chrome.storage.local.get('monitoring_config', resolve);
            });
            console.log('💾 Chrome Storage実データ:');
            console.log('📄 monitoring_config完全JSON:', JSON.stringify(storageData.monitoring_config, null, 2));
        } catch (error) {
            console.warn('⚠️ Chrome Storage確認エラー:', error);
        }

        // フォーム要素の存在確認
        if (!elements.modalMonitorName || !elements.modalMonitorUrl || 
            !elements.modalMonitorKeyword || !elements.modalMonitorSelector) {
            console.error('❌ 編集フォーム要素が見つかりません');
            showMessage('編集フォームが正しく初期化されていません', 'error');
            return;
        }

        // モーダルに現在の値を設定
        elements.modalMonitorName.value = monitor.name || '';
        elements.modalMonitorUrl.value = monitor.url || '';
        
        // 🛠️ 実データに基づく最終修正
        let selectorValue = 'body';  // デフォルト値
        let keywordValue = '';       // デフォルト値

        // 🔍 セレクターの取得（実データに基づく）
        console.log('🔍 セレクター取得詳細分析:');
        console.log('📊 monitor.selector値:', monitor.selector, '(型:', typeof monitor.selector, ')');
        console.log('📊 settings.monitorSelector値:', monitor.settings?.monitorSelector, '(型:', typeof monitor.settings?.monitorSelector, ')');
        
        if (monitor.selector) {
            selectorValue = String(monitor.selector);
            console.log('✅ セレクター採用:', selectorValue, 'から:', monitor.selector);
        } else if (monitor.settings?.monitorSelector) {
            selectorValue = String(monitor.settings.monitorSelector);
            console.log('✅ settingsセレクター採用:', selectorValue, 'から:', monitor.settings.monitorSelector);
        } else {
            console.log('⚠️ セレクター両方とも空 - デフォルト値使用:', selectorValue);
        }

        // 🔍 キーワードの取得（実データに基づく）
        console.log('🔍 キーワード取得詳細分析:');
        console.log('📊 monitor.keyword値:', monitor.keyword, '(型:', typeof monitor.keyword, ')');
        console.log('📊 settings.monitorKeyword値:', monitor.settings?.monitorKeyword, '(型:', typeof monitor.settings?.monitorKeyword, ')');
        
        if (monitor.keyword) {
            keywordValue = String(monitor.keyword);
            console.log('✅ キーワード採用:', keywordValue, 'から:', monitor.keyword);
        } else if (monitor.settings?.monitorKeyword) {
            keywordValue = String(monitor.settings.monitorKeyword);
            console.log('✅ settingsキーワード採用:', keywordValue, 'から:', monitor.settings.monitorKeyword);
        } else {
            console.log('⚠️ キーワード両方とも空 - デフォルト値使用:', keywordValue);
        }

        await loadEcSites();

        // モーダルに値を設定
        elements.modalMonitorKeyword.value = keywordValue;
        elements.modalMonitorSelector.value = selectorValue;
        setEditModalEcSiteHint(monitor, selectorValue, keywordValue);

        console.log('🔧 最終フォーム設定結果:', {
            dataSource: dataSource,
            monitorId: monitor.id,
            formValues: {
                name: elements.modalMonitorName.value,
                url: elements.modalMonitorUrl.value,
                keyword: elements.modalMonitorKeyword.value,
                selector: elements.modalMonitorSelector.value
            },
            successCheck: {
                keywordNotEmpty: elements.modalMonitorKeyword.value !== '',
                selectorNotBody: elements.modalMonitorSelector.value !== 'body',
                problemResolved: (elements.modalMonitorKeyword.value !== '' && elements.modalMonitorSelector.value !== 'body')
            }
        });

        // モーダル内の検知モード設定（トップレベル優先）
        const detectMode = monitor.detection_mode || monitor.settings?.detectMode || 'appear';
        console.log('🔧 編集画面検知モード設定:', {
            monitorDetectionMode: monitor.detection_mode,
            settingsDetectMode: monitor.settings?.detectMode,
            finalDetectMode: detectMode,
            priority: 'detection_mode → settings.detectMode → default'
        });
        
        if (detectMode === 'appear') {
            if (elements.modalDetectAppear) elements.modalDetectAppear.checked = true;
            if (elements.modalDetectDisappear) elements.modalDetectDisappear.checked = false;
            console.log('✅ 編集画面: 出現検知モード設定');
        } else {
            if (elements.modalDetectAppear) elements.modalDetectAppear.checked = false;
            if (elements.modalDetectDisappear) elements.modalDetectDisappear.checked = true;
            console.log('✅ 編集画面: 消失検知モード設定');
        }

        // モーダル表示処理の安全化
        if (!elements.addMonitorModal) {
            console.error('❌ 編集モーダル要素が見つかりません');
            showMessage('編集モーダルが初期化されていません', 'error');
            return;
        }
        
        console.log('📝 モーダル表示開始');
        elements.addMonitorModal.style.display = 'block';

        // 編集モードフラグを設定
        window._editingMonitorId = monitorId;

        // モーダルボタンのテキストを変更
        if (elements.modalAddButton) {
            elements.modalAddButton.textContent = '更新';
        } else {
            console.warn('⚠️ モーダル更新ボタンが見つかりません');
        }

        console.log('✅ 監視対象編集モーダル表示完了 - 編集ID:', monitorId, '- データソース:', dataSource);

    } catch (error) {
        console.error('❌ 監視対象編集エラー:', error);
        showMessage('編集機能の初期化でエラーが発生しました', 'error');
    }
}

// 全監視開始
/**
 * 「全て開始」ボタンクリック時の処理
 * モードに応じて単一監視または複数監視を実行
 */
async function handleStartButtonClick() {
    try {
        // 🔍 Phase 1: 強化されたデバッグログ - ボタンクリック検出
        console.log('🚀🚀🚀 ===== handleStartButtonClick関数が呼び出されました =====');
        console.log('🔵 [DEBUG] ボタンクリック検出時刻:', new Date().toISOString());
        console.log('🔵 [DEBUG] スタックトレース:', new Error().stack);
        console.log('🔵 [DEBUG] 呼び出し元:', {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: Date.now()
        });
        
        console.log('🔵 [DEBUG] handleStartButtonClick関数開始', {
            timestamp: new Date().toISOString(),
            configManager: !!configManager,
            elements: !!elements,
            configManagerType: configManager ? configManager.constructor.name : 'undefined',
            elementsKeys: elements ? Object.keys(elements) : 'undefined'
        });
        console.log('🎯 handleStartButtonClick関数開始 - モード判定実行');

        // 🔍 Phase 1: configManager存在確認強化
        if (!configManager) {
            console.error('❌ configManager未初期化 - 詳細確認:', {
                configManager: configManager,
                typeof: typeof configManager,
                globalConfigManager: window.configManager,
                functionsName: 'handleStartButtonClick'
            });
            showMessage('設定管理が初期化されていません', 'error');
            return;
        }

        // 🔍 Phase 1: 設定ロード前の状態確認
        console.log('🔄 [DEBUG] 設定ロード開始前の状態:', {
            configManagerMethods: Object.getOwnPropertyNames(configManager.__proto__),
            hasLoadConfig: typeof configManager.loadConfig === 'function',
            functionsName: 'handleStartButtonClick'
        });

        // 🚨 Phase 1修正: 設定取得方法を複数の方式で試行
        let config = null;
        let configSource = 'unknown';

        // 方式1: configManager.loadConfig()（従来方式）
        try {
            console.log('🔄 [DEBUG] 方式1: configManager.loadConfig()試行');
            const response = await configManager.loadConfig();
            console.log('🔵 [DEBUG] configManager.loadConfig()生レスポンス:', response);
            
            // レスポンス構造の詳細解析
            if (response) {
                console.log('🔍 [DEBUG] レスポンス詳細解析:', {
                    hasSuccess: 'success' in response,
                    success: response.success,
                    hasConfig: 'config' in response,
                    configType: typeof response.config,
                    directMode: response.mode,
                    nestedMode: response.config?.mode,
                    allKeys: Object.keys(response)
                });
                
                // 設定データの取得パターンを判定
                if (response.config && response.config.mode) {
                    config = response.config;
                    configSource = 'nested_config';
                    console.log('✅ [DEBUG] 方式1成功: ネストされたconfig.modeを使用');
                } else if (response.mode) {
                    config = response;
                    configSource = 'direct_response';
                    console.log('✅ [DEBUG] 方式1成功: 直接のresponse.modeを使用');
                } else {
                    console.warn('⚠️ [DEBUG] 方式1: configManager.loadConfig()でmode情報が取得できませんでした');
                }
            }
        } catch (error) {
            console.error('❌ [DEBUG] 方式1失敗: configManager.loadConfig()エラー:', error);
        }

        // 方式2: Chrome Storage直接アクセス（方式1が失敗した場合）
        if (!config || !config.mode) {
            try {
                console.log('🔄 [DEBUG] 方式2: Chrome Storage直接アクセス試行');
                const storageResult = await chrome.storage.local.get(['monitoring_config']);
                console.log('🔵 [DEBUG] Chrome Storage直接取得結果:', storageResult);
                
                if (storageResult.monitoring_config && storageResult.monitoring_config.mode) {
                    config = storageResult.monitoring_config;
                    configSource = 'chrome_storage';
                    console.log('✅ [DEBUG] 方式2成功: Chrome Storage直接アクセス');
                } else {
                    console.warn('⚠️ [DEBUG] 方式2: Chrome Storage直接アクセスでもmode情報が取得できませんでした');
                }
            } catch (error) {
                console.error('❌ [DEBUG] 方式2失敗: Chrome Storage直接アクセスエラー:', error);
            }
        }

        // 方式3: 既存の初期化済み設定からのフォールバック
        if (!config || !config.mode) {
            try {
                console.log('🔄 [DEBUG] 方式3: DOM状態からのモード推定試行');
                
                // UI状態から現在のモードを推定
                const modeButtons = elements.modeOptions;
                if (modeButtons) {
                    let activeMode = null;
                    for (const button of modeButtons) {
                        if (button.classList.contains('active')) {
                            activeMode = button.dataset.mode;
                            break;
                        }
                    }
                    
                    if (activeMode) {
                        config = { mode: activeMode };
                        configSource = 'ui_inference';
                        console.log('✅ [DEBUG] 方式3成功: UI状態からのモード推定:', activeMode);
                    } else {
                        console.warn('⚠️ [DEBUG] 方式3: UI状態からのモード推定失敗');
                    }
                }
            } catch (error) {
                console.error('❌ [DEBUG] 方式3失敗: UI状態推定エラー:', error);
            }
        }

        // 設定取得結果の最終確認
        console.log('🔵 [DEBUG] 最終設定取得結果:', {
            config: config,
            configSource: configSource,
            mode: config?.mode,
            hasMode: !!(config && config.mode)
        });

        if (!config || !config.mode) {
            console.error('❌ 全ての方式で設定取得に失敗しました:', {
                config: config,
                configSource: configSource,
                timestamp: new Date().toISOString()
            });
            showMessage('設定情報の取得に失敗しました', 'error');
            return;
        }

        console.log('🔵 [DEBUG] 設定ロード完了:', config);
        console.log('🔵 [DEBUG] モード判定詳細:', {
            mode: config.mode,
            type: typeof config.mode,
            isMultiple: config.mode === 'multiple',
            isSingle: config.mode === 'single',
            configSource: configSource,
            configStructure: {
                hasMode: 'mode' in config,
                hasMultipleConfigs: 'multiple_configs' in config,
                hasSingleConfig: 'single_config' in config,
                multipleConfigsLength: config.multiple_configs ? config.multiple_configs.length : 0
            }
        });
        console.log('📋 現在のモード確認:', {
            mode: config.mode,
            functionsName: 'handleStartButtonClick'
        });

        if (config.mode === 'single') {
            // 単一監視モード: startMonitoring関数を実行
            console.log('✅ 単一監視モード検出 - startMonitoring関数を実行');
            await startMonitoring();
        } else if (config.mode === 'multiple') {
            // 🔍 Phase 1: 複数監視モード開始前の詳細確認
            console.log('🔵 [DEBUG] 複数監視モード検出 - startAllMonitoring関数を実行');
            console.log('🔵 [DEBUG] 複数監視設定詳細:', {
                mode: config.mode,
                multiple_configs: config.multiple_configs,
                configCount: config.multiple_configs ? config.multiple_configs.length : 0,
                enabledCount: config.multiple_configs ? config.multiple_configs.filter(c => c.enabled).length : 0,
                configSource: configSource
            });
            console.log('🔵 [DEBUG] config詳細:', config);
            
            // 🔍 Phase 1: startAllMonitoring関数呼び出し前の確認
            console.log('🚀 [DEBUG] startAllMonitoring関数呼び出し直前');
            await startAllMonitoring();
            console.log('✅ [DEBUG] startAllMonitoring関数呼び出し完了');
        } else {
            console.error('❌ 不明なモード:', config.mode);
            showMessage(`不明なモード: ${config.mode}`, 'error');
        }

    } catch (error) {
        // 🔍 Phase 1: エラー詳細化
        console.error('❌ handleStartButtonClick エラー詳細:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            configManager: !!configManager,
            elements: !!elements,
            timestamp: new Date().toISOString()
        });
        showMessage(`開始処理エラー: ${error.message}`, 'error');
    }
}

async function startAllMonitoring() {
    // 🚨 重複実行防止チェック
    if (isStartAllMonitoringInProgress) {
        console.log('⚠️ [DUPLICATE-PREVENTION] startAllMonitoring既に実行中のため処理をスキップ');
        return;
    }
    
    // 実行フラグを設定
    isStartAllMonitoringInProgress = true;
    console.log('🔒 [EXECUTION-FLAG] startAllMonitoring実行フラグ設定完了');
    
    try {
        console.log('🔵 [DEBUG] startAllMonitoring関数開始');
        
        // 🚨 Phase 1調査: configManager詳細確認
        console.log('🔍 [DEBUG] startAllMonitoring - configManager確認:', {
            configManager: configManager,
            exists: !!configManager,
            type: typeof configManager,
            hasLoadConfig: configManager && typeof configManager.loadConfig === 'function'
        });
        
        if (!configManager) {
            console.error('❌ [DEBUG] startAllMonitoring - configManager未初期化');
            showMessage('設定管理が初期化されていません', 'error');
            return;
        }
        
        console.log('🔄 [DEBUG] startAllMonitoring - config取得開始');
        const configResponse = await configManager.loadConfig();
        const config = unwrapConfigFromManager(configResponse);
        console.log('🔍 [DEBUG] startAllMonitoring - config取得結果:', {
            config: config,
            hasConfig: !!config,
            mode: config?.mode,
            configStructure: config ? Object.keys(config) : 'no config'
        });
        
        if (config?.mode !== 'multiple') {
            console.warn('⚠️ [DEBUG] startAllMonitoring - 直接config使用、モード確認:', config?.mode);
            showMessage('複数監視モードではありません', 'error');
            return 'idle';
        }

        console.log('✅ [DEBUG] startAllMonitoring - モード確認完了:', config.mode);

        const monitoringData = getMultipleMonitoringTargets(config);
        console.log('📊 全監視開始 - 監視対象データ:', {
            multiple_configs: config.multiple_configs,
            selected: monitoringData,
            total: monitoringData.length
        });

        // 🚨 Phase 1調査: monitoringData詳細確認
        console.log('🔍 [DEBUG] startAllMonitoring - monitoringData詳細:', {
            isArray: Array.isArray(monitoringData),
            length: monitoringData.length,
            data: monitoringData
        });

        const enabledMonitors = resolveEnabledMultipleMonitoringTargets(config);
        console.log('✅ 有効な監視対象:', {
            enabled: enabledMonitors.length,
            total: monitoringData.length,
            monitors: enabledMonitors.map(m => ({ id: m.id, name: m.name, url: m.url }))
        });

        // 各監視対象の設定詳細をログ出力
        enabledMonitors.forEach((monitor, index) => {
            console.log(`📊 監視対象${index + 1}の設定詳細:`, {
                name: monitor.name,
                id: monitor.id,
                url: monitor.url,
                settings: monitor.settings,
                interval: monitor.settings?.interval,
                duration: monitor.settings?.duration,
                detectMode: monitor.settings?.detectMode
            });
        });

        if (enabledMonitors.length === 0) {
            console.warn('⚠️ [DEBUG] startAllMonitoring - 有効な監視対象なし');
            showMessage('有効な監視対象がありません', 'error');
            return 'idle';
        }

        console.log('🔵 [DEBUG] background.jsに全監視開始メッセージ送信準備:', {
            action: 'startAllMonitoring',
            configs: enabledMonitors,
            configCount: enabledMonitors.length
        });
        console.log('🔵 [DEBUG] enabledMonitors詳細:', enabledMonitors);

        // 🚨 Phase 2修正: 共通設定保存の確認
        console.log('🔄 [DEBUG] startAllMonitoring - 共通設定保存開始');
        let commonSettings = buildMultipleModeCommonSettingsFromUI();
        try {
            const saved = await saveMultipleModeCommonSettings();
            if (!saved) {
                console.warn('⚠️ [DEBUG] startAllMonitoring - 共通設定保存失敗、UI値で続行');
            }
            console.log('✅ [DEBUG] startAllMonitoring - 共通設定保存完了');
        } catch (saveError) {
            console.error('❌ [DEBUG] startAllMonitoring - 共通設定保存エラー:', saveError);
            // エラーでも続行
        }

        const {
            commonSettings: refreshedCommonSettings,
            multipleConfigs
        } = await getSyncedMultipleMonitoringStartData();
        commonSettings = refreshedCommonSettings;
        const refreshedConfig = {
            multiple_configs: multipleConfigs
        };
        const refreshedResolution = logMultipleMonitoringResolution(
            '全監視開始 再同期後解決',
            refreshedConfig
        );
        const refreshedEnabledMonitors = resolveEnabledMultipleMonitoringTargets(refreshedConfig)
            .map((monitor) => syncMonitorWithMultipleCommonSettings(monitor, commonSettings));
        const requestId = createStartAllMonitoringRequestId();

        // 🚨 Phase 2修正: chrome.runtime.sendMessage実行の強化
        console.log('🚀 [DEBUG] chrome.runtime.sendMessage実行直前');
        console.log('🔍 [DEBUG] 送信データ確認:', {
            requestId,
            selectedSource: refreshedResolution.selectedSource,
            configs: refreshedEnabledMonitors,
            configCount: refreshedEnabledMonitors.length,
            commonSettings,
            chromeRuntimeExists: !!chrome.runtime,
            sendMessageExists: !!chrome.runtime.sendMessage
        });

        const startAllMessage = buildStartAllMonitoringMessage(
            refreshedEnabledMonitors,
            commonSettings,
            requestId
        );

        // メッセージ送信
        const nextState = await new Promise((resolve) => chrome.runtime.sendMessage(startAllMessage, (response) => {
            console.log('📥 [DEBUG] background.jsから応答受信:', response);
            if (chrome.runtime.lastError) {
                console.error('❌ [DEBUG] Background通信エラー:', chrome.runtime.lastError);
                showMessage('監視開始の通信に失敗しました', 'error');
                resolve('idle');
            } else if (response && response.success) {
                console.log('✅ [DEBUG] 監視開始成功');
                warnStartAllResultCountMismatch(
                    refreshedEnabledMonitors.length,
                    response,
                    requestId
                );
                showMessage(`${refreshedEnabledMonitors.length}個の監視を開始しました`, 'success');
                updateGlobalControlButtons(true);
                resolve('running');
            } else {
                console.log('❌ [DEBUG] 監視開始失敗:', response);
                showMessage('監視開始に失敗しました', 'error');
                resolve('idle');
            }
        }));
        
        console.log('✅ [DEBUG] chrome.runtime.sendMessage実行完了');
        return nextState;

    } catch (error) {
        console.error('❌ 全監視開始エラー詳細:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            timestamp: new Date().toISOString()
        });
        showMessage('エラーが発生しました', 'error');
        return 'idle';
    } finally {
        // 🚨 必ず実行フラグをリセット
        isStartAllMonitoringInProgress = false;
        console.log('🔓 [EXECUTION-FLAG] startAllMonitoring実行フラグリセット完了');
    }
}

function bindStartAllButton(startAllButton) {
    if (!startAllButton) {
        return false;
    }

    if (startAllButton.dataset.startAllBound === 'true') {
        return false;
    }

    startAllButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleStartButtonClick();
    });
    startAllButton.dataset.startAllBound = 'true';
    return true;
}

// 全監視停止
async function stopAllMonitoring() {
    try {
        // background scriptに全監視停止を指示
        return await new Promise((resolve) => chrome.runtime.sendMessage({
            action: 'stopMultipleImmediateMonitoring'
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Background通信エラー:', chrome.runtime.lastError);
                showMessage('監視停止の通信に失敗しました', 'error');
                resolve('running');
            } else if (response && response.success) {
                showMessage('今すぐ開始した監視を停止しました', 'success');
                updateGlobalControlButtons(false);
                resolve('idle');
            } else {
                showMessage('監視停止に失敗しました', 'error');
                resolve('running');
            }
        }));

    } catch (error) {
        console.error('全監視停止エラー:', error);
        showMessage('エラーが発生しました', 'error');
        return 'running';
    }
}

// 状態更新
async function refreshMonitoringStatus() {
    try {
        await loadSettings();
        showMessage('状態を更新しました', 'success');
    } catch (error) {
        console.error('状態更新エラー:', error);
        showMessage('状態更新に失敗しました', 'error');
    }
}

// グローバル制御ボタンの状態更新
function updateGlobalControlButtons(isRunning) {
    if (multipleBatchControls) {
        multipleBatchControls.setState(isRunning ? 'running' : 'idle');
        return;
    }
    if (elements.startAllButton) {
        elements.startAllButton.disabled = isRunning;
    }
    if (elements.stopAllButton) {
        elements.stopAllButton.disabled = !isRunning;
    }
}

// === Phase 4実装完了 ===

// イベントリスナーの設定
function setupEventListeners() {
    // 🔍 Phase 1 & 2: 強化されたイベントリスナー設定
    console.log('🎯 イベントリスナー設定開始 - Phase 2強化版', {
        timestamp: new Date().toISOString(),
        functionsName: 'setupEventListeners',
        globalElementsExists: !!elements,
        documentsReadyState: document.readyState,
        domContentLoaded: document.readyState === 'complete'
    });

    // 🔍 Phase 2: グローバル変数elements確認強化
    if (!elements) {
        console.error('❌ グローバルelements変数が初期化されていません - 再取得試行');
        // Phase 2: 要素取得の冗長化 - elementsが無い場合の緊急再取得
        try {
            elements = getElements();
            console.log('✅ elements緊急再取得完了:', !!elements);
        } catch (error) {
            console.error('❌ elements緊急再取得失敗:', error);
            return;
        }
    }

    if (elements.gmailNotificationEnabled) {
        elements.gmailNotificationEnabled.addEventListener('change', () => {
            saveGmailNotificationSettingsFromPopup().catch((error) => {
                console.error('Gmail 通知設定の保存に失敗しました:', error);
                renderGmailNotificationResult({ status: 'api_error', message: '設定を保存できませんでした' });
            });
        });
    }
    if (elements.gmailNotificationRecipient) {
        elements.gmailNotificationRecipient.addEventListener('change', () => {
            saveGmailNotificationSettingsFromPopup().catch((error) => {
                console.error('Gmail 通知設定の保存に失敗しました:', error);
                renderGmailNotificationResult({ status: 'api_error', message: '設定を保存できませんでした' });
            });
        });
    }
    if (elements.sendGmailTestEmailButton) {
        elements.sendGmailTestEmailButton.addEventListener('click', () => {
            sendGmailTestEmailFromPopup();
        });
    }

    // 監視対象ラジオボタンのイベントリスナー（URL コンテナ表示制御）
    const monitorActiveTab = document.getElementById('monitorActiveTab');
    const monitorUrl = document.getElementById('monitorUrl');
    const urlContainer = document.getElementById('urlContainer');

    if (monitorActiveTab && monitorUrl && urlContainer) {
        monitorActiveTab.addEventListener('change', function() {
            if (this.checked) {
                urlContainer.style.display = 'none';
                updateSingleKeywordScheduleControls();
                console.log('アクティブタブ監視モードに変更');
                scheduleSingleSettingsSave();
            }
        });

        monitorUrl.addEventListener('change', function() {
            if (this.checked) {
                urlContainer.style.display = 'block';
                updateSingleKeywordScheduleControls();
                console.log('URL指定監視モードに変更');
                scheduleSingleSettingsSave();
                // URL入力済みの場合、サイト自動選択を試みる
                handleTargetUrlChange();
            }
        });

        // targetUrl入力時のサイト自動選択とURL履歴保存
        if (elements?.targetUrl) {
            elements.targetUrl.addEventListener('input', () => {
                clearSharedTargetpageSelection();
                clearTimeout(targetUrlDebounceTimer);
                targetUrlDebounceTimer = setTimeout(() => {
                    handleTargetUrlChange();
                    // URL履歴も保存（changeイベントはblur時のみ発火するため、input時も保存）
                    rememberRecentMonitorUrl(SINGLE_KEYWORD_RECENT_URLS_STORAGE_KEY, elements.targetUrl.value)
                        .then(() => renderRecentMonitorUrlOptions(SINGLE_KEYWORD_RECENT_URLS_STORAGE_KEY, elements.singleKeywordRecentUrls))
                        .catch((error) => console.warn('URL履歴保存に失敗:', error));
                }, 500);
            });
        }

        // 初期状態の設定
        if (monitorUrl.checked) {
            urlContainer.style.display = 'block';
        } else {
            urlContainer.style.display = 'none';
        }
        updateSingleKeywordScheduleControls();
    } else {
        console.warn('監視対象ラジオボタンまたはURLコンテナが見つかりません');
    }

    // ログレベル設定
    const logLevelSelect = document.getElementById('logLevel');
    if (logLevelSelect) {
        logLevelSelect.addEventListener('change', async function() {
            const selectedLevel = Number(this.value);
            try {
                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        action: 'setLogLevel',
                        level: selectedLevel
                    }, (result) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(result);
                        }
                    });
                });

                if (response && response.status === 'success') {
                    showMessage(`ログレベルを ${response.logLevelName} に設定しました`, 'success');
                    console.log('ログレベル設定完了:', response);
                } else {
                    showMessage('ログレベル設定に失敗しました', 'error');
                    console.error('ログレベル設定エラー:', response);
                }
            } catch (error) {
                showMessage('ログレベル設定でエラーが発生しました', 'error');
                console.error('ログレベル設定エラー:', error);
            }
        });
    }

    // 停止条件変更時のイベントリスナー
    if (elements.stopCondition) {
        elements.stopCondition.addEventListener('change', function() {
            const selectedCondition = this.value;
            updateStopConditionUI(selectedCondition);
            scheduleSingleSettingsSave();

            if (selectedCondition === 'onKeywordChange') {
                showMessage('キーワード変化検知時に自動停止するように設定しました', 'info');
            }
        });
    }

    // 単一モード: interval設定
    if (elements.interval) {
        elements.interval.addEventListener('change', function() {
            const value = this.value;
            if (value === 'custom') {
                elements.customIntervalContainer.style.display = 'block';
            } else {
                elements.customIntervalContainer.style.display = 'none';
            }
            scheduleSingleSettingsSave();
        });
    }

    if (elements.monitoringMode) {
        elements.monitoringMode.addEventListener('change', function() {
            applySingleMonitoringModeConstraints();
            scheduleSingleSettingsSave();
        });
    }

    if (elements.captureMode) {
        elements.captureMode.addEventListener('change', () => scheduleSingleSettingsSave());
    }

    if (elements.multiMonitoringMode) {
        elements.multiMonitoringMode.addEventListener('change', function() {
            applyMultipleMonitoringModeConstraints();
            saveMultipleModeCommonSettings();
        });
    }

    if (elements.multiCaptureMode) {
        elements.multiCaptureMode.addEventListener('change', () => {
            saveMultipleModeCommonSettings();
        });
    }

    // 単一モード: カスタムinterval値の変更
    if (elements.customInterval) {
        elements.customInterval.addEventListener('input', function() {
            elements.customIntervalValue.textContent = this.value;
        });
        elements.customInterval.addEventListener('change', function() {
            scheduleSingleSettingsSave();
        });
    }

    // 単一モード: duration設定
    if (elements.duration) {
        elements.duration.addEventListener('change', function() {
            const value = this.value;
            if (value === 'custom') {
                elements.customDurationContainer.style.display = 'block';
            } else {
                elements.customDurationContainer.style.display = 'none';
            }
            scheduleSingleSettingsSave();
        });
    }

    const singleSettingsChangeSelectors = [
        elements.targetUrl,
        elements.monitorSelector,
        elements.monitorKeyword,
        elements.detectAppear,
        elements.detectDisappear,
        elements.initialKeywordDetection,
        elements.downloadSource,
        elements.downloadSourceWithoutFooter,
        elements.downloadScreenshot,
        elements.reloadWaitAfterReload
    ].filter(Boolean);

    singleSettingsChangeSelectors.forEach((element) => {
        element.addEventListener('change', () => {
            if ([elements.targetUrl, elements.monitorSelector, elements.monitorKeyword, elements.detectAppear, elements.detectDisappear].includes(element)) {
                clearSharedTargetpageSelection();
            }
            scheduleSingleSettingsSave();
            if (element === elements.targetUrl) {
                rememberRecentMonitorUrl(SINGLE_KEYWORD_RECENT_URLS_STORAGE_KEY, element.value)
                    .then((urls) => renderRecentMonitorUrlOptions(SINGLE_KEYWORD_RECENT_URLS_STORAGE_KEY, elements.singleKeywordRecentUrls))
                    .catch((error) => console.warn('AのURL履歴保存に失敗:', error));
            }
        });
    });

    if (elements.sharedTargetpageEnvironment) {
        elements.sharedTargetpageEnvironment.addEventListener('change', () => {
            selectedTargetpageProfile = null;
            renderTargetpageNotificationStatus();
            renderSharedTargetpages().catch((error) => showMessage(error.message, 'error'));
        });
    }
    if (elements.sharedTargetpageSite) {
        elements.sharedTargetpageSite.addEventListener('change', () => {
            selectedTargetpageProfile = null;
            renderTargetpageNotificationStatus();
            renderSharedTargetpages().catch((error) => showMessage(error.message, 'error'));
        });
    }
    if (elements.sharedTargetpageSelect) {
        elements.sharedTargetpageSelect.addEventListener('change', () => {
            applySharedTargetpage().catch((error) => showMessage(error.message, 'error'));
        });
    }

    elements.singleUrlSubtabButtons?.forEach((button) => {
        button.addEventListener('click', () => setSingleUrlActiveSubtab(button.dataset.singleUrlSubtab));
    });

    [
        elements.singleScheduledWatchEnabled,
        elements.singleScheduledWatchUrl,
        elements.singleScheduledWatchSelector,
        elements.singleScheduledWatchStart,
        elements.singleScheduledWatchEnd,
        elements.singleScheduledWatchInterval,
        elements.singleScheduledWatchImmediateDuration,
        elements.singleScheduledWatchOpenDetectedUrl,
        elements.singleScheduledWatchNotifyExternal,
        elements.singleScheduledWatchExternalExtensionId,
        elements.singleScheduledWatchDiscordChannelId
    ].filter(Boolean).forEach((element) => {
        element.addEventListener('change', () => {
            if (element === elements.singleScheduledWatchUrl || element === elements.singleScheduledWatchSelector) {
                clearSingleScheduledWatchProfileSelection();
            }
            saveSingleScheduledWatchSettings().catch((error) => showMessage(error.message, 'error'));
            if (element === elements.singleScheduledWatchUrl) {
                rememberRecentMonitorUrl(SINGLE_SCHEDULED_WATCH_RECENT_URLS_STORAGE_KEY, element.value)
                    .then((urls) => renderRecentMonitorUrlOptions(SINGLE_SCHEDULED_WATCH_RECENT_URLS_STORAGE_KEY, elements.singleScheduledWatchRecentUrls))
                    .catch((error) => console.warn('BのURL履歴保存に失敗:', error));
            }
        });
        if (['text', 'number', 'time'].includes(element.type)) {
            element.addEventListener('blur', () => {
                saveSingleScheduledWatchSettings().catch((error) => showMessage(error.message, 'error'));
            });
        }
    });

    if (elements.singleScheduledWatchSite) {
        elements.singleScheduledWatchSite.addEventListener('change', () => {
            handleSingleScheduledWatchSiteChange({ target: elements.singleScheduledWatchSite })
                .catch((error) => showMessage(error.message, 'error'));
        });
    }
    if (elements.singleScheduledWatchProfile) {
        elements.singleScheduledWatchProfile.addEventListener('change', () => {
            handleSingleScheduledWatchProfileChange({ target: elements.singleScheduledWatchProfile })
                .catch((error) => showMessage(error.message, 'error'));
        });
    }

    if (elements.setSingleScheduledWatchTimesFromNowButton) {
        elements.setSingleScheduledWatchTimesFromNowButton.addEventListener('click', () => {
            setSingleScheduledWatchTimesFromNow().catch((error) => showMessage(error.message, 'error'));
        });
    }
    if (elements.startSingleScheduledWatchNowButton) {
        elements.startSingleScheduledWatchNowButton.addEventListener('click', () => {
            startSingleScheduledWatchNow().catch((error) => showMessage(error.message, 'error'));
        });
    }
    if (elements.stopSingleScheduledWatchNowButton) {
        elements.stopSingleScheduledWatchNowButton.addEventListener('click', () => {
            stopSingleScheduledWatchNow().catch((error) => showMessage(error.message, 'error'));
        });
    }
    if (elements.singleKeywordScheduleEnabled) {
        elements.singleKeywordScheduleEnabled.addEventListener('change', () => {
            saveSettings().catch((error) => showMessage(error.message, 'error'));
        });
    }
    if (elements.singleKeywordScheduleTime) {
        elements.singleKeywordScheduleTime.addEventListener('change', () => {
            saveSettings().catch((error) => showMessage(error.message, 'error'));
        });
    }
    if (elements.setSingleKeywordScheduleTimeFromNowButton) {
        elements.setSingleKeywordScheduleTimeFromNowButton.addEventListener('click', () => {
            setSingleKeywordScheduleTimeFromNow().catch((error) => showMessage(error.message, 'error'));
        });
    }

    [elements.targetUrl, elements.monitorSelector, elements.monitorKeyword]
        .filter(Boolean)
        .forEach((element) => {
            element.addEventListener('input', () => {
                clearSharedTargetpageSelection();
                scheduleSingleSettingsSave(400);
            });
            element.addEventListener('blur', () => {
                flushSingleSettingsSave();
            });
        });

    if (elements.customDuration) {
        elements.customDuration.addEventListener('input', function() {
            elements.customDurationValue.textContent = this.value;
        });
        elements.customDuration.addEventListener('change', function() {
            scheduleSingleSettingsSave();
        });
    }

    if (elements.stopCustomDuration) {
        elements.stopCustomDuration.addEventListener('input', function() {
            elements.stopCustomDurationValue.textContent = this.value;
        });
        elements.stopCustomDuration.addEventListener('change', function() {
            scheduleSingleSettingsSave();
        });
    }

    if (elements.stopCount) {
        elements.stopCount.addEventListener('input', function() {
            elements.stopCountValue.textContent = this.value;
        });
        elements.stopCount.addEventListener('change', function() {
            scheduleSingleSettingsSave();
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushSingleSettingsSave();
        }
    });

    window.addEventListener('pagehide', () => {
        flushSingleSettingsSave();
        stopScheduledWatchStatusPolling();
        stopScheduledWatchTestStatusPolling();
        stopMonitoringExecutionHistoryPolling();
    });

    // モード選択ボタンのイベント（エラーハンドリング強化）
    if (elements.modeOptions) {
        console.log('🎯 モード選択ボタン設定開始:', elements.modeOptions.length, '個');

        elements.modeOptions.forEach((button, index) => {
            console.log(`🔘 ボタン${index}: mode="${button.dataset.mode}", text="${button.textContent.trim()}"`);

            button.addEventListener('click', async (e) => {
                try {
                    const clickedElement = e.target;
                    const newMode = clickedElement.dataset.mode;


                    console.log('🖱️ [DEBUG] モード選択ボタンクリック詳細:', {
                        clickedText: clickedElement.textContent.trim(),
                        dataMode: newMode,
                        buttonElement: clickedElement,
                        eventTarget: e.target,
                        classList: Array.from(clickedElement.classList),
                        allDataAttributes: clickedElement.dataset,
                        outerHTML: clickedElement.outerHTML.substring(0, 200)
                    });

                    // 他のボタンの状態も確認
                    console.log('🔍 [DEBUG] 全ボタン状態確認:');
                    elements.modeOptions.forEach((btn, idx) => {
                        console.log(`  ボタン${idx}: mode="${btn.dataset.mode}", active=${btn.classList.contains('active')}, text="${btn.textContent.trim()}"`);
                    });

                    // 入力検証
                    if (!newMode || !['single', 'multiple', 'test'].includes(newMode)) {
                        console.error('❌ 無効なモード:', newMode);
                        showMessage('無効なモードが選択されました', 'error');
                        return;
                    }

                    if (!configManager) {
                        console.error('configManager未初期化');
                        showMessage('設定管理システムが未初期化です', 'error');
                        return;
                    }

                    // 現在のモードと同じ場合はスキップ
                    const currentConfigResponse = await configManager.loadConfig();
                    const currentConfig = unwrapConfigFromManager(currentConfigResponse) || { mode: DEFAULT_POPUP_MODE };
                    if (currentConfig.mode === newMode) {
                        console.log('既に同じモードです:', newMode);
                        return;
                    }

                    console.log(`モード切り替え開始: ${currentConfig.mode} → ${newMode}`);

                    // UI即座更新（レスポンス向上）
                    console.log('🔧 [DEBUG] updateModeUI呼び出し前 - 要求モード:', newMode);
                    console.log('🔧 [DEBUG] クリックされたボタンの詳細:', {
                        textContent: clickedElement.textContent.trim(),
                        dataMode: clickedElement.dataset.mode,
                        currentActiveClass: clickedElement.classList.contains('active'),
                        shouldBeActive: clickedElement.dataset.mode === newMode
                    });
                    const uiUpdateResult = updateModeUI(newMode);
                    console.log('🔧 [DEBUG] updateModeUI呼び出し後 - 結果:', uiUpdateResult);

                    // 直後の状態確認
                    console.log('🔧 [DEBUG] updateModeUI直後の状態確認:');
                    elements.modeOptions.forEach((btn, idx) => {
                        const isActive = btn.classList.contains('active');
                        const expectedActive = btn.dataset.mode === newMode;
                        console.log(`  ボタン${idx}[${btn.dataset.mode}]: active=${isActive}, expected=${expectedActive}, text="${btn.textContent.trim()}"`);
                        if (isActive !== expectedActive) {
                            console.error(`  ❌ 状態不整合: ボタン${idx}[${btn.dataset.mode}] - active=${isActive}, expected=${expectedActive}`);
                        }
                    });

                    // UI更新後の実際の状態を確認
                    setTimeout(() => {
                        console.log('⏱️ [DEBUG] UI更新後の実際の状態確認:');
                        elements.modeOptions.forEach((btn, idx) => {
                            console.log(`  ボタン${idx}: mode="${btn.dataset.mode}", active=${btn.classList.contains('active')}, text="${btn.textContent.trim()}"`);
                        });
                    }, 100);

                    // 設定変更実行
                    console.log('🔄 configManager.changeMode呼び出し開始:', newMode);
                    const response = await configManager.changeMode(newMode);
                    console.log('📤 configManager.changeMode応答:', response);

                    // レスポンス検証（success プロパティをチェック）
                    const success = response && (response.success === true || response.success === undefined);
                    console.log('✅ モード変更成功判定:', success, 'response:', response);

                    if (success) {
                        // 選択した主モードを保存
                        persistMainMode(newMode);

                        // 設定再読み込み（UI更新をスキップ）
                        console.log('🔄 [DEBUG] 設定再読み込み開始 - UI更新はスキップして既に適用済みのnewModeを維持');
                        await loadSettingsWithoutUIUpdate();

                        const modeText = newMode === 'single' ? '単一' : newMode === 'multiple' ? '複数' : 'テスト';
                        showMessage(`${modeText}監視モードに切り替えました`, 'success');

                        console.log(`✅ モード切り替え完了: ${newMode}`);
                    } else {
                        // 失敗時は元のUIに戻す
                        console.error('❌ モード切り替え失敗:', response);
                        updateModeUI(currentConfig.mode);
                        showMessage('モード切り替えに失敗しました', 'error');
                    }
                } catch (error) {
                    console.error('モード切り替えエラー:', error);
                    showMessage(`モード切り替えエラー: ${error.message}`, 'error');

                    // エラー時は設定を再読み込みして状態を復元
                    try {
                        await loadSettings();
                    } catch (loadError) {
                        console.error('設定再読み込みエラー:', loadError);
                    }
                }
            });
        });
    }

    // 単一モード: 開始/停止/即座取得ボタン
    if (elements.startButton) {
        elements.startButton.addEventListener('click', async () => {
            try {
                // URL入力欄の blur で始まった保存も完了させてから監視を開始する。
                const started = await runSingleStartAfterSettingsSave({
                    save: flushSingleSettingsSave,
                    start: startMonitoring
                });
                if (!started) {
                    showMessage('設定の保存に失敗したため監視を開始できませんでした', 'error');
                }
            } catch (error) {
                console.error('開始ボタンクリックエラー:', error);
                showMessage('監視開始に失敗しました', 'error');
            }
        });
    }

    if (elements.stopButton) {
        console.log('✅ stopButton要素発見:', {
            element: elements.stopButton,
            id: elements.stopButton.id,
            className: elements.stopButton.className,
            disabled: elements.stopButton.disabled
        });

        elements.stopButton.addEventListener('click', async () => {
            console.log('🔵 stopButtonクリックイベント発火');
            try {
                await stopMonitoring();
            } catch (error) {
                console.error('停止ボタンクリックエラー:', error);
                showMessage('監視停止に失敗しました', 'error');
            }
        });

        console.log('✅ stopButtonイベントリスナー設定完了');
    } else {
        console.error('❌ stopButton要素が見つかりません - デバッグ情報:', {
            elementsKeys: Object.keys(elements),
            stopButtonInElements: 'stopButton' in elements,
            stopButtonValue: elements.stopButton
        });
    }

    if (elements.quickSourceButton) {
        elements.quickSourceButton.addEventListener('click', async () => {
            try {
                // 最新のフォーム値を保存してから即座取得
                await saveSettings();
                await quickCapture();
            } catch (error) {
                console.error('即座取得ボタンクリックエラー:', error);
                showMessage('即座取得に失敗しました', 'error');
            }
        });
    }

    if (elements.startStockFetchDiagnosisButton) {
        elements.startStockFetchDiagnosisButton.addEventListener('click', async () => {
            await startStockFetchDiagnosis();
        });
    }

    if (elements.startBulkStockFetchDiagnosisButton) {
        elements.startBulkStockFetchDiagnosisButton.addEventListener('click', async () => {
            await startBulkStockFetchDiagnosis();
        });
    }

    if (elements.diagnosisSiteSelect) {
        elements.diagnosisSiteSelect.addEventListener('change', handleDiagnosisSiteChange);
    }

    [elements.diagnosisActiveTab, elements.diagnosisUrl].filter(Boolean).forEach((input) => {
        input.addEventListener('change', updateDiagnosisTargetTypeUI);
    });

    if (elements.downloadStockApiInvestigationMemoButton) {
        elements.downloadStockApiInvestigationMemoButton.addEventListener('click', async () => {
            await downloadStockApiInvestigationMemo();
        });
    }

    if (elements.testScenarioSelect) {
        elements.testScenarioSelect.addEventListener('change', (event) => {
            renderTestScenarioPreview(event.target.value);
        });
    }

    if (elements.testTabSiteSelect) {
        elements.testTabSiteSelect.addEventListener('change', (event) => {
            setTestTabSite(event.target.value);
        });
    }

    if (elements.stopTestTabScenarioButton) {
        elements.stopTestTabScenarioButton.addEventListener('click', () => {
            void stopTestTabScenarioFromPopup();
        });
    }

    if (elements.copyTestTabManualCodeButton) {
        elements.copyTestTabManualCodeButton.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(elements.testTabManualCode?.textContent || '');
                showMessage('手動で在庫状態を変えるコードをコピーしました', 'success');
            } catch (error) {
                showMessage(`コピーできませんでした: ${error.message}`, 'error');
            }
        });
    }

    if (elements.testScenarioExecutionModeOptions?.length) {
        elements.testScenarioExecutionModeOptions.forEach((button) => {
            button.addEventListener('click', () => {
                setTestTabReproductionMode(button.dataset.testScenarioExecutionMode);
            });
        });
    }

    // A: 二層監視受け入れ確認
    if (elements.twoTierAcceptanceStartButtons?.length) {
        elements.twoTierAcceptanceStartButtons.forEach((button) => {
            button.addEventListener('click', async () => {
                const scenarioId = button.dataset.twoTierScenario;
                if (!scenarioId || Array.from(elements.twoTierAcceptanceStartButtons).some((item) => item.disabled)) {
                    return;
                }
                elements.twoTierAcceptanceStartButtons.forEach((item) => { item.disabled = true; });
                try {
                    await startTwoTierAcceptanceTest(scenarioId);
                } catch (error) {
                    console.error('二層監視テスト開始エラー:', error);
                    showMessage(error.message || '二層監視テストを開始できませんでした', 'error');
                    elements.twoTierAcceptanceStartButtons.forEach((item) => { item.disabled = false; });
                }
            });
        });
    }

    if (elements.resyncScheduledWatchSitesButton) {
        elements.resyncScheduledWatchSitesButton.addEventListener('click', async () => {
            const response = await sendScheduledWatchMessage({ action: 'resyncScheduledWatchSites' });
            renderScheduledWatchResyncResult(response?.resyncResult);
            if (!response?.success) {
                showMessage(response?.error || 'C アラームの再同期に失敗しました', 'error');
                return;
            }
            renderScheduledWatchSites(response.sites || []);
            showMessage('C アラームを再同期しました', 'success');
        });
    }
    if (elements.refreshScheduledWatchSitesButton) {
        elements.refreshScheduledWatchSitesButton.addEventListener('click', handleRefreshScheduledWatchSites);
    }
    if (elements.startSingleScheduledWatchTestButton) {
        elements.startSingleScheduledWatchTestButton.addEventListener('click', async () => {
            try { await startScheduledWatchSafetyTest('single'); }
            catch (error) { showMessage(error.message, 'error'); }
        });
    }
    if (elements.startMultiScheduledWatchTestButton) {
        elements.startMultiScheduledWatchTestButton.addEventListener('click', async () => {
            try { await startScheduledWatchSafetyTest('multi'); }
            catch (error) { showMessage(error.message, 'error'); }
        });
    }
    if (elements.startMultiScheduledWatchDiffTestButton) {
        elements.startMultiScheduledWatchDiffTestButton.addEventListener('click', async () => {
            try { await startScheduledWatchDiffTest(); }
            catch (error) { showMessage(error.message, 'error'); }
        });
    }
    if (elements.startMultiScheduledWatchArtifactDiffTestButton) {
        elements.startMultiScheduledWatchArtifactDiffTestButton.addEventListener('click', async () => {
            try { await startScheduledWatchArtifactDiffTest(); }
            catch (error) { showMessage(error.message, 'error'); }
        });
    }
    if (elements.scheduledWatchDiffTestCheckGmail) {
        elements.scheduledWatchDiffTestCheckGmail.addEventListener('change', () => {
            saveScheduledWatchDiffTestOptions().catch((error) => console.warn('差分検知テスト設定の保存に失敗:', error));
        });
    }

    if (elements.testScenarioModeOptions && elements.testScenarioModeOptions.length > 0) {
        elements.testScenarioModeOptions.forEach((button) => {
            button.addEventListener('click', async () => {
                try {
                    await setSelectedTestScenarioMode(button.dataset.testScenarioMode);
                } catch (error) {
                    console.error('テストシナリオモード切替エラー:', error);
                    showMessage('テストシナリオ表示の切替に失敗しました', 'error');
                }
            });
        });
    }

    if (elements.applyTestScenarioButton) {
        elements.applyTestScenarioButton.addEventListener('click', async () => {
            if (selectedTestScenarioMode === 'multiple') {
                await applyMultipleTestScenario();
                return;
            }

            await applySingleTestScenario();
        });
    }

    if (elements.restoreTestScenarioButton) {
        elements.restoreTestScenarioButton.addEventListener('click', async () => {
            if (selectedTestScenarioMode === 'multiple') {
                await restoreMultipleConfigBackup();
                return;
            }

            await restoreSingleConfigBackup();
        });
    }

    if (elements.startTestScenarioButton) {
        elements.startTestScenarioButton.addEventListener('click', async () => {
            if (selectedTestScenarioMode === 'multiple') {
                await startSelectedMultipleTestScenario();
                return;
            }

            await startSelectedSingleTestScenario();
        });
    }

    if (elements.copyDevtoolsCodeButton) {
        elements.copyDevtoolsCodeButton.addEventListener('click', () => copyScenarioCode('primary'));
    }

    if (elements.copyExtraDevtoolsCodeButton) {
        elements.copyExtraDevtoolsCodeButton.addEventListener('click', () => copyScenarioCode('extra'));
    }

    // SWログコピーボタン
    const copySwLogsButton = document.getElementById('copySwLogsButton');
    if (copySwLogsButton) {
        copySwLogsButton.addEventListener('click', copySwLogs);
    }

    if (elements.downloadAiSupportFile) {
        elements.downloadAiSupportFile.addEventListener('change', async () => {
            const activeMode = document.querySelector('button[data-mode].active')?.dataset.mode;
            const saved = await persistAiSupportFilePreference(activeMode);
            if (saved === false) {
                console.error('AI判断サポートファイル設定の保存に失敗しました');
            }
        });
    }

    // 複数モード用イベントリスナー
    if (elements.addMonitorButton) {
        elements.addMonitorButton.addEventListener('click', async () => {
            await openAddMonitorModal();
        });
    }

    if (elements.multipleSharedTargetpageEnvironment) {
        elements.multipleSharedTargetpageEnvironment.addEventListener('change', () => {
            renderMultipleSharedTargetpages().catch((error) => showMessage(error.message, 'error'));
        });
    }
    if (elements.addSharedTargetpageMonitorButton) {
        elements.addSharedTargetpageMonitorButton.addEventListener('click', () => {
            addSharedTargetpageToMultipleMonitoring().catch((error) => showMessage(error.message, 'error'));
        });
    }

    if (elements.monitoringList && elements.monitoringList.dataset.actionsBound !== 'true') {
        elements.monitoringList.addEventListener('click', (event) => {
            handleMonitoringListClick(event).catch((error) => {
                console.error('監視リスト操作エラー:', error);
                showMessage('監視対象の操作中にエラーが発生しました', 'error');
            });
        });
        elements.monitoringList.dataset.actionsBound = 'true';
    }

    // 🔍 Phase 2: startAllButton設定の大幅強化（CSP準拠版）
    console.log('🔵 [DEBUG] startAllButton設定前詳細確認 - Phase 2強化版:', {
        elementsStartAllButton: elements.startAllButton,
        directGetById: document.getElementById('startAllButton'),
        elementsExists: !!elements,
        startAllButtonExists: !!elements.startAllButton,
        functionsName: 'setupEventListeners',
        documentsReadyState: document.readyState,
        allStartButtons: document.querySelectorAll('[id*="start"]'),
        allButtonElements: document.querySelectorAll('button')
    });

    // 🔍 Phase 2: 要素取得の大幅冗長化
    let startAllButton = null;
    const startAllButtonCandidates = [
        elements.startAllButton,
        document.getElementById('startAllButton'),
        document.querySelector('#startAllButton'),
        document.querySelector('[id="startAllButton"]'),
        document.querySelector('button[onclick*="startAll"]'),
        document.querySelector('button[data-action="startAll"]')
    ];

    console.log('🔍 [DEBUG] startAllButton候補検索結果:', {
        candidates: startAllButtonCandidates.map((btn, idx) => ({
            index: idx,
            element: btn,
            exists: !!btn,
            id: btn?.id,
            className: btn?.className,
            textContent: btn?.textContent?.trim()
        }))
    });

    // 最初に見つかった有効な要素を採用
    for (let i = 0; i < startAllButtonCandidates.length; i++) {
        if (startAllButtonCandidates[i]) {
            startAllButton = startAllButtonCandidates[i];
            console.log(`✅ [DEBUG] startAllButton発見 - 候補${i}を採用:`, {
                element: startAllButton,
                id: startAllButton.id,
                className: startAllButton.className
            });
            break;
        }
    }

    if (startAllButton) {
        // 🔍 Phase 2: 詳細な要素状態確認
        console.log('🔵 [DEBUG] startAllButtonイベントリスナー設定開始 - Phase 2強化版（CSP準拠）', {
            element: startAllButton,
            type: startAllButton.constructor.name,
            id: startAllButton.id,
            className: startAllButton.className,
            disabled: startAllButton.disabled,
            offsetParent: startAllButton.offsetParent,
            clientWidth: startAllButton.clientWidth,
            clientHeight: startAllButton.clientHeight,
            style: {
                display: startAllButton.style.display,
                visibility: startAllButton.style.visibility,
                opacity: startAllButton.style.opacity
            },
            computedStyle: {
                display: getComputedStyle(startAllButton).display,
                visibility: getComputedStyle(startAllButton).visibility,
                opacity: getComputedStyle(startAllButton).opacity
            },
            functionsName: 'setupEventListeners',
            candidateIndex: startAllButtonCandidates.indexOf(startAllButton)
        });

        console.log('🔵 [DEBUG] 共有一括操作イベントリスナー設定開始');
        if (!multipleBatchControls && elements.stopAllButton) {
            multipleBatchControls = BatchControls.bind({
                startButton: startAllButton,
                stopButton: elements.stopAllButton,
                initialState: elements.stopAllButton.disabled ? 'idle' : 'running',
                onStart: startAllMonitoring,
                onStop: stopAllMonitoring
            });
        }
        const bound = Boolean(multipleBatchControls);
        console.log(bound ? '✅ [DEBUG] startAllButtonイベント登録完了' : 'ℹ️ [DEBUG] startAllButtonイベント登録済み');

        // 🔍 Phase 2: 手動テスト関数の強化
        window.testStartAllButton = function() {
            console.log('🧪 手動テスト: startAllButtonクリック実行 - Phase 2版（CSP準拠）');
            const testBtn = document.getElementById('startAllButton');
            if (testBtn) {
                console.log('🧪 テストボタン発見:', {
                    id: testBtn.id,
                    disabled: testBtn.disabled,
                    visible: testBtn.offsetParent !== null
                });
                testBtn.click();
            } else {
                console.error('🧪 手動テスト: startAllButton要素が見つかりません');
            }
        };

        window.testHandleStartButtonClick = function() {
            console.log('🧪 手動テスト: handleStartButtonClick関数直接実行 - Phase 2版');
            handleStartButtonClick();
        };

        // 🔍 Phase 2: イベント発火テスト関数追加
        window.testStartAllButtonEvent = function() {
            console.log('🧪 手動テスト: イベント発火テスト（CSP準拠）');
            const testBtn = document.getElementById('startAllButton');
            if (testBtn) {
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                testBtn.dispatchEvent(clickEvent);
                console.log('🧪 イベント発火完了');
            } else {
                console.error('🧪 イベントテスト: startAllButton要素が見つかりません');
            }
        };

        console.log('🔵 [DEBUG] startAllButtonイベントリスナー設定完了（Phase 2: CSP準拠版）');
        console.log('🧪 テスト関数追加完了: window.testStartAllButton(), window.testHandleStartButtonClick(), window.testStartAllButtonEvent()');

    } else {
        // 🔍 Phase 2: 要素が見つからない場合の詳細調査
        console.error('🔵 [DEBUG] startAllButton発見失敗 - 詳細調査:', {
            elements: elements,
            elementsStartAllButton: elements?.startAllButton,
            directStartAllButton: document.getElementById('startAllButton'),
            allButtons: Array.from(document.querySelectorAll('button')).map(btn => ({
                id: btn.id,
                className: btn.className,
                textContent: btn.textContent.trim(),
                onclick: btn.onclick
            })),
            documentsBody: !!document.body,
            documentReadyState: document.readyState,
            functionsName: 'setupEventListeners'
        });

        // 🔍 Phase 2: 遅延要素取得の仕組み
        setTimeout(() => {
            console.log('🕐 [DEBUG] 遅延要素取得試行 - 500ms後');
            const delayedButton = document.getElementById('startAllButton');
            if (delayedButton) {
                const bound = multipleBatchControls || (elements.stopAllButton && BatchControls.bind({
                    startButton: delayedButton,
                    stopButton: elements.stopAllButton,
                    initialState: elements.stopAllButton.disabled ? 'idle' : 'running',
                    onStart: startAllMonitoring,
                    onStop: stopAllMonitoring
                }));
                if (bound && !multipleBatchControls) multipleBatchControls = bound;
                console.log(bound ? '✅ [DEBUG] 遅延取得成功 - イベント登録完了' : 'ℹ️ [DEBUG] 遅延取得成功 - 既に登録済み');
            } else {
                console.error('❌ [DEBUG] 遅延取得も失敗');
            }
        }, 500);
    }

    if (elements.stopAllButton && !multipleBatchControls) {
        elements.stopAllButton.addEventListener('click', stopAllMonitoring);
    }

    if (elements.refreshStatusButton) {
        elements.refreshStatusButton.addEventListener('click', refreshMonitoringStatus);
    }

    // モーダル関連イベント
    if (elements.modalAddButton) {
        elements.modalAddButton.addEventListener('click', addNewMonitorTarget);
    }

    if (elements.multipleEcSiteSelect) {
        elements.multipleEcSiteSelect.addEventListener('change', () => {
            handleMultipleEcSiteChange({ target: elements.multipleEcSiteSelect })
                .catch((error) => showMessage(error.message, 'error'));
        });
    }

    if (elements.ecSiteSelectKeyword) {
        elements.ecSiteSelectKeyword.addEventListener('change', handleEcSiteDropdownChange);
    }

    elements?.multipleUrlSubtabs?.forEach((button) => {
        button.addEventListener('click', () => renderMultipleUrlSubtab(button.dataset.multipleUrlSubtab));
    });
    renderMultipleUrlSubtab('product');

    if (elements.multipleListWatchSite) {
        elements.multipleListWatchSite.addEventListener('change', () => {
            renderMultipleListWatchProfileSelect(elements.multipleListWatchSite.value);
            if (elements.multipleListWatchUrl) elements.multipleListWatchUrl.value = '';
        });
    }
    if (elements.multipleListWatchProfile) {
        elements.multipleListWatchProfile.addEventListener('change', () => {
            const profile = getScheduledWatchProfile(elements.multipleListWatchSite?.value, elements.multipleListWatchProfile.value);
            if (profile && elements.multipleListWatchUrl) elements.multipleListWatchUrl.value = profile.url;
            if (profile && elements.multipleListWatchName && !elements.multipleListWatchName.value) elements.multipleListWatchName.value = profile.name || '';
        });
    }
    if (elements.saveMultipleListWatchButton) {
        elements.saveMultipleListWatchButton.addEventListener('click', async () => {
            try { await saveMultipleListWatchTarget(); } catch (error) { showMessage(error.message || '一覧監視設定を保存できませんでした', 'error'); }
        });
    }
    if (elements.setMultipleListWatchTimesFromNowButton) {
        elements.setMultipleListWatchTimesFromNowButton.addEventListener('click', setMultipleListWatchTimesFromNow);
    }
    if (elements.startMultipleListWatchNowButton) {
        elements.startMultipleListWatchNowButton.addEventListener('click', () => {
            startMultipleListWatchNow().catch((error) => showMessage(error.message || '一覧監視の即時開始に失敗しました', 'error'));
        });
    }
    if (elements.stopMultipleListWatchNowButton) {
        elements.stopMultipleListWatchNowButton.addEventListener('click', () => {
            stopMultipleListWatchNow().catch((error) => showMessage(error.message || '一覧監視の即時停止に失敗しました', 'error'));
        });
    }
    if (elements.cancelMultipleListWatchEditButton) {
        elements.cancelMultipleListWatchEditButton.addEventListener('click', resetMultipleListWatchForm);
    }
    if (elements.multipleListWatchList) {
        elements.multipleListWatchList.addEventListener('change', (event) => {
            if (event.target.matches('[data-list-watch-immediate-select]')) updateMultipleListWatchImmediateControls();
        });
        elements.multipleListWatchList.addEventListener('click', async (event) => {
            if (event.target.matches('[data-list-watch-immediate-select]')) {
                updateMultipleListWatchImmediateControls();
                return;
            }
            const button = event.target.closest('[data-list-watch-action]');
            if (!button) return;
            const config = unwrapConfigFromManager(await configManager.loadConfig()) || {};
            const targets = config.multiple_list_watch_configs || [];
            const target = targets.find((item) => item.id === button.dataset.listWatchId);
            if (!target) return;
            if (button.dataset.listWatchAction === 'delete') {
                config.multiple_list_watch_configs = targets.filter((item) => item.id !== target.id);
                await configManager.saveConfig(config);
                renderMultipleListWatchList(config);
                showMessage('一覧監視設定を削除しました', 'success');
                return;
            }
            if (button.dataset.listWatchAction === 'toggle-enabled') {
                button.disabled = true;
                try {
                    await setMultipleListWatchTargetEnabled(target.id, target.enabled === false);
                } catch (error) {
                    showMessage(error?.message || '一覧監視の予約を変更できませんでした', 'error');
                }
                return;
            }
            window._editingMultipleListWatchId = target.id;
            elements.multipleListWatchSite.value = target.siteId;
            renderMultipleListWatchProfileSelect(target.siteId, target.profileId);
            elements.multipleListWatchName.value = target.name || '';
            elements.multipleListWatchUrl.value = target.url || '';
            elements.multipleListWatchStartTime.value = target.startTime || '11:57';
            elements.multipleListWatchEndTime.value = target.endTime || '12:05';
            elements.multipleListWatchInterval.value = target.intervalSeconds || 30;
            elements.saveMultipleListWatchButton.textContent = '一覧監視を更新';
            elements.cancelMultipleListWatchEditButton.hidden = false;
        });
    }

    if (elements.modalCancelButton) {
        elements.modalCancelButton.addEventListener('click', () => {
            if (elements.addMonitorModal) {
                elements.addMonitorModal.style.display = 'none';
                clearModalInputs();
            }
        });
    }

    // 複数監視共通設定のイベントリスナー
    // 検知モード変更時の保存
    if (elements.multiDetectAppear) {
        elements.multiDetectAppear.addEventListener('change', saveMultipleModeCommonSettings);
    }
    if (elements.multiDetectDisappear) {
        elements.multiDetectDisappear.addEventListener('change', saveMultipleModeCommonSettings);
    }

    // 初期検知設定変更時の保存
    if (elements.multiInitialKeywordDetection) {
        elements.multiInitialKeywordDetection.addEventListener('change', saveMultipleModeCommonSettings);
    }

    // リロード後待機時間設定変更時の保存
    if (elements.multiReloadWaitAfterReload) {
        elements.multiReloadWaitAfterReload.addEventListener('change', saveMultipleModeCommonSettings);
    }
    if (elements.multiScheduleEnabled) {
        elements.multiScheduleEnabled.addEventListener('change', () =>
            saveMultipleModeCommonSettings({ showScheduleMessage: true })
        );
    }
    if (elements.multiScheduleTime) {
        elements.multiScheduleTime.addEventListener('change', () =>
            saveMultipleModeCommonSettings({ showScheduleMessage: true })
        );
    }
    if (elements.setMultipleScheduledMonitoringTimeFromNowButton) {
        elements.setMultipleScheduledMonitoringTimeFromNowButton.addEventListener('click', () => {
            setMultipleScheduledMonitoringTimeFromNow().catch((error) => showMessage(error.message, 'error'));
        });
    }
    // interval設定
    if (elements.multiInterval) {
        elements.multiInterval.addEventListener('change', async function() {
            const value = this.value;
            if (value === 'custom') {
                elements.multiCustomIntervalContainer.style.display = 'block';
            } else {
                elements.multiCustomIntervalContainer.style.display = 'none';
            }
            // 設定を保存
            await saveMultipleModeCommonSettings();
        });
    }

    // カスタムinterval値の変更
    if (elements.multiCustomInterval) {
        elements.multiCustomInterval.addEventListener('input', function() {
            elements.multiCustomIntervalValue.textContent = this.value;
        });
        elements.multiCustomInterval.addEventListener('change', saveMultipleModeCommonSettings);
    }

    // duration設定
    if (elements.multiDuration) {
        elements.multiDuration.addEventListener('change', async function() {
            const value = this.value;
            if (value === 'custom') {
                elements.multiCustomDurationContainer.style.display = 'block';
            } else {
                elements.multiCustomDurationContainer.style.display = 'none';
            }
            // 設定を保存
            await saveMultipleModeCommonSettings();
        });
    }

    // カスタムduration値の変更
    if (elements.multiCustomDuration) {
        elements.multiCustomDuration.addEventListener('input', function() {
            elements.multiCustomDurationValue.textContent = this.value;
        });
        elements.multiCustomDuration.addEventListener('change', saveMultipleModeCommonSettings);
    }

    // 単一モード: カスタム期間値の変更（監視期間用）
    if (elements.customDuration) {
        elements.customDuration.addEventListener('input', function() {
            elements.customDurationValue.textContent = this.value;
        });
    }

    // 単一モード: 停止条件カスタム期間値の変更
    if (elements.stopCustomDuration) {
        elements.stopCustomDuration.addEventListener('input', function() {
            elements.stopCustomDurationValue.textContent = this.value;
        });
    }

    // 単一モード: 停止回数値の変更
    if (elements.stopCount) {
        elements.stopCount.addEventListener('input', function() {
            elements.stopCountValue.textContent = this.value;
        });
    }

    // モーダル外クリックで閉じる
    if (elements.addMonitorModal) {
        elements.addMonitorModal.addEventListener('click', (e) => {
            if (e.target === elements.addMonitorModal) {
                elements.addMonitorModal.style.display = 'none';
                clearModalInputs();
            }
        });
    }

    // 🔧 手動テスト用設定の制御機能を追加
    setupManualTestSettingsToggle();
    setupMultiManualTestSettingsToggle();

    // 📊 Excel Export/Import機能を追加
    setupExcelEventListeners();

    console.log('✅ イベントリスナー設定完了 - Phase 2強化版（CSP準拠）');
}

// ログレベルを取得してUIに反映
function resolveVisibleLogLevel(level) {
    const numericLevel = Number(level);

    if (numericLevel === 4) {
        return '4';
    }

    if (numericLevel === 1) {
        return '1';
    }

    return '3';
}

async function loadLogLevel() {
    try {
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'getLogLevel' }, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result);
                }
            });
        });
        if (response && response.success === true) {
            const logLevelSelect = document.getElementById('logLevel');
            if (logLevelSelect) {
                logLevelSelect.value = resolveVisibleLogLevel(response.currentLevel);
                console.log('ログレベルを取得しました:', response.currentLevel);
            }
        }
    } catch (error) {
        console.warn('ログレベル取得に失敗:', error);
    }
}

// === 単一監視用の基本関数群 ===

// 現在の設定を取得
function getCurrentSettings() {
    console.log('🔍 getCurrentSettings実行開始');

    if (!elements) {
        console.error('❌ elements未初期化');
        throw new Error('DOM要素が初期化されていません');
    }

    const settings = {
        downloadSource: elements.downloadSource ? elements.downloadSource.checked : true,
        downloadSourceWithoutFooter: elements.downloadSourceWithoutFooter ? elements.downloadSourceWithoutFooter.checked : false,
        downloadScreenshot: elements.downloadScreenshot ? elements.downloadScreenshot.checked : true,
        downloadAiSupportFile: elements.downloadAiSupportFile ? elements.downloadAiSupportFile.checked : false,
        captureMode: elements.captureMode?.value === 'fetch' ? 'fetch' : 'reload',
        monitorType: elements.monitorActiveTab && elements.monitorActiveTab.checked ? 'activeTab' : 'url',
        targetUrl: elements.targetUrl ? elements.targetUrl.value : '',
        monitorSelector: elements.monitorSelector ? sanitizeSelector(elements.monitorSelector.value) : '',
        monitorKeyword: elements.monitorKeyword ? elements.monitorKeyword.value : '',
        detectMode: elements.detectAppear && elements.detectAppear.checked ? 'appear' : 'disappear',
        initialKeywordDetection: elements.initialKeywordDetection ? elements.initialKeywordDetection.checked : false,
        interval: elements.interval ? (elements.interval.value === 'custom' ? parseInt(elements.customInterval.value) : parseInt(elements.interval.value)) : 30,
        duration: elements.duration ? (elements.duration.value === 'custom' ? parseInt(elements.customDuration.value) * 60 : parseInt(elements.duration.value)) : 60,
        stopCondition: elements.stopCondition ? elements.stopCondition.value : 'manual',
        stopCount: elements.stopCount ? parseInt(elements.stopCount.value) : 10,
        stopCustomDuration: elements.stopCustomDuration ? parseInt(elements.stopCustomDuration.value) : 60,
        // 🔧 手動テスト用設定を追加
        reloadWaitAfterReload: elements.reloadWaitAfterReload
            ? parseInt(elements.reloadWaitAfterReload.value, 10)
            : SINGLE_RELOAD_WAIT_AFTER_RELOAD_DEFAULT
    };
    const targetpage = normalizeTargetpageProfile(selectedTargetpageProfile);
    if (targetpage) {
        settings.targetpage = targetpage;
        settings.notifyExternalExtension = true;
        settings.externalExtensionId = targetpage.externalExtensionId;
    }

    // 停止条件が'custom'の場合はdurationをstopCustomDuration値で上書き
    if (settings.stopCondition === 'custom') {
        settings.duration = settings.stopCustomDuration * 60; // 分を秒に変換
    }

    console.log('📋 現在の設定:', {
        monitorType: settings.monitorType,
        targetUrl: settings.targetUrl,
        monitorKeyword: settings.monitorKeyword,
        detectMode: settings.detectMode,
        initialKeywordDetection: settings.initialKeywordDetection,
        interval: settings.interval,
        // 🔧 手動テスト用設定のログを追加
        reloadWaitAfterReload: settings.reloadWaitAfterReload
    });

    return settings;
}

function validateSingleMonitoringSettings(settings = {}) {
    if (!String(settings.monitorKeyword || '').trim()) {
        return '監視キーワードを入力してください';
    }
    if (settings.monitorType === 'url' && !String(settings.targetUrl || '').trim()) {
        return '監視対象URLを入力してください';
    }
    if (settings.monitorType === 'url') {
        try {
            new URL(settings.targetUrl);
        } catch (_) {
            return '有効なURLを入力してください';
        }
    }
    return null;
}

// 単一監視開始
async function startMonitoring() {
    console.log('🚀 startMonitoring実行開始');

    try {
        // 設定を取得
        const settings = getCurrentSettings();

        const validationError = validateSingleMonitoringSettings(settings);
        if (validationError) {
            showMessage(validationError, 'error');
            return;
        }

        console.log('✅ バリデーション通過', {
            monitorType: settings.monitorType,
            hasKeyword: !!settings.monitorKeyword.trim(),
            hasUrl: settings.monitorType === 'activeTab' || !!settings.targetUrl.trim()
        });

        let targetTabId = null;

        // タブIDの取得
        if (settings.monitorType === 'activeTab') {
            // アクティブタブを取得
            console.log('📋 アクティブタブ取得開始');
            const tabs = await new Promise((resolve) => {
                chrome.tabs.query({ active: true, currentWindow: true }, resolve);
            });
            if (tabs.length === 0) {
                throw new Error('アクティブタブが見つかりません');
            }
            targetTabId = tabs[0].id;
            console.log('✅ アクティブタブID取得:', targetTabId);

        } else {
            // 指定URL監視の場合、background.js側でタブ作成するためダミーのタブIDを設定
            console.log('📋 指定URL監視 - background.js側でタブ作成予定:', settings.targetUrl);
            // アクティブタブのIDをダミーとして取得（background.js側で新規タブを作成するため実際には使用されない）
            const tabs = await new Promise((resolve) => {
                chrome.tabs.query({ active: true, currentWindow: true }, resolve);
            });
            if (tabs.length === 0) {
                throw new Error('アクティブタブが見つかりません');
            }
            targetTabId = tabs[0].id;
            console.log('✅ ダミータブID設定完了（background側でタブ作成）:', targetTabId);
        }

        // 監視開始をbackground scriptに送信
        console.log('📡 background scriptに監視開始要求送信', {
            tabId: targetTabId,
            settingsKeys: Object.keys(settings)
        });

        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'startMonitoring',
                tabId: targetTabId,
                settings: settings
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Background通信エラー:', chrome.runtime.lastError);
                    reject(new Error(`Background通信エラー: ${chrome.runtime.lastError.message}`));
                    return;
                }

                console.log('📡 Background応答受信:', response);
                resolve(response);
            });
        });

        if (response && response.success) {
            console.log('✅ 監視開始成功');
            showMessage('監視を開始しました', 'success');
            updateButtonState(true);

            // ステータス更新を開始
            startStatusUpdates();
        } else {
            console.error('❌ 監視開始失敗:', response);
            showMessage(`監視開始に失敗しました: ${response?.error || '不明なエラー'}`, 'error');
        }

    } catch (error) {
        console.error('❌ startMonitoring エラー:', error);
        showMessage(`監視開始でエラーが発生しました: ${error.message}`, 'error');
    }
}

// 単一監視停止
async function stopMonitoring() {
    console.log('🛑 stopMonitoring実行開始');

    try {
        // アクティブタブIDを取得
        const tabs = await new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });

        if (tabs.length === 0) {
            throw new Error('アクティブタブが見つかりません');
        }

        const targetTabId = tabs[0].id;
        console.log('✅ 停止対象タブID:', targetTabId);

        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'stopMonitoring',
                tabId: targetTabId
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Background通信エラー:', chrome.runtime.lastError);
                    reject(new Error(`Background通信エラー: ${chrome.runtime.lastError.message}`));
                    return;
                }

                console.log('📡 Background応答受信:', response);
                resolve(response);
            });
        });

        if (response && response.success) {
            console.log('✅ 監視停止成功');
            showMessage('監視を停止しました', 'success');
            updateButtonState(false);

            // ステータス更新を停止
            stopStatusUpdates();
        } else {
            console.error('❌ 監視停止失敗:', response);
            showMessage(`監視停止に失敗しました: ${response?.error || '不明なエラー'}`, 'error');
        }

    } catch (error) {
        console.error('❌ stopMonitoring エラー:', error);
        showMessage(`監視停止でエラーが発生しました: ${error.message}`, 'error');
    }
}

// 即座取得
async function quickCapture() {
    console.log('⚡ quickCapture実行開始');

    try {
        // 設定を取得
        const settings = getCurrentSettings();

        let targetTabId = null;

        // タブIDの取得
        if (settings.monitorType === 'activeTab') {
            // アクティブタブを取得
            const tabs = await new Promise((resolve) => {
                chrome.tabs.query({ active: true, currentWindow: true }, resolve);
            });
            if (tabs.length === 0) {
                throw new Error('アクティブタブが見つかりません');
            }
            targetTabId = tabs[0].id;
            console.log('✅ アクティブタブID取得:', targetTabId);

        } else {
            try {
                new URL(settings.targetUrl);
            } catch (_) {
                throw new Error('有効な指定URLを入力してください');
            }
            console.log('✅ 指定URLを使用（即座取得）:', settings.targetUrl);
        }

        // 即座取得をbackground scriptに送信
        console.log('📡 background scriptに即座取得要求送信', {
            tabId: targetTabId,
            settingsKeys: Object.keys(settings)
        });

        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'quickCapture',
                tabId: targetTabId,
                settings: settings
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Background通信エラー:', chrome.runtime.lastError);
                    reject(new Error(`Background通信エラー: ${chrome.runtime.lastError.message}`));
                    return;
                }

                console.log('📡 Background応答受信:', response);
                resolve(response);
            });
        });

        if (response && response.status === 'success') {
            console.log('✅ 即座取得成功');
            showMessage('ページを取得しました', 'success');
        } else {
            console.error('❌ 即座取得失敗:', response);
            showMessage(`即座取得に失敗しました: ${response?.error || '不明なエラー'}`, 'error');
        }

    } catch (error) {
        console.error('❌ quickCapture エラー:', error);
        showMessage(`即座取得でエラーが発生しました: ${error.message}`, 'error');
    }
}

let latestStockFetchDiagnosis = null;

function formatStockFetchDiagnosisTimestamp(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

function renderBulkStockFetchDiagnosis(summary) {
    if (!elements?.bulkStockFetchDiagnosisResult) return;
    const formatState = (state, label) => {
        const result = summary.states?.[state] || {};
        return `${label}: Fetch ${result.fetchExpected || 0}/${result.total || 0}、DOM ${result.domExpected || 0}/${result.total || 0}`;
    };
    const diagnosedAt = formatStockFetchDiagnosisTimestamp(summary.diagnosedAt);
    elements.bulkStockFetchDiagnosisResult.textContent = [
        `最終判定: ${summary.diagnosisCode}`,
        ...(diagnosedAt ? [`判定日時: ${diagnosedAt}`] : []),
        formatState('in_stock', '在庫あり'),
        formatState('out_of_stock', '在庫なし')
    ].join('\n');
    elements.bulkStockFetchDiagnosisResult.style.whiteSpace = 'pre-line';

}

async function restoreBulkStockFetchDiagnosis() {
    const { stockFetchBulkDiagnosisResult: summary } = await chrome.storage.local.get('stockFetchBulkDiagnosisResult');
    if (summary?.diagnosisCode) renderBulkStockFetchDiagnosis(summary);
}

async function restoreStockFetchDiagnosis() {
    const { stockFetchDiagnosisResult: diagnosis } = await chrome.storage.local.get('stockFetchDiagnosisResult');
    if (!diagnosis?.diagnosisCode) return;
    latestStockFetchDiagnosis = diagnosis;
    renderStockFetchDiagnosis(diagnosis);
}

async function startBulkStockFetchDiagnosis() {
    const button = elements?.startBulkStockFetchDiagnosisButton;
    try {
        const [{ diagnosisSiteId = '' }, diagnosisSites, ecSites] = await Promise.all([
            chrome.storage.local.get('diagnosisSiteId'), loadStockFetchDiagnosisSites(), loadEcSites()
        ]);
        const { site, reason } = resolveBulkStockFetchDiagnosisSite(diagnosisSiteId, diagnosisSites);
        if (!site) throw new Error(reason);

        // ec-sites.json から該当サイトの monitorProfile を取得
        const ecSite = ecSites.find((s) => s.id === site.id);
        const profile = ecSite?.monitorProfiles?.find((candidate) => candidate.id === 'product-default');
        if (!profile?.selector || !profile?.keyword) {
            throw new Error(`${site.name || site.id} の監視設定が ec-sites.json に見つかりません。`);
        }

        if (button) button.disabled = true;
        if (elements?.bulkStockFetchDiagnosisResult) elements.bulkStockFetchDiagnosisResult.textContent = '登録済みサンプルを順番に取得・比較しています…';
        const response = await chrome.runtime.sendMessage({
            action: 'bulkDiagnoseStockFetch', siteId: site.id, siteName: site.name,
            samples: site.samples, selector: profile.selector, keyword: profile.keyword
        });
        if (!response?.success) throw new Error(response?.error || '一括診断に失敗しました');
        renderBulkStockFetchDiagnosis(response.summary);
        showMessage('在庫あり・なしの一括診断を保存しました', 'success');
    } catch (error) {
        console.error('一括在庫取得方式診断エラー:', error);
        if (elements?.bulkStockFetchDiagnosisResult) elements.bulkStockFetchDiagnosisResult.textContent = `一括診断に失敗しました: ${error.message}`;
        showMessage(`一括診断に失敗しました: ${error.message}`, 'error');
    } finally {
        await refreshBulkStockFetchDiagnosisAvailability();
    }
}

function getStockFetchDiagnosisInput() {
    const monitorType = elements?.diagnosisActiveTab?.checked ? 'activeTab' : 'url';
    const targetUrl = String(elements?.diagnosisTargetUrl?.value || '').trim();
    const selector = String(elements?.diagnosisSelector?.value || '').trim();
    const keyword = String(elements?.diagnosisKeyword?.value || '').trim();
    if (!selector || !keyword) {
        throw new Error('診断セレクタと在庫ありキーワードを入力してください');
    }
    if (monitorType === 'url') {
        if (!targetUrl) throw new Error('診断対象URLを入力してください');
        new URL(targetUrl);
    }
    return { monitorType, targetUrl, selector, keyword };
}

function renderStockFetchDiagnosis(diagnosis) {
    if (!elements?.stockFetchDiagnosisResult) return;
    const fetch = diagnosis.fetch || {};
    const analysis = diagnosis.analysis || {};
    const fetchSummary = analysis.fetch || {};
    const domSummary = analysis.dom || {};
    const diagnosedAt = formatStockFetchDiagnosisTimestamp(diagnosis.diagnosedAt);
    elements.stockFetchDiagnosisResult.textContent = [
        `判定: ${diagnosis.diagnosisCode}`,
        ...(diagnosedAt ? [`判定日時: ${diagnosedAt}`] : []),
        `条件: ${diagnosis.selector} / ${diagnosis.keyword}`,
        `Fetch: HTTP ${fetch.status ?? '取得失敗'}、要素 ${fetchSummary.matchCount ?? 0}件、キーワード ${fetchSummary.keywordMatchCount ?? 0}件`,
        `DOM: 要素 ${domSummary.matchCount ?? 0}件、キーワード ${domSummary.keywordMatchCount ?? 0}件`,
        diagnosis.needsApiInvestigation
            ? '次の操作: DevTools調査メモを保存し、NetworkのFetch/XHRを確認してください。'
            : '注意: 反対の在庫状態も取得してからFetch方式を最終判断してください。'
    ].join('\n');
    elements.stockFetchDiagnosisResult.style.whiteSpace = 'pre-line';
    if (elements.downloadStockApiInvestigationMemoButton) {
        elements.downloadStockApiInvestigationMemoButton.hidden = !diagnosis.needsApiInvestigation;
    }
}

async function startStockFetchDiagnosis() {
    const button = elements?.startStockFetchDiagnosisButton;
    try {
        const input = getStockFetchDiagnosisInput();
        let tabId = null;
        if (input.monitorType === 'activeTab') {
            const tabs = await new Promise((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, resolve));
            tabId = tabs[0]?.id;
            if (tabId == null) throw new Error('アクティブタブが見つかりません');
        }
        if (button) button.disabled = true;
        if (elements.stockFetchDiagnosisResult) elements.stockFetchDiagnosisResult.textContent = 'Fetch HTMLとDOMを取得・比較しています…';
        const response = await chrome.runtime.sendMessage({
            action: 'diagnoseStockFetch',
            monitorType: input.monitorType,
            targetUrl: input.targetUrl,
            tabId,
            observedState: elements.stockFetchObservedState?.value || 'unknown',
            selector: input.selector,
            keyword: input.keyword
        });
        if (!response?.success) throw new Error(response?.error || '診断に失敗しました');
        latestStockFetchDiagnosis = response.diagnosis;
        renderStockFetchDiagnosis(latestStockFetchDiagnosis);
        showMessage('取得方式診断を保存しました', 'success');
    } catch (error) {
        console.error('在庫取得方式診断エラー:', error);
        if (elements?.stockFetchDiagnosisResult) elements.stockFetchDiagnosisResult.textContent = `診断に失敗しました: ${error.message}`;
        showMessage(`取得方式診断に失敗しました: ${error.message}`, 'error');
    } finally {
        if (button) button.disabled = false;
    }
}

async function downloadStockApiInvestigationMemo() {
    if (!latestStockFetchDiagnosis) return;
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'downloadStockApiInvestigationMemo',
            diagnosis: latestStockFetchDiagnosis
        });
        if (!response?.success) throw new Error(response?.error || '調査メモの保存に失敗しました');
        showMessage('DevTools調査メモを保存しました', 'success');
    } catch (error) {
        showMessage(`調査メモの保存に失敗しました: ${error.message}`, 'error');
    }
}

// Phase 2: モードUI切り替え機能（重複削除済み - line 998の関数を使用）

// Phase 2: 設定読み込み機能
async function loadSettings() {
    try {
        console.log('loadSettings実行開始');

        // configManager存在確認
        if (!configManager) {
            console.error('❌ configManager未初期化');
            return false;
        }

        // 設定読み込み
        const result = await configManager.loadConfig();
        if (!result || !result.success || !result.config) {
            console.warn('⚠️ 設定読み込み失敗 - デフォルト設定使用');
            console.warn('設定応答:', result);
            // デフォルト設定でUI更新
            updateModeUI(DEFAULT_POPUP_MODE);
            return false;
        }

        const config = result.config;
        await Promise.all([loadEcSites(), loadScheduledWatchSitesForPopup()]);
        renderMultipleListWatchSiteSelect(elements?.multipleListWatchSite?.value || '');
        renderMultipleListWatchList(config);
        const listCommon = config.multiple_list_watch_common_settings || {};
        if (elements?.multipleListWatchOpenProductUrl) elements.multipleListWatchOpenProductUrl.checked = listCommon.openProductUrl === true;
        if (elements?.multipleListWatchNotifyExternal) elements.multipleListWatchNotifyExternal.checked = listCommon.notifyExternalExtension === true;
        if (elements?.multipleListWatchExternalId) elements.multipleListWatchExternalId.value = listCommon.externalExtensionId || '';
        restoreSelectedMultipleTestScenarioId(config.multiple_test_scenario_state || null);
        console.log('✅ 設定読み込み成功:', result);

        // モードUIの更新（保存済み主モードを優先）
        const mode = resolveInitialPopupMode(config);
        console.log('📁 [DEBUG] loadSettings内updateModeUI呼び出し:', {
            configMode: config.mode,
            storedMainMode: readStoredMainMode(),
            resolvedMode: mode,
            fullConfig: config
        });
        updateModeUI(mode);
        renderTestModeState(config);
        loadSingleKeywordScheduleSettings(config.single_keyword_schedule || {});
        loadSingleScheduledWatchSettings(config.single_scheduled_watch || {});

        // 単一モード設定の反映
        if ((mode === 'single' || mode === 'test') && config.single_config) {
            const singleConfig = config.single_config;
            loadSingleModeSettings(singleConfig);
            console.log('✅ 単一モード設定反映完了');
                        } else if (mode === 'multiple') {
            // 複数モード設定の読み込み
            console.log('🔄 複数モード設定読み込み開始', {
                configMultipleConfigs: config.multiple_configs,
                isArray: Array.isArray(config.multiple_configs),
                length: Array.isArray(config.multiple_configs) ? config.multiple_configs.length : 'N/A'
            });

            // elementsの状態確認
            console.log('🔍 elements状態確認:', {
                elements: !!elements,
                monitoringList: !!elements?.monitoringList,
                multipleModeUI: !!elements?.multipleModeUI
            });

            try {
                console.log('🔒 loadSettings: popup表示時はread-onlyで最新状態を取得');
                console.log('🔍 loadSettings: 自動統一化実行可否:', {
                    shouldAutoUnify: shouldAutoUnifyDataStructureOnPopupLoad(config)
                });
                const updatedResponse = await getStatusWithFallback();

                if (updatedResponse && updatedResponse.success) {
                    // getStatusの応答から正しいデータを取得
                    console.log('🔍 getStatus応答の完全な内容:', updatedResponse);
                    console.log('🔍 getStatus応答の型情報:', {
                        type: typeof updatedResponse,
                        keys: Object.keys(updatedResponse || {}),
                        multipleConfigsType: typeof updatedResponse?.multiple_configs,
                        multipleConfigsIsArray: Array.isArray(updatedResponse?.multiple_configs)
                    });

                    const resolvedData = resolveMultipleMonitoringConfigForPopup(updatedResponse, config);
                    if (resolvedData.source === 'persisted') {
                        logMultipleMonitoringResolution('loadSettings 保存済み正本へ復帰', config);
                        loadMultipleModeCommonSettings(config);
                        await loadMultipleModeSettings(resolvedData.selectedTargets);
                        return;
                    }

                    logMultipleMonitoringResolution('loadSettings getStatus 解決結果', {
                        multiple_configs: resolvedData.multipleConfigs
                    });
                    loadMultipleModeCommonSettings(updatedResponse);

                    console.log('📊 最新データ:', resolvedData.selectedTargets.length, '件');

                    if (resolvedData.selectedTargets.length > 0) {
                        await loadMultipleModeSettings(resolvedData.selectedTargets);
                        return; // 早期リターン
                    } else {
                        await loadMultipleModeSettings([]);
                        return; // 空の正本一覧は正常状態
                    }
                }
            } catch (error) {
                console.warn('⚠️ loadSettings read-only取得でエラーが発生:', error);
            }

            // フォールバック: 元のデータで読み込み
            console.log('📊 フォールバック: 元のデータで読み込み');

                                    // 最後の手段として、3段階フォールバックgetStatusを試行
                        try {
                            console.log('🔄 loadSettings: 最終手段フォールバック開始');
                            const finalResponse = await getStatusWithFallback();

                            if (finalResponse && finalResponse.success) {
                                // getStatusの応答から正しいデータを取得
                                console.log('🔍 フォールバックgetStatus応答の完全な内容:', finalResponse);
                                console.log('🔍 フォールバックgetStatus応答の型情報:', {
                                    type: typeof finalResponse,
                                    keys: Object.keys(finalResponse || {}),
                                    multipleConfigsType: typeof finalResponse?.multiple_configs,
                                    multipleConfigsIsArray: Array.isArray(finalResponse?.multiple_configs)
                                });

                                // データの存在確認と抽出（サマリー対応）
                                let resolvedData = resolveMultipleMonitoringCollections(finalResponse);

                                // サマリー形式の場合、Chrome Storageから直接取得
                                if (finalResponse.multiple_configs_summary) {
                                    const optimizationInfo = finalResponse.size_optimized ? 
                                        'サイズ最適化による軽量化応答' : 'サマリー応答';
                                    console.log(`📦 フォールバック: ${optimizationInfo}検出、Chrome Storageから完全データを取得`);
                                    try {
                                        const storedConfig = await readMonitoringConfigFromChromeStorage();
                                        if (storedConfig) {
                                            resolvedData = logMultipleMonitoringResolution(
                                                'loadSettings 最終フォールバック完全データ',
                                                storedConfig
                                            );
                                            loadMultipleModeCommonSettings(storedConfig);
                                        }
                                    } catch (error) {
                                        console.warn('⚠️ フォールバック: Chrome Storage完全データ取得エラー:', error);
                                        // サマリーからサンプルデータを使用
                                        resolvedData = resolveMultipleMonitoringCollections({
                                            multiple_configs: finalResponse.multiple_configs_summary?.sample || []
                                        });
                                    }
                                }

                                logMultipleMonitoringResolution('loadSettings 最終フォールバック解決結果', {
                                    multiple_configs: resolvedData.multipleConfigs
                                });
                                loadMultipleModeCommonSettings(finalResponse);

                                console.log('📊 フォールバックgetStatus成功:', resolvedData.selectedTargets.length, '件');

                                if (resolvedData.selectedTargets.length > 0) {
                                    await loadMultipleModeSettings(resolvedData.selectedTargets);
                                    return;
                                } else {
                                    console.warn('⚠️ フォールバックgetStatusから有効なデータが取得できませんでした');
                                    console.log('🔍 フォールバック問題の詳細分析:', {
                                        responseKeys: Object.keys(finalResponse || {}),
                                        multipleConfigsExists: !!finalResponse?.multiple_configs,
                                        multipleConfigsValue: finalResponse?.multiple_configs
                                    });

                                    // データソース統一: MonitoringConfigManagerを強制使用
                                    console.log('🔄 データソース統一: MonitoringConfigManagerからデータを直接取得します');

                                    try {
                                        // MonitoringConfigManagerから直接データを取得
                                        const unifiedResponse = await new Promise((resolve) => {
                                            chrome.runtime.sendMessage({
                                                action: 'loadConfig'
                                            }, resolve);
                                        });

                                        if (unifiedResponse && unifiedResponse.success) {
                                            const unifiedConfigs = unifiedResponse.config?.multiple_configs || [];
                                            loadMultipleModeCommonSettings(unifiedResponse.config);
                                            console.log('✅ MonitoringConfigManagerから統一データ取得成功:', {
                                                multipleConfigsCount: unifiedConfigs.length,
                                                configIds: unifiedConfigs.map(c => c.id)
                                            });

                                            if (unifiedConfigs.length > 0) {
                                                await loadMultipleModeSettings(unifiedConfigs);
                                                return;
                                            }
                                        }
                                    } catch (error) {
                                        console.warn('⚠️ MonitoringConfigManagerからの統一データ取得でエラー:', error);
                                    }
                                }
                            }
                        } catch (error) {
                            console.warn('⚠️ フォールバックgetStatusでエラー:', error);
                        }

            // 最終フォールバック: 元のデータで読み込み
            const resolvedData = logMultipleMonitoringResolution('loadSettings 最終config解決', config);
            loadMultipleModeCommonSettings(config);
            await loadMultipleModeSettings(resolvedData.selectedTargets);
            console.log('✅ 複数モード設定読み込み完了');
        }

        console.log('✅ loadSettings完了');
        return true;

    } catch (error) {
        console.error('❌ loadSettings エラー:', error);
        // エラー時はデフォルト設定
        updateModeUI(DEFAULT_POPUP_MODE);
        return false;
    }
}

// loadSettingsのUI更新をスキップする版（モード切り替え時用）
async function loadSettingsWithoutUIUpdate() {
    try {
        console.log('🔄 [DEBUG] loadSettingsWithoutUIUpdate開始 - UIモード更新をスキップ');

        if (!configManager) {
            console.error('✅ configManager未初期化');
            return false;
        }

        // 設定読み込み（monitoringConfigManagerを優先使用）
        let config = null;

        try {
            // まず、3段階フォールバックで最新の設定を取得
            console.log('🔄 refreshMultipleModeStatus: 最新設定取得開始');
            const statusResponse = normalizeGetStatusResponse(await getStatusWithFallback());

            if (statusResponse && statusResponse.success) {
                console.log('✅ monitoringConfigManagerから設定取得成功:', statusResponse);
                console.log('🔍 初期設定読み込み時の詳細:', {
                    multipleConfigs: statusResponse.multiple_configs,
                    multipleConfigsLength: statusResponse.multiple_configs?.length || 0
                });

                config = buildPopupConfigFromStatus(statusResponse);

                console.log('📊 初期設定構築完了:', {
                    mode: config.mode,
                    multipleConfigsLength: config.multiple_configs?.length || 0
                });
            } else {
                console.warn('⚠️ monitoringConfigManagerからの取得失敗、configManagerを使用');
                config = await configManager.loadConfig();
            }
        } catch (error) {
            console.warn('⚠️ monitoringConfigManagerからの取得でエラー、configManagerを使用:', error);
            config = await configManager.loadConfig();
        }

        if (!config) {
            console.warn('⚠️ 設定読み込み失敗 - デフォルト設定使用');
            return false;
        }

        config = unwrapConfigFromManager(config) || config;

        console.log('✅ 設定読み込み成功:', config);

        // モードUIの更新はスキップ（既にユーザーが選択した状態を維持）
        const mode = config.mode || DEFAULT_POPUP_MODE;
        console.log('🚨 [DEBUG] モードUI更新スキップ - 設定ファイルのモード:', mode);
        renderTestModeState(config);

        // 単一モード設定の反映は実行
        if ((mode === 'single' || mode === 'test') && config.single_config) {
            const singleConfig = config.single_config;
            loadSingleModeSettings(singleConfig);
            console.log('✅ 単一モード設定反映完了');
        } else if (mode === 'multiple') {
            // 複数モード設定の読み込み
            console.log('🔄 複数モード設定読み込み開始', {
                configMultipleConfigs: config.multiple_configs,
                isArray: Array.isArray(config.multiple_configs),
                length: Array.isArray(config.multiple_configs) ? config.multiple_configs.length : 'N/A'
            });

            loadMultipleModeCommonSettings(config);
            const resolvedData = logMultipleMonitoringResolution(
                'loadSettingsWithoutUIUpdate 解決結果',
                config
            );
            await loadMultipleModeSettings(resolvedData.selectedTargets);
            console.log('✅ 複数モード設定読み込み完了');
        }

        console.log('✅ loadSettingsWithoutUIUpdate完了');
        return true;

    } catch (error) {
        console.error('✅ loadSettingsWithoutUIUpdate エラー:', error);
        return false;
    }
}

// Phase 2: イベントリスナー設定機能（モード選択ボタンのみ）- 削除済み（重複回避）
// 旧 setupModeEventListeners() は setupEventListeners() 内で処理されるため削除
// function setupModeEventListeners() { ... } - REMOVED

// 手動テスト用の設定項目を追加
const manualTestSettings = `
<div class="setting-group">
    <h4>🔧 手動テスト用設定（initialKeywordDetection=falseの場合）</h4>
    <div class="setting-item">
        <label for="reloadWaitAfterReload">リロード後の待機時間（秒）:</label>
        <input type="number" id="reloadWaitAfterReload" min="1" max="30" value="3">
        <span class="help-text">ページリロード後、キーワードチェックまでの待機時間</span>
    </div>
</div>
`;

// 手動テスト用設定の表示/非表示を切り替える関数
function toggleManualTestSettings() {
    const manualTestSettings = document.getElementById('manualTestSettings');
    const initialKeywordDetection = document.getElementById('initialKeywordDetection');

    if (manualTestSettings && initialKeywordDetection) {
        if (initialKeywordDetection.checked) {
            // 初期検知が有効な場合は手動テスト用設定を非表示
            manualTestSettings.style.display = 'none';
        } else {
            // 初期検知が無効な場合は手動テスト用設定を表示
            manualTestSettings.style.display = 'block';
        }
    }
}

// 複数監視用手動テスト設定の表示/非表示を切り替える関数
function toggleMultiManualTestSettings() {
    const multiManualTestSettings = document.getElementById('multiManualTestSettings');
    const multiInitialKeywordDetection = document.getElementById('multiInitialKeywordDetection');

    if (multiManualTestSettings && multiInitialKeywordDetection) {
        if (multiInitialKeywordDetection.checked) {
            // 初期検知が有効な場合は手動テスト用設定を非表示
            multiManualTestSettings.style.display = 'none';
        } else {
            // 初期検知が無効な場合は手動テスト用設定を表示
            multiManualTestSettings.style.display = 'block';
        }
    }
}

// 初期検知チェックボックスのイベントリスナーを設定
function setupManualTestSettingsToggle() {
    const initialKeywordDetection = document.getElementById('initialKeywordDetection');
    if (initialKeywordDetection) {
        initialKeywordDetection.addEventListener('change', toggleManualTestSettings);
        // 初期状態を設定
        toggleManualTestSettings();
    }
}

// 複数監視用初期検知チェックボックスのイベントリスナーを設定
function setupMultiManualTestSettingsToggle() {
    const multiInitialKeywordDetection = document.getElementById('multiInitialKeywordDetection');
    if (multiInitialKeywordDetection) {
        multiInitialKeywordDetection.addEventListener('change', toggleMultiManualTestSettings);
        // 初期状態を設定
        toggleMultiManualTestSettings();
    }
}

// =================================
// Excel Export/Import 機能
// =================================

/**
 * Excel エクスポート機能
 */
async function exportToExcel() {
    if (!elements.excelProgress) return;

    try {
        // 進捗表示開始
        elements.excelProgress.style.display = 'block';
        elements.excelProgress.textContent = 'Excelファイル生成中...';

        // バックグラウンドスクリプトにエクスポート要求
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'exportMonitoringSettings',
                format: 'xlsx'
            }, resolve);
        });

        if (response.success) {
            elements.excelProgress.textContent = 'ダウンロード準備中...';

            try {
                if (response.download_method === 'blob_url') {
                    // 通常環境: Blob URL方式でのダウンロード
                    const link = document.createElement('a');
                    link.href = response.blob_url;
                    link.download = response.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Blob URLを解放
                    URL.revokeObjectURL(response.blob_url);

                    const message = response.message || `Excelファイルをダウンロードしました: ${response.filename}`;
                    showMessage(message, 'success');
                    console.log('Excel エクスポート成功（Blob URL方式）:', response.filename, 'Format:', response.format);

                } else if (response.download_method === 'chrome_downloads_api') {
                    // Service Worker環境: Chrome Downloads API方式
                    let message = response.message || `Excelファイルのダウンロードを開始しました: ${response.filename}`;

                    // ダウンロード方法に応じた追加情報
                    if (response.note) {
                        message += `\n\n${response.note}`;
                    }

                    showMessage(message, 'success');
                    console.log('Excel エクスポート成功（Chrome Downloads API方式）:', response.filename, 'Format:', response.format, 'Download ID:', response.download_id);

                    // ダウンロード完了後の追加情報
                    setTimeout(() => {
                        showMessage('💡 ダウンロードフォルダを確認してください。ファイルが見つからない場合は、Chromeのダウンロード履歴も確認してください。', 'info');
                    }, 3000);

                } else if (response.download_method === 'chrome_downloads_api_fallback') {
                    // フォールバック方式: 保存場所選択ダイアログ
                    let message = response.message || `Excelファイルのダウンロードを開始しました: ${response.filename}`;

                    if (response.note) {
                        message += `\n\n${response.note}`;
                    }

                    showMessage(message, 'success');
                    console.log('Excel エクスポート成功（フォールバック方式）:', response.filename, 'Format:', response.format, 'Download ID:', response.download_id);

                    // 保存場所選択の案内
                    setTimeout(() => {
                        showMessage('💾 保存場所を選択してください。ダイアログが表示されていない場合は、Chromeの設定を確認してください。', 'info');
                    }, 2000);
                } else {
                    // フォールバック: データを直接処理
                    console.log('フォールバックデータ処理:', response);
                    showMessage(`Excelファイル生成完了: ${response.filename}`, 'success');
                }

                elements.excelProgress.textContent = '完了！';
                setTimeout(() => {
                    elements.excelProgress.style.display = 'none';
                }, 2000);

            } catch (downloadError) {
                console.error('ダウンロード処理エラー:', downloadError);
                throw new Error(`ダウンロード処理に失敗: ${downloadError.message}`);
            }

        } else {
            throw new Error(response.error || 'エクスポートに失敗しました');
        }

    } catch (error) {
        console.error('Excel エクスポートエラー:', error);
        elements.excelProgress.style.display = 'none';

        let errorMessage = 'Excelファイルの出力に失敗しました';
        if (error.message.includes('E001')) {
            errorMessage = '監視設定データが見つかりません。複数監視モードで監視対象を追加してください。';
        } else if (error.message.includes('E002')) {
            errorMessage = 'Excelファイル生成に失敗しました。しばらく待ってから再試行してください。';
        } else if (error.message.includes('SheetJSライブラリの読み込みに失敗しました')) {
            errorMessage = 'Excel処理ライブラリの読み込みに失敗しました。ネットワーク接続を確認してください。';
        }

        showMessage(errorMessage, 'error');
    }
}

/**
 * 選択済みファイルの取込処理
 */
async function importSelectedFile(file) {
    if (!file || !elements.excelProgress) return;

    try {
        // 進捗表示開始
        elements.excelProgress.style.display = 'block';
        elements.excelProgress.textContent = 'ファイル読み込み中...';

        // ファイルをArrayBufferとして読み込み
        const arrayBuffer = await readFileAsArrayBuffer(file);

        // ファイルサイズチェック
        if (arrayBuffer.byteLength === 0) {
            throw new Error('ファイルが空です。ファイルを確認してください。');
        }

        console.log('📁 ファイル読み込み完了:', {
            filename: file.name,
            size: file.size,
            arrayBufferSize: arrayBuffer.byteLength,
            type: file.type
        });

        elements.excelProgress.textContent = 'データ検証中...';

        // ArrayBufferをUint8Arrayに変換して送信
        const uint8Array = new Uint8Array(arrayBuffer);
        console.log('🔄 データ変換完了:', {
            uint8ArrayLength: uint8Array.length,
            sampleData: uint8Array.slice(0, 10)
        });

        // フォールバック版かどうかを確認
        let response;
        if (configManager && configManager.importFromExcel) {
            console.log('🔄 フォールバック版ConfigManagerでExcel取込実行');
            try {
                response = await configManager.importFromExcel(uint8Array);
                console.log('✅ フォールバック版Excel取込完了:', response);
            } catch (error) {
                console.error('❌ フォールバック版Excel取込エラー:', error);
                response = { success: false, error: error.message };
            }
        } else {
            // 通常版ConfigManagerを使用
            console.log('🔄 通常版ConfigManagerでExcel取込実行');
            response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'importMonitoringSettings',
                    file_data: Array.from(uint8Array), // 配列に変換して送信
                    filename: file.name,
                    options: {
                        overwrite: false,  // 既存データを保持
                        validate_only: false
                    }
                }, (response) => {
                    console.log('📥 インポート応答受信:', response);
                    resolve(response);
                });
            });
        }

        console.log('✅ インポート要求完了:', response);

        if (response.success) {
            elements.excelProgress.textContent = '設定取り込み中...';

            // フォールバック版での取込成功時の処理
            if (response.importedCount) {
                console.log('🔄 フォールバック版取込データを監視対象として追加開始');

                // 取込されたデータを監視対象として追加
                for (const item of response.data) {
                    try {
                        const addResult = await configManager.addMonitoringTarget(item);
                        if (addResult.success) {
                            console.log('✅ 監視対象追加成功:', item.name);
                        } else {
                            console.warn('⚠️ 監視対象追加失敗:', item.name, addResult.error);
                        }
                    } catch (error) {
                        console.error('❌ 監視対象追加エラー:', item.name, error);
                    }
                }

                console.log('✅ フォールバック版取込データの監視対象追加完了');
            }

            // インポート完了
            elements.excelProgress.textContent = '完了！';
            setTimeout(() => {
                elements.excelProgress.style.display = 'none';
            }, 2000);

            // 結果メッセージ作成
            let message;
            if (response.importedCount) {
                message = `${response.importedCount}件の監視設定をインポートしました`;
            } else if (response.imported_count) {
                message = `${response.imported_count}件の監視設定をインポートしました`;
            } else {
                message = '監視設定をインポートしました';
            }

            if (response.warnings && response.warnings.length > 0) {
                message += `\n警告: ${response.warnings.slice(0, 3).join(', ')}`;
                if (response.warnings.length > 3) {
                    message += ` ほか${response.warnings.length - 3}件`;
                }
            }

            if (response.multipleSchedule?.enabled) {
                message += `\n定時監視: 毎日 ${response.multipleSchedule.scheduleTime} に ${response.multipleSchedule.targetCount}件を予約しました`;
            } else if (response.multipleSchedule?.scheduleEnabled && response.multipleSchedule.reason) {
                message += `\n定時監視: ${response.multipleSchedule.reason}`;
            }

            showMessage(message, 'success');
            console.log('Excel インポート成功:', response);

            // 複数監視リストを更新
            if (getCurrentMode() === 'multiple') {
                console.log('🔄 複数監視リスト更新開始');
                try {
                    // フォールバック版の場合は設定を再読み込み
                    if (configManager && configManager.importFromExcel) {
                        console.log('🔄 フォールバック版 - 設定再読み込みでUI更新');
                        await loadSettings();
                    } else {
                        console.log('🔄 通常版 - 設定再読み込みで複数監視リスト更新');
                        await loadSettings();
                    }
                    console.log('✅ 複数監視リスト更新完了');
                } catch (error) {
                    console.warn('⚠️ 複数監視リスト更新でエラー:', error);
                    // エラーが発生しても基本的な更新は実行
                    try {
                        await loadSettings();
                    } catch (fallbackError) {
                        console.error('❌ フォールバック更新も失敗:', fallbackError);
                    }
                }
            }

        } else {
            throw new Error(response.errors ? response.errors.join(', ') : 'インポートに失敗しました');
        }

    } catch (error) {
        console.error('Excel インポートエラー:', error);
        elements.excelProgress.style.display = 'none';

        let errorMessage = 'Excelファイルの取り込みに失敗しました';
        if (error.message.includes('I000')) {
            errorMessage = 'ファイルが空です。ファイルサイズを確認してください。';
        } else if (error.message.includes('I001')) {
            errorMessage = 'ファイル形式が正しくありません。Excel形式（.xlsx, .xls）のファイルを選択してください。';
        } else if (error.message.includes('I002')) {
            errorMessage = '必須項目が不足しています。監視名、URL、有効状態の列が必要です。';
        } else if (error.message.includes('I003')) {
            errorMessage = 'データ形式エラーが発生しました。各項目の形式を確認してください。';
        }

        showMessage(errorMessage, 'error');

    }
}

/**
 * Excel/CSVファイル選択ダイアログを表示する
 * クリックイベント内で同期的に native file input を起動する。
 */
function selectExcelFile() {
    console.log('🔄 Excel取込: ファイル選択ダイアログを起動');
    if (elements.excelFileInput) {
        elements.excelFileInput.click();
    } else {
        console.error('❌ Excel取込: excelFileInput要素が見つかりません');
        showMessage('ファイル選択の初期化に失敗しました', 'error');
    }
}

/**
 * native file inputでのファイル選択後の処理
 */
async function handleFileSelect(event) {
    const file = event.target.files[0];

    try {
        if (!file) return;
        await importSelectedFile(file);
    } finally {
        // 同じファイルを続けて選べるようにする
        event.target.value = '';
    }
}

/**
 * ファイルをArrayBufferとして読み込み
 */
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Excel機能のイベントリスナー設定
 */
function setupExcelEventListeners() {
    // Excel Export ボタン
    if (elements.exportExcelBtn) {
        elements.exportExcelBtn.addEventListener('click', exportToExcel);
        console.log('✅ Excel Export ボタンイベント設定完了');
    }

    // クリックイベント内で同期的に native file input を起動
    if (elements.importExcelBtn) {
        elements.importExcelBtn.addEventListener('click', selectExcelFile);
        console.log('✅ Excel Import ボタンイベント設定完了');
    }

    // ファイル選択イベント
    if (elements.excelFileInput) {
        elements.excelFileInput.addEventListener('change', handleFileSelect);
        console.log('✅ Excel ファイル選択イベント設定完了');
    }
}

// 監視対象の削除（統合・改良版）
async function removeMonitor(targetId) {
    console.log('🎯 removeMonitor関数実行開始:', targetId);

    if (!confirm('この監視対象を削除してもよろしいですか？\n削除後は復元できません。')) {
        console.log('❌ 削除がキャンセルされました');
        return;
    }

    try {
        console.log('🔄 削除処理開始:', targetId);

        // Chrome拡張のメッセージAPIを使って背景処理に削除要求を送信
        const deleteResponse = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('削除処理がタイムアウトしました'));
            }, 10000); // 10秒タイムアウト

            chrome.runtime.sendMessage({
                action: 'removeMonitoringTarget',
                targetId: targetId
            }, (response) => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });

        console.log('📊 削除処理結果:', deleteResponse);

        if (deleteResponse && deleteResponse.success) {
            console.log('✅ 監視対象削除成功:', targetId);
            showMessage('監視対象を削除しました', 'success');

            // UI更新: 現在の設定を再読み込み
            const currentModeButton = document.querySelector('button[data-mode].active');
            const isMultipleMode = currentModeButton && currentModeButton.dataset.mode === 'multiple';

            if (isMultipleMode) {
                console.log('🔄 複数モード - 監視リスト再読み込み開始');
                // 最新の設定を取得してリストを更新
                const latestConfig = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: 'loadConfig' }, resolve);
                });

                if (latestConfig && latestConfig.success && latestConfig.config) {
                    const multipleConfigs = latestConfig.config.multiple_configs || [];
                    console.log('📊 削除後の監視対象数:', multipleConfigs.length);
                    await loadMultipleModeSettings(multipleConfigs);
                } else {
                    console.log('⚠️ 設定取得失敗 - 空のリストで更新');
                    await loadMultipleModeSettings([]);
                }
                console.log('✅ 複数モード - 監視リスト更新完了');
            } else {
                console.log('🔄 単一モード - 全設定再読み込み');
                await loadSettings();
            }

        } else {
            const errorMsg = deleteResponse?.error || '削除処理に失敗しました';
            console.error('❌ 監視対象削除失敗:', errorMsg);
            showMessage(errorMsg, 'error');
        }

    } catch (error) {
        console.error('❌ 監視対象削除エラー:', error);
        showMessage('削除処理中にエラーが発生しました: ' + error.message, 'error');
    }
}

// windowオブジェクトに関数を登録（グローバルアクセス用）
window.removeMonitor = removeMonitor;
