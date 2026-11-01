/**
 * MonitoringConfigManager
 * 監視設定の管理とモード切り替えを担当するクラス
 *
 * 機能:
 * - 単一/複数監視モードの管理
 * - 設定の保存・読み込み・バージョン管理
 * - 既存設定の自動移行
 */

// MonitoringConfigManager専用ログ関数（background.jsのloggerに依存）
const mcmLogger = {
    error: (message, ...args) => {
        if (typeof logger !== 'undefined' && logger.error) {
            logger.error(`[MCM] ${message}`, ...args);
        } else {
            globalThis.console.error(`[MCM] ${message}`, ...args);
        }
    },
    warn: (message, ...args) => {
        if (typeof logger !== 'undefined' && logger.warn) {
            logger.warn(`[MCM] ${message}`, ...args);
        } else {
            globalThis.console.warn(`[MCM] ${message}`, ...args);
        }
    },
    info: (message, ...args) => {
        if (typeof logger !== 'undefined' && logger.info) {
            logger.info(`[MCM] ${message}`, ...args);
        } else {
            globalThis.console.log(`[MCM] ${message}`, ...args);
        }
    },
    debug: (message, ...args) => {
        if (typeof logger !== 'undefined' && logger.debug) {
            logger.debug(`[MCM] ${message}`, ...args);
        } else {
            globalThis.console.log(`[MCM] ${message}`, ...args);
        }
    }
};

// 既存の詳細ログを Service Worker のログレベル設定へ通すための互換層。
// 個別の成功イベントは下で mcmLogger.info に明示し、残る console.log は詳細ログとして DEBUG に扱う。
const console = Object.freeze({
    log: (message, ...args) => mcmLogger.debug(message, ...args),
    warn: (message, ...args) => mcmLogger.warn(message, ...args),
    error: (message, ...args) => mcmLogger.error(message, ...args)
});

class MonitoringConfigManager {
    constructor() {
        this.storageKey = 'monitoring_config';
        // 🚀 簡素化: currentVersionとdefaultConfigのversionを削除
        this.defaultConfig = {
            mode: 'single',
            single_config: {
                url: '',
                settings: this.getDefaultSettings()
            },
            single_scheduled_watch: this.getDefaultSingleScheduledWatch(),
            single_keyword_schedule: {
                enabled: false,
                startTime: '11:57'
            },
            multiple_configs: [],
            multiple_list_watch_configs: [],
            multiple_list_watch_common_settings: {
                openProductUrl: false,
                notifyExternalExtension: false,
                externalExtensionId: '',
                downloadAiSupportFile: false
            }
        };
    }

    /**
     * デフォルト監視設定を取得
     */
    getDefaultSettings() {
        return {
            monitoringMode: 'high_frequency',
            captureMode: 'reload',
            interval: 20,
            stopCondition: 'manual',
            duration: 60,
            stopCount: 10,
            downloadSource: true,
            downloadSourceWithoutFooter: false,
            downloadScreenshot: true,
            monitorSelector: '',
            monitorKeyword: '',
            detectMode: 'appear',
            initialKeywordDetection: false  // 監視開始時の即座検知 (デフォルト: false)
        };
    }

    getDefaultSingleScheduledWatch() {
        return {
            url: '',
            monitorSelector: '',
            siteId: '',
            profileId: '',
            enabled: false,
            startTime: '11:57',
            endTime: '12:05',
            intervalSeconds: 30,
            immediateDurationMinutes: 3,
            openDetectedUrl: false,
            notifyExternalExtension: false,
            externalExtensionId: '',
            discordChannelId: ''
        };
    }

    upgradeSingleScheduledWatch(singleScheduledWatch = {}) {
        return Object.assign(
            {},
            this.getDefaultSingleScheduledWatch(),
            singleScheduledWatch || {}
        );
    }

    migrateSingleScheduledWatchConfig(config) {
        const nextConfig = { ...(config || {}) };
        const legacyScheduledKeys = [
            'scheduleEnabled', 'scheduleTime', 'scheduleWindowStart',
            'scheduleWindowEnd', 'scheduleReloadIntervalSec', 'openDetectedUrl',
            'notifyExternalExtension', 'externalExtensionId', 'discordChannelId'
        ];
        const singleConfig = nextConfig.single_config || { url: '', settings: {} };
        const legacySettings = { ...(singleConfig.settings || {}) };

        if (nextConfig.single_scheduled_watch) {
            const currentScheduledWatch = nextConfig.single_scheduled_watch;
            const defaultScheduledWatch = this.getDefaultSingleScheduledWatch();
            const hasLegacyScheduledSettings = legacyScheduledKeys.some((key) =>
                Object.prototype.hasOwnProperty.call(legacySettings, key)
            );
            // JSON.stringify の項目順ではなく、実際に不足している設定だけを補う。
            // これにより、移行済み設定を状態取得するたびに保存しない。
            const hasMissingScheduledWatchField = Object.keys(defaultScheduledWatch)
                // 即時監視時間とDiscordチャンネルIDは UI 保存時に補完する。
                // 状態取得だけで既存設定を書き換えない。
                .filter((key) => !['immediateDurationMinutes', 'discordChannelId'].includes(key))
                .some((key) =>
                !Object.prototype.hasOwnProperty.call(currentScheduledWatch, key)
                );
            if (!hasMissingScheduledWatchField && !hasLegacyScheduledSettings) {
                return { config: nextConfig, migrated: false };
            }

            if (hasMissingScheduledWatchField) {
                nextConfig.single_scheduled_watch = this.upgradeSingleScheduledWatch(currentScheduledWatch);
            }
            if (hasLegacyScheduledSettings) {
                legacyScheduledKeys.forEach((key) => delete legacySettings[key]);
                nextConfig.single_config = { ...singleConfig, settings: legacySettings };
            }
            return { config: nextConfig, migrated: true };
        }

        const hasLegacyScheduledSettings = legacyScheduledKeys.some((key) =>
            Object.prototype.hasOwnProperty.call(legacySettings, key)
        );

        if (!hasLegacyScheduledSettings) {
            return { config: nextConfig, migrated: false };
        }

        const singleScheduledWatch = this.upgradeSingleScheduledWatch({
            // Aの商品ページ情報からBの検索結果ページ情報は推測できない。
            // Bは対象URLと商品取得セレクタを明示設定するまで有効化しない。
            url: '',
            monitorSelector: '',
            enabled: false,
            startTime: legacySettings.scheduleWindowStart || legacySettings.scheduleTime || '11:57',
            endTime: legacySettings.scheduleWindowEnd || '12:05',
            intervalSeconds: legacySettings.scheduleReloadIntervalSec || 30,
            openDetectedUrl: legacySettings.openDetectedUrl === true,
            notifyExternalExtension: legacySettings.notifyExternalExtension === true,
            externalExtensionId: legacySettings.externalExtensionId || '',
            discordChannelId: legacySettings.discordChannelId || ''
        });

        legacyScheduledKeys.forEach((key) => delete legacySettings[key]);

        nextConfig.single_config = { ...singleConfig, settings: legacySettings };
        nextConfig.single_scheduled_watch = singleScheduledWatch;
        return { config: nextConfig, migrated: true };
    }

    /**
     * 設定を読み込み、必要に応じて移行処理を実行
     * @returns {Promise<Object>} 監視設定
     */
    async loadConfig() {
        try {
            const result = await chrome.storage.local.get([this.storageKey, 'monitoringConfig']);
            const storedConfig = result[this.storageKey] || result.monitoringConfig;

            if (!storedConfig) {
                mcmLogger.debug('設定が見つかりません。デフォルト設定を使用します。');
                return this.defaultConfig;
            }

            // 🚀 簡素化: バージョン管理を完全に削除
            // 保存された設定をそのまま使用（バージョンチェックなし）
            const migrated = this.migrateSingleScheduledWatchConfig(storedConfig);
            if (migrated.migrated) {
                migrated.config.last_updated = new Date().toISOString();
                await this.saveConfig(migrated.config);
                mcmLogger.info('[MCM] B 定時監視設定を single_scheduled_watch へ移行しました');
            }
            mcmLogger.debug('設定を正常に読み込みました');
            return migrated.config;

        } catch (error) {
            mcmLogger.error('設定読み込みエラー:', error);
            return this.defaultConfig;
        }
    }

    /**
     * 設定を保存
     * @param {Object} config 監視設定
     */
    async saveConfig(config) {
        try {
            // 🚀 簡素化: バージョン情報の設定を削除
            // 設定データをそのまま保存（バージョン情報なし）
            // 🔧 統合: 単一キー 'monitoring_config' のみに保存

            const normalized = this.migrateSingleScheduledWatchConfig(config).config;
            await chrome.storage.local.set({
                [this.storageKey]: normalized
            });

            mcmLogger.debug('設定を保存しました');
            return true;
        } catch (error) {
            mcmLogger.error('設定保存エラー:', error);
            return false;
        }
    }

    /**
     * 監視モードを変更
     * @param {string} newMode 新しいモード ('single' | 'multiple')
     * @returns {Promise<boolean>} 成功時はtrue
     */
    async changeMode(newMode) {
        try {
            const config = await this.migrateLegacyMultipleTargetsToConfigs();
            const oldMode = config.mode;
            const beforeSnapshot = {
                mode: oldMode,
                singleConfigUrl: config?.single_config?.url || '',
                multipleConfigsLength: Array.isArray(config?.multiple_configs)
                    ? config.multiple_configs.length
                    : 0
            };

            if (oldMode === newMode) {
                mcmLogger.info('changeMode: 既に指定されたモードです', {
                    requestedMode: newMode,
                    ...beforeSnapshot
                });
                return true;
            }

            mcmLogger.info('changeMode: モード切替前', {
                requestedMode: newMode,
                ...beforeSnapshot
            });

            config.mode = newMode;

            const success = await this.saveConfig(config);
            if (success) {
                mcmLogger.info('changeMode: モード切替後', {
                    previousMode: oldMode,
                    nextMode: newMode,
                    singleConfigUrl: config?.single_config?.url || '',
                    multipleConfigsLength: Array.isArray(config?.multiple_configs)
                        ? config.multiple_configs.length
                        : 0
                });
            } else {
                mcmLogger.warn('changeMode: 保存失敗', {
                    previousMode: oldMode,
                    nextMode: newMode,
                    singleConfigUrl: config?.single_config?.url || '',
                    multipleConfigsLength: Array.isArray(config?.multiple_configs)
                        ? config.multiple_configs.length
                        : 0
                });
            }
            return success;

        } catch (error) {
            mcmLogger.error('モード変更エラー:', error);
            return false;
        }
    }

    /**
     * 複数監視設定に新しい監視対象を追加
     * @param {Object} monitoringTarget 監視対象設定
     * @returns {Promise<string|null>} 追加された設定のID、失敗時はnull
     */
    async addMonitoringTarget(monitoringTarget) {
        try {
            const config = await this.migrateLegacyMultipleTargetsToConfigs();
            if (!Array.isArray(config.multiple_configs)) {
                config.multiple_configs = [];
            }

            const newTarget = {
                id: this.generateId(),
                name: monitoringTarget.name || this.extractSiteName(monitoringTarget.url),
                url: monitoringTarget.url,
                selector: monitoringTarget.selector || monitoringTarget.settings?.monitorSelector || '',
                keyword: monitoringTarget.keyword || monitoringTarget.settings?.monitorKeyword || '',
                detection_mode: monitoringTarget.detection_mode || monitoringTarget.settings?.detectMode || 'appear',
                settings: Object.assign({}, this.getDefaultSettings(), monitoringTarget.settings),
                enabled: monitoringTarget.enabled !== undefined ? monitoringTarget.enabled : true
            };

            // selectorとkeywordの整合性を確保
            if (newTarget.selector) {
                newTarget.settings.monitorSelector = newTarget.selector;
            }
            if (newTarget.keyword) {
                newTarget.settings.monitorKeyword = newTarget.keyword;
            }
            if (newTarget.detection_mode) {
                newTarget.settings.detectMode = newTarget.detection_mode;
            }

            config.multiple_configs.push(newTarget);

            const success = await this.saveConfig(config);
            if (success) {
                mcmLogger.info('監視対象を追加しました:', newTarget);
                return newTarget.id;
            }
            return null;

        } catch (error) {
            console.error('監視対象追加エラー:', error);
            return null;
        }
    }

    /**
     * 複数監視設定から監視対象を削除
     * @param {string} targetId 削除する監視対象のID
     * @returns {Promise<boolean>} 成功時はtrue
     */
    async removeMonitoringTarget(targetId) {
        try {
            console.log('🔄 monitoringConfigManager削除処理開始:', targetId);

            const config = await this.migrateLegacyMultipleTargetsToConfigs();
            const multipleConfigs = Array.isArray(config.multiple_configs) ? config.multiple_configs : [];
            const initialLength = multipleConfigs.length;

            console.log('🔍 削除前の状態:', {
                targetId,
                initialLength,
                availableIds: multipleConfigs.map(t => t.id)
            });

            // 削除対象の情報を保存
            const targetToRemove = multipleConfigs.find(target => target.id === targetId);

            if (!targetToRemove) {
                console.log('❌ 削除対象が見つかりませんでした:', targetId);
                console.log('🔍 利用可能なID一覧:', multipleConfigs.map(t => t.id));
                return {
                    success: false,
                    error: '削除対象が見つかりません'
                };
            }

            console.log('✅ 削除対象発見:', {
                id: targetToRemove.id,
                name: targetToRemove.name
            });

            // multiple_configsから削除
            config.multiple_configs = multipleConfigs.filter(target => target.id !== targetId);

            if (config.multiple_configs.length < initialLength) {
                const success = await this.saveConfig(config);
                if (success) {
                    mcmLogger.info('監視対象を削除しました:', targetId);

                    // 内部状態を更新
                    this.currentConfig = config;
                    console.log('🔍 削除後の内部状態更新:', {
                        multipleConfigsLength: this.currentConfig.multiple_configs.length,
                        multipleConfigsIds: this.currentConfig.multiple_configs.map(t => t.id)
                    });

                    // 状態の整合性を確認
                    const verifyConfig = await this.loadConfig();
                    console.log('🔍 削除後の整合性確認:', {
                        savedMultipleConfigsLength: verifyConfig.multiple_configs.length,
                        expectedMultipleConfigsLength: config.multiple_configs.length,
                        savedMultipleConfigsIds: verifyConfig.multiple_configs.map(t => t.id),
                        expectedMultipleConfigsIds: config.multiple_configs.map(t => t.id)
                    });

                    return {
                        success: true,
                        removedTarget: targetToRemove,
                        message: '監視対象が正常に削除されました'
                    };
                } else {
                    return {
                        success: false,
                        error: '設定の保存に失敗しました'
                    };
                }
            } else {
                return {
                    success: false,
                    error: '削除処理が完了しませんでした'
                };
            }

        } catch (error) {
            console.error('監視対象削除エラー:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 複数監視設定の監視対象を更新
     * @param {string} targetId 更新する監視対象のID
     * @param {Object} updates 更新内容
     * @returns {Promise<boolean>} 成功時はtrue
     */
    async updateMonitoringTarget(targetId, updates) {
        try {
            const config = await this.migrateLegacyMultipleTargetsToConfigs();
            const multipleConfigs = Array.isArray(config.multiple_configs) ? config.multiple_configs : [];
            const targetIndex = multipleConfigs.findIndex(target => target.id === targetId);

            if (targetIndex === -1) {
                console.log('更新対象が見つかりませんでした:', targetId);
                return false;
            }

            // 更新前のデータを保存（デバッグ用）
            const target = multipleConfigs[targetIndex];
            const beforeUpdate = {
                detection_mode: target.detection_mode,
                keyword: target.keyword,
                selector: target.selector,
                settingsDetectMode: target.settings?.detectMode,
                settingsKeyword: target.settings?.monitorKeyword,
                settingsSelector: target.settings?.monitorSelector
            };

            console.log('🔄 更新処理開始:', {
                targetId: targetId,
                beforeUpdate: beforeUpdate,
                updates: updates
            });

            const applyUpdatesToTarget = (targetToUpdate) => {
                if (!targetToUpdate) {
                    return;
                }

                if (updates.name !== undefined) targetToUpdate.name = updates.name;
                if (updates.url !== undefined) targetToUpdate.url = updates.url;
                if (updates.enabled !== undefined) targetToUpdate.enabled = updates.enabled;

                if (updates.detection_mode !== undefined) {
                    targetToUpdate.detection_mode = updates.detection_mode;
                    console.log('📝 detection_mode更新:', updates.detection_mode);
                }
                if (updates.keyword !== undefined) {
                    targetToUpdate.keyword = updates.keyword;
                    console.log('📝 keyword更新:', updates.keyword);
                }
                if (updates.selector !== undefined) {
                    targetToUpdate.selector = updates.selector;
                    console.log('📝 selector更新:', updates.selector);
                }

                if (updates.settings !== undefined) {
                    targetToUpdate.settings = Object.assign({}, targetToUpdate.settings, updates.settings);
                    console.log('📝 settings更新:', updates.settings);
                }
            };

            applyUpdatesToTarget(multipleConfigs[targetIndex]);

            // 🚨 更新後の整合性チェック＋強制同期
            const inconsistencies = [];
            const reconcileTargetConsistency = (targetToReconcile) => {
                if (!targetToReconcile) {
                    return;
                }

                if (targetToReconcile.detection_mode && targetToReconcile.settings?.detectMode) {
                    if (targetToReconcile.detection_mode !== targetToReconcile.settings.detectMode) {
                        inconsistencies.push({
                            field: 'detection_mode',
                            topLevel: targetToReconcile.detection_mode,
                            settings: targetToReconcile.settings.detectMode
                        });
                        targetToReconcile.settings.detectMode = targetToReconcile.detection_mode;
                        console.log('🔧 整合性修正: settings.detectMode =', targetToReconcile.detection_mode);
                    }
                }

                if (targetToReconcile.keyword && targetToReconcile.settings?.monitorKeyword) {
                    if (targetToReconcile.keyword !== targetToReconcile.settings.monitorKeyword) {
                        inconsistencies.push({
                            field: 'keyword',
                            topLevel: targetToReconcile.keyword,
                            settings: targetToReconcile.settings.monitorKeyword
                        });
                        targetToReconcile.settings.monitorKeyword = targetToReconcile.keyword;
                        console.log('🔧 整合性修正: settings.monitorKeyword =', targetToReconcile.keyword);
                    }
                }

                if (targetToReconcile.selector && targetToReconcile.settings?.monitorSelector) {
                    if (targetToReconcile.selector !== targetToReconcile.settings.monitorSelector) {
                        inconsistencies.push({
                            field: 'selector',
                            topLevel: targetToReconcile.selector,
                            settings: targetToReconcile.settings.monitorSelector
                        });
                        targetToReconcile.settings.monitorSelector = targetToReconcile.selector;
                        console.log('🔧 整合性修正: settings.monitorSelector =', targetToReconcile.selector);
                    }
                }
            };

            reconcileTargetConsistency(multipleConfigs[targetIndex]);

            if (inconsistencies.length > 0) {
                console.warn('⚠️ 更新後の不整合を検出・修正:', inconsistencies);
            } else {
                console.log('✅ 更新後の整合性確認OK');
            }

            const success = await this.saveConfig(config);
            if (success) {
                // 更新後のデータを確認
                const afterUpdate = {
                    detection_mode: target.detection_mode,
                    keyword: target.keyword,
                    selector: target.selector,
                    settingsDetectMode: target.settings?.detectMode,
                    settingsKeyword: target.settings?.monitorKeyword,
                    settingsSelector: target.settings?.monitorSelector
                };

                mcmLogger.info('✅ 監視対象を更新しました:', {
                    id: targetId,
                    beforeUpdate: beforeUpdate,
                    afterUpdate: afterUpdate,
                    inconsistenciesFixed: inconsistencies.length
                });

                // 最終整合性検証
                const finalConsistency = {
                    detection: target.detection_mode === target.settings?.detectMode,
                    keyword: target.keyword === target.settings?.monitorKeyword,
                    selector: target.selector === target.settings?.monitorSelector
                };

                if (finalConsistency.detection && finalConsistency.keyword && finalConsistency.selector) {
                    console.log('🎉 最終整合性検証：完全一致');
                } else {
                    console.error('❌ 最終整合性検証：不一致', finalConsistency);
                }
            }
            return success;

        } catch (error) {
            console.error('監視対象更新エラー:', error);
            return false;
        }
    }

    /**
     * URLからサイト名を抽出
     * @param {string} url URL
     * @returns {string} サイト名
     */
    extractSiteName(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace(/^www\./, '').split('.')[0];
        } catch (error) {
            console.warn('URL解析エラー:', error);
            return 'サイト';
        }
    }

    /**
     * ユニークIDを生成
     * @returns {string} ID
     */
    generateId() {
        return 'monitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 移行バックアップを作成
     * @param {Object} config バックアップする設定
     * @param {string} migrationId 移行ID
     */
    async createMigrationBackup(config, migrationId) {
        try {
            const backupKey = `migration_backup_${migrationId}`;
            const backupData = {
                originalConfig: config,
                backupTime: new Date().toISOString(),
                migrationId: migrationId
            };

            await chrome.storage.local.set({ [backupKey]: backupData });
            console.log(`移行バックアップを作成しました: ${backupKey}`);
        } catch (error) {
            console.warn('バックアップ作成に失敗しました:', error);
        }
    }

    /**
     * バックアップから復元
     * @param {string} migrationId 移行ID
     * @returns {Promise<Object|null>} 復元された設定、失敗時はnull
     */
    async restoreFromBackup(migrationId) {
        try {
            const backupKey = `migration_backup_${migrationId}`;
            const result = await chrome.storage.local.get([backupKey]);
            const backupData = result[backupKey];

            if (backupData && backupData.originalConfig) {
                console.log('バックアップから設定を復元しました:', backupData.originalConfig);
                return backupData.originalConfig;
            }
            return null;
        } catch (error) {
            console.error('バックアップからの復元に失敗しました:', error);
            return null;
        }
    }

    /**
     * Storage キーの移行処理
     * 旧キー 'monitoringConfig' から新キー 'monitoring_config' へ移行
     * @returns {Promise<Object>} 移行結果
     */
    async migrateStorageKey() {
        try {
            const result = await chrome.storage.local.get(['monitoring_config', 'monitoringConfig']);

            // デバッグ: 現在の Storage 状態を確認
            console.log('[MCM] Storage キー移行チェック - 現在の状態:', {
                hasMonitoringConfig: !!result.monitoringConfig,
                hasMonitoring_config: !!result.monitoring_config,
                monitoringConfigKeys: result.monitoringConfig ? Object.keys(result.monitoringConfig) : [],
                monitoring_configKeys: result.monitoring_config ? Object.keys(result.monitoring_config) : []
            });

            // 新キーのみ存在する場合は正常状態
            if (!result.monitoringConfig && result.monitoring_config) {
                console.log('[MCM] Storage キー移行: 既に移行済み（monitoring_config のみ存在）');
                return { migrated: false, reason: 'already_migrated_new_key_only' };
            }

            // 両方のキーが未保存なら移行不要
            if (!result.monitoringConfig && !result.monitoring_config) {
                console.log('[MCM] Storage キー移行: 設定未保存のため移行不要');
                return { migrated: false, reason: 'no_keys' };
            }

            // 新キーが存在せず、旧キーのみ存在する場合 → 移行実行
            if (!result.monitoring_config && result.monitoringConfig) {
                // バックアップ作成
                const migrationId = `storage_key_${Date.now()}`;
                await this.createMigrationBackup(result.monitoringConfig, migrationId);

                // 新キーに保存
                await chrome.storage.local.set({
                    'monitoring_config': result.monitoringConfig
                });

                // 旧キーを削除
                await chrome.storage.local.remove('monitoringConfig');

                console.log(`[MCM] Storage キー移行完了: monitoringConfig → monitoring_config (backup: ${migrationId})`);
                return { migrated: true, from: 'monitoringConfig', to: 'monitoring_config', backupId: migrationId };
            }

            // 両方のキーが存在する場合 → 旧キーを削除（新キーを優先）
            if (result.monitoring_config && result.monitoringConfig) {
                await chrome.storage.local.remove('monitoringConfig');
                console.log('[MCM] Storage キー移行: 重複キー monitoringConfig を削除');
                return { migrated: true, removed: 'monitoringConfig' };
            }

            console.log('[MCM] Storage キー移行: 既に移行済み');
            return { migrated: false, reason: 'already_migrated' };
        } catch (error) {
            console.error('[MCM] Storage キー移行エラー:', error);
            return { migrated: false, error: error.message };
        }
    }

    /**
     * popup 由来のレガシー storage（ドラフト・フラットキー）を monitoring_config へ統合
     * @returns {Promise<Object>} 移行結果
     */
    async migrateLegacyPopupStorage() {
        const flatKeys = [
            'downloadSource', 'downloadSourceWithoutFooter', 'downloadScreenshot',
            'monitorType', 'targetUrl', 'monitorSelector', 'monitorKeyword',
            'detectMode', 'initialKeywordDetection', 'scheduleEnabled', 'scheduleTime',
            'openDetectedUrl', 'notifyExternalExtension', 'externalExtensionId', 'discordChannelId',
            'scheduleWindowStart', 'scheduleWindowEnd', 'scheduleReloadIntervalSec',
            'interval', 'duration', 'stopCondition', 'customInterval', 'customDuration',
            'stopCustomDuration', 'stopCount'
        ];
        const keysToRead = [...flatKeys, 'monitoringSettingsDraft', this.storageKey];

        try {
            const result = await chrome.storage.local.get(keysToRead);
            const draft = result.monitoringSettingsDraft;
            const flat = {};
            let hasFlat = false;

            for (const key of flatKeys) {
                if (result[key] !== undefined) {
                    flat[key] = result[key];
                    hasFlat = true;
                }
            }

            if (!draft && !hasFlat) {
                return { migrated: false, reason: 'no_legacy_popup_keys' };
            }

            const source = { ...flat, ...(draft || {}) };
            const keysToRemove = ['monitoringSettingsDraft', ...flatKeys];

            let config = result[this.storageKey];
            if (!config) {
                config = await this.loadConfig();
            }

            if (config.mode !== 'single') {
                await chrome.storage.local.remove(keysToRemove);
                mcmLogger.info('[MCM] popup レガシー storage を削除（単一モード以外）');
                return { migrated: false, reason: 'not_single_mode', removedLegacy: true };
            }

            config = { ...config };
            config.single_config = this.upgradeSingleConfig(
                config.single_config || { url: '', settings: {} }
            );
            const singleConfig = config.single_config;
            const settings = singleConfig.settings;

            const isEmpty = (value) =>
                value === undefined || value === null || value === '';

            if (isEmpty(singleConfig.url)) {
                if (source.monitorType === 'url' && source.targetUrl) {
                    singleConfig.url = source.targetUrl;
                } else if (source.targetUrl) {
                    singleConfig.url = source.targetUrl;
                }
            }

            const settingFields = [
                'downloadSource', 'downloadSourceWithoutFooter', 'downloadScreenshot',
                'monitorSelector', 'monitorKeyword', 'detectMode', 'initialKeywordDetection',
                'interval', 'duration', 'stopCondition', 'stopCount',
                'stopCustomDuration'
            ];

            for (const field of settingFields) {
                if (source[field] === undefined) continue;
                if (isEmpty(settings[field])) {
                    settings[field] = source[field];
                }
            }

            if (!config.single_scheduled_watch) {
                config.single_scheduled_watch = this.upgradeSingleScheduledWatch({
                    // 旧単一監視の対象は商品ページであり、Bの検索結果ページとして推測転用しない。
                    url: '',
                    monitorSelector: '',
                    enabled: false,
                    startTime: source.scheduleWindowStart || source.scheduleTime || '11:57',
                    endTime: source.scheduleWindowEnd || '12:05',
                    intervalSeconds: source.scheduleReloadIntervalSec || 30,
                    openDetectedUrl: source.openDetectedUrl === true,
                    notifyExternalExtension: source.notifyExternalExtension === true,
                    externalExtensionId: source.externalExtensionId || '',
                    discordChannelId: source.discordChannelId || ''
                });
            }

            config.last_updated = new Date().toISOString();
            await this.saveConfig(config);
            await chrome.storage.local.remove(keysToRemove);

            mcmLogger.info('[MCM] popup レガシー storage を monitoring_config に統合しました');
            return { migrated: true, removed: keysToRemove };
        } catch (error) {
            console.error('[MCM] popup レガシー storage 移行エラー:', error);
            return { migrated: false, error: error.message };
        }
    }

    /**
     * 単一設定のアップグレード
     * @param {Object} singleConfig 単一設定
     * @returns {Object} アップグレード後の単一設定
     */
    upgradeSingleConfig(singleConfig) {
        const upgraded = Object.assign({}, singleConfig);

        // 設定にデフォルト値がない項目を補完
        if (!upgraded.settings) {
            upgraded.settings = this.getDefaultSettings();
        } else {
            upgraded.settings = Object.assign({}, this.getDefaultSettings(), upgraded.settings);
        }

        return upgraded;
    }

    /**
     * 複数設定のアップグレード
     * @param {Array} multipleConfigs 複数設定配列
     * @returns {Array} アップグレード後の複数設定配列
     */
    upgradeMultipleConfigs(multipleConfigs) {
        return multipleConfigs.map(config => {
            const upgraded = Object.assign({}, config);

            // IDがない場合は生成
            if (!upgraded.id) {
                upgraded.id = this.generateId();
            }

            // 名前がない場合はURLから生成
            if (!upgraded.name && upgraded.url) {
                upgraded.name = this.extractSiteName(upgraded.url);
            }

            // enabledがない場合はtrueに設定
            if (upgraded.enabled === undefined) {
                upgraded.enabled = true;
            }

            // 設定にデフォルト値がない項目を補完
            if (!upgraded.settings) {
                upgraded.settings = this.getDefaultSettings();
            } else {
                upgraded.settings = Object.assign({}, this.getDefaultSettings(), upgraded.settings);
            }

            return upgraded;
        });
    }

    /**
     * 設定のバリデーション
     * @param {Object} config 設定オブジェクト
     * @returns {Object} バリデーション結果
     */
    validateConfig(config) {
        const errors = [];
        const warnings = [];

        // 基本構造の確認
        if (!config || typeof config !== 'object') {
            errors.push('設定オブジェクトが無効です');
            return { isValid: false, errors, warnings };
        }

        // 🚀 簡素化: バージョンチェックは削除済み

        // モードの確認
        if (!config.mode || !['single', 'multiple', 'test'].includes(config.mode)) {
            errors.push('無効な監視モードです（single / multiple / test のいずれかが必要）');
        }

        // 単一モード設定の確認
        if (config.mode === 'single' || config.mode === 'test') {
            if (!config.single_config) {
                errors.push('単一モードでは single_config が必要です');
            } else {
                // URLの検証：アクティブタブ監視の場合（空文字列）はスキップ
                if (config.single_config.url && config.single_config.url !== '' && typeof config.single_config.url !== 'string') {
                    errors.push('単一モードでは有効なURLが必要です');
                }
                // URL監視の場合は有効なURLが必須
                if (config.single_config.settings && config.single_config.settings.monitorType === 'url') {
                    if (!config.single_config.url || config.single_config.url.trim() === '') {
                        errors.push('URL監視モードでは有効なURLが必要です');
                    }
                }
                if (!config.single_config.settings) {
                    warnings.push('単一モードの設定が不足しています');
                }
            }
        }

        // 複数モード設定の確認
        if (config.mode === 'multiple') {
            if (!Array.isArray(config.multiple_configs)) {
                errors.push('複数モードでは multiple_configs 配列が必要です');
            } else {
                if (config.multiple_configs.length === 0) {
                    warnings.push('複数モードで監視対象が設定されていません');
                }

                config.multiple_configs.forEach((target, index) => {
                    if (!target.url || typeof target.url !== 'string') {
                        errors.push(`監視対象${index + 1}: 有効なURLが必要です`);
                    }
                    if (!target.id) {
                        errors.push(`監視対象${index + 1}: IDが必要です`);
                    }
                    if (!target.name) {
                        warnings.push(`監視対象${index + 1}: 名前が設定されていません`);
                    }
                    if (target.enabled === undefined) {
                        warnings.push(`監視対象${index + 1}: enabled状態が未定義です`);
                    }
                    if (!target.settings) {
                        warnings.push(`監視対象${index + 1}: 監視設定が不足しています`);
                    }
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    /**
     * 移行バックアップのクリーンアップ（古いバックアップを削除）
     * @param {number} maxAgeHours 保持する最大時間（デフォルト: 72時間）
     */
    async cleanupMigrationBackups(maxAgeHours = 72) {
        try {
            const allStorage = await chrome.storage.local.get(null);
            const backupKeys = Object.keys(allStorage).filter(key => key.startsWith('migration_backup_'));
            const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
            const keysToRemove = [];

            for (const key of backupKeys) {
                const backupData = allStorage[key];
                if (backupData && backupData.backupTime) {
                    const backupTime = new Date(backupData.backupTime);
                    if (backupTime < cutoffTime) {
                        keysToRemove.push(key);
                    }
                }
            }

            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                console.log(`古い移行バックアップを削除しました: ${keysToRemove.length}件`);
            } else {
                mcmLogger.debug('削除対象の古いバックアップはありません');
            }

        } catch (error) {
            console.error('バックアップクリーンアップエラー:', error);
        }
    }

    /**
     * 移行履歴の取得
     * @returns {Promise<Array>} 移行履歴
     */
    async getMigrationHistory() {
        try {
            const config = await this.migrateLegacyMultipleTargetsToConfigs();
            return config.migrationHistory || [];
        } catch (error) {
            console.error('移行履歴取得エラー:', error);
            return [];
        }
    }

    /**
     * 設定システムのヘルスチェック
     * @returns {Promise<Object>} ヘルスチェック結果
     */
    async healthCheck() {
        const startTime = Date.now();
        const health = {
            status: 'healthy',
            // 🚀 簡素化: バージョン管理は削除済み
            checks: [],
            performance: {
                configLoadTime: null,
                storageAccessible: false
            },
            timestamp: new Date().toISOString()
        };

        try {
            // 1. Chrome Storageアクセスチェック
            const storageStart = Date.now();
            await chrome.storage.local.get(['healthCheck']);
            health.performance.storageAccessible = true;
            health.checks.push({ name: 'chrome_storage', status: 'pass', message: 'Chrome Storageアクセス可能' });

            // 2. 設定読み込みチェック
            const config = await this.migrateLegacyMultipleTargetsToConfigs();
            health.performance.configLoadTime = Date.now() - storageStart;
            health.checks.push({ name: 'config_load', status: 'pass', message: '設定読み込み成功' });

            // 3. 設定バリデーションチェック
            const validation = this.validateConfig(config);
            if (validation.isValid) {
                health.checks.push({ name: 'config_validation', status: 'pass', message: '設定バリデーション成功' });
            } else {
                health.status = 'warning';
                health.checks.push({
                    name: 'config_validation',
                    status: 'warning',
                    message: `設定に問題あり: ${validation.errors.join(', ')}`
                });
            }

            // 4. バージョンチェック（簡素化: バージョン管理は削除済み）
            health.checks.push({ name: 'version_check', status: 'pass', message: 'バージョン管理は簡素化済み' });

        } catch (error) {
            health.status = 'error';
            health.checks.push({
                name: 'health_check',
                status: 'error',
                message: `ヘルスチェックエラー: ${error.message}`
            });
        }

        health.performance.totalTime = Date.now() - startTime;
        return health;
    }

    /**
     * 既存データの detection_mode フィールド統一処理
     * Phase 3: データ構造統一 - 既存データのdetection_modeフィールド追加・更新
     */
    /**
     * 既存データの detection_mode フィールド統一処理
     * Phase 3: データ構造統一 - 既存データのdetection_modeフィールド追加・更新
     * Phase 6: 既存データの修正 - keyword/selectorフィールドの統一処理も含む
     */
    async unifyDataStructure() {
        try {
            console.log('🔄 データ構造統一処理開始 - 不整合検出・強制修正モード');

            const config = await this.migrateLegacyMultipleTargetsToConfigs();
            let updated = false;
            let processedCount = 0;
            let addedDetectionModeCount = 0;
            let syncedSettingsCount = 0;
            let addedKeywordCount = 0;
            let addedSelectorCount = 0;
            let inconsistencyFixedCount = 0;

            // multiple_configs の処理
            if (config.multiple_configs && Array.isArray(config.multiple_configs)) {
                console.log('📊 multiple_configs処理開始:', config.multiple_configs.length, '件');

                for (let i = 0; i < config.multiple_configs.length; i++) {
                    const target = config.multiple_configs[i];
                    let targetUpdated = false;

                    console.log(`🔍 処理中[${i + 1}/${config.multiple_configs.length}]:`, {
                        id: target.id,
                        name: target.name,
                        hasDetectionMode: !!target.detection_mode,
                        hasSettingsDetectMode: !!target.settings?.detectMode,
                        hasKeyword: !!target.keyword,
                        hasSelector: !!target.selector,
                        hasSettingsKeyword: !!target.settings?.monitorKeyword,
                        hasSettingsSelector: !!target.settings?.monitorSelector,
                        detectionModeValue: target.detection_mode,
                        settingsDetectModeValue: target.settings?.detectMode
                    });

                    // settings オブジェクトが存在しない場合は作成
                    if (!target.settings) {
                        target.settings = {};
                        targetUpdated = true;
                        console.log('⚙️ settings オブジェクトを作成しました');
                    }

                    // 🚨 不整合検出・修正処理: detection_mode
                    const topLevelDetection = target.detection_mode;
                    const settingsDetection = target.settings.detectMode;

                    console.log('🔬 不整合検査 - detection_mode:', {
                        topLevel: topLevelDetection,
                        settings: settingsDetection,
                        isConsistent: topLevelDetection === settingsDetection
                    });

                    let finalDetectionMode = 'appear'; // デフォルト値

                    if (topLevelDetection && settingsDetection) {
                        // 両方存在する場合、不整合があれば最新の更新時刻を基準に決定
                        // ここでは、より確実なトップレベルの値を優先
                        if (topLevelDetection !== settingsDetection) {
                            console.warn('⚠️ 不整合発見! トップレベル値を優先:', {
                                keeping: topLevelDetection,
                                discarding: settingsDetection
                            });
                            finalDetectionMode = topLevelDetection;
                            inconsistencyFixedCount++;
                        } else {
                            finalDetectionMode = topLevelDetection;
                        }
                    } else if (topLevelDetection) {
                        finalDetectionMode = topLevelDetection;
                        console.log('✅ 既存のdetection_mode使用:', finalDetectionMode);
                    } else if (settingsDetection) {
                        finalDetectionMode = settingsDetection;
                        console.log('✅ settings.detectMode使用:', finalDetectionMode);
                    } else {
                        console.log('⚠️ 両方とも未設定 - デフォルト値使用:', finalDetectionMode);
                    }

                    // トップレベル detection_mode の設定・更新
                    if (!target.detection_mode || target.detection_mode !== finalDetectionMode) {
                        const wasEmpty = !target.detection_mode;
                        target.detection_mode = finalDetectionMode;
                        if (wasEmpty) {
                            addedDetectionModeCount++;
                            console.log('🆕 detection_mode フィールド追加:', finalDetectionMode);
                        } else {
                            console.log('🔄 detection_mode フィールド修正:', finalDetectionMode);
                        }
                        targetUpdated = true;
                    }

                    // settings.detectMode の設定・更新
                    if (target.settings.detectMode !== finalDetectionMode) {
                        target.settings.detectMode = finalDetectionMode;
                        syncedSettingsCount++;
                        targetUpdated = true;
                        console.log('🔄 settings.detectMode 同期:', finalDetectionMode);
                    }

                    // 🚨 不整合検出・修正処理: keyword
                    const topLevelKeyword = target.keyword;
                    const settingsKeyword = target.settings.monitorKeyword;

                    let finalKeyword = '';
                    if (topLevelKeyword && settingsKeyword) {
                        if (topLevelKeyword !== settingsKeyword) {
                            console.warn('⚠️ keyword不整合発見! トップレベル値を優先:', {
                                keeping: topLevelKeyword,
                                discarding: settingsKeyword
                            });
                            finalKeyword = topLevelKeyword;
                            inconsistencyFixedCount++;
                        } else {
                            finalKeyword = topLevelKeyword;
                        }
                    } else if (topLevelKeyword) {
                        finalKeyword = topLevelKeyword;
                        console.log('✅ 既存のkeyword使用:', finalKeyword);
                    } else if (settingsKeyword) {
                        finalKeyword = settingsKeyword;
                        console.log('✅ settings.monitorKeyword使用:', finalKeyword);
                    }

                    // トップレベル keyword の設定・更新
                    if (!target.keyword && finalKeyword) {
                        target.keyword = finalKeyword;
                        addedKeywordCount++;
                        targetUpdated = true;
                        console.log('🆕 keyword フィールド追加:', finalKeyword);
                    } else if (target.keyword !== finalKeyword && finalKeyword) {
                        target.keyword = finalKeyword;
                        targetUpdated = true;
                        console.log('🔄 keyword フィールド同期:', finalKeyword);
                    }

                    // settings.monitorKeyword の同期
                    if (target.settings.monitorKeyword !== finalKeyword && finalKeyword) {
                        target.settings.monitorKeyword = finalKeyword;
                        targetUpdated = true;
                        console.log('🔄 settings.monitorKeyword 同期:', finalKeyword);
                    }

                    // 🚨 不整合検出・修正処理: selector
                    const topLevelSelector = target.selector;
                    const settingsSelector = target.settings.monitorSelector;

                    let finalSelector = 'body';
                    if (topLevelSelector && settingsSelector) {
                        if (topLevelSelector !== settingsSelector) {
                            console.warn('⚠️ selector不整合発見! トップレベル値を優先:', {
                                keeping: topLevelSelector,
                                discarding: settingsSelector
                            });
                            finalSelector = topLevelSelector;
                            inconsistencyFixedCount++;
                        } else {
                            finalSelector = topLevelSelector;
                        }
                    } else if (topLevelSelector) {
                        finalSelector = topLevelSelector;
                        console.log('✅ 既存のselector使用:', finalSelector);
                    } else if (settingsSelector) {
                        finalSelector = settingsSelector;
                        console.log('✅ settings.monitorSelector使用:', finalSelector);
                    }

                    // トップレベル selector の設定・更新
                    if (!target.selector && finalSelector && finalSelector !== 'body') {
                        target.selector = finalSelector;
                        addedSelectorCount++;
                        targetUpdated = true;
                        console.log('🆕 selector フィールド追加:', finalSelector);
                    } else if (target.selector !== finalSelector && finalSelector !== 'body') {
                        target.selector = finalSelector;
                        targetUpdated = true;
                        console.log('🔄 selector フィールド同期:', finalSelector);
                    }

                    // settings.monitorSelector の同期
                    if (target.settings.monitorSelector !== finalSelector && finalSelector !== 'body') {
                        target.settings.monitorSelector = finalSelector;
                        targetUpdated = true;
                        console.log('🔄 settings.monitorSelector 同期:', finalSelector);
                    }

                    // データの整合性確認
                    const detectionIntegrity = target.detection_mode === target.settings.detectMode;
                    const keywordIntegrity = target.keyword === target.settings.monitorKeyword;
                    const selectorIntegrity = target.selector === target.settings.monitorSelector;

                    if (detectionIntegrity && keywordIntegrity && selectorIntegrity) {
                        console.log('✅ 全フィールド整合性確認OK:', {
                            detection_mode: target.detection_mode,
                            keyword: target.keyword,
                            selector: target.selector
                        });
                    } else {
                        console.error('❌ 最終整合性チェック失敗:', {
                            detection: { top: target.detection_mode, settings: target.settings.detectMode, match: detectionIntegrity },
                            keyword: { top: target.keyword, settings: target.settings.monitorKeyword, match: keywordIntegrity },
                            selector: { top: target.selector, settings: target.settings.monitorSelector, match: selectorIntegrity }
                        });

                        // 強制修正
                        if (!detectionIntegrity) {
                            target.settings.detectMode = target.detection_mode;
                            targetUpdated = true;
                            console.log('🔧 強制修正: settings.detectMode =', target.detection_mode);
                        }
                        if (!keywordIntegrity) {
                            target.settings.monitorKeyword = target.keyword;
                            targetUpdated = true;
                            console.log('🔧 強制修正: settings.monitorKeyword =', target.keyword);
                        }
                        if (!selectorIntegrity) {
                            target.settings.monitorSelector = target.selector;
                            targetUpdated = true;
                            console.log('🔧 強制修正: settings.monitorSelector =', target.selector);
                        }
                    }

                    if (targetUpdated) {
                        processedCount++;
                        updated = true;
                    }
                }
            }

            // 設定を保存
            if (updated) {
                console.log('💾 統一されたデータを保存中...');
                const saveSuccess = await this.saveConfig(config);

                if (saveSuccess) {
                    mcmLogger.info('✅ データ構造統一処理完了:', {
                        totalProcessed: processedCount,
                        detectionModeAdded: addedDetectionModeCount,
                        settingsSynced: syncedSettingsCount,
                        keywordAdded: addedKeywordCount,
                        selectorAdded: addedSelectorCount,
                        inconsistencyFixed: inconsistencyFixedCount,
                        configSaved: true
                    });

                    return {
                        success: true,
                        processed: processedCount,
                        detectionModeAdded: addedDetectionModeCount,
                        settingsSynced: syncedSettingsCount,
                        keywordAdded: addedKeywordCount,
                        selectorAdded: addedSelectorCount,
                        inconsistencyFixed: inconsistencyFixedCount,
                        message: 'データ構造統一・不整合修正が正常に完了しました'
                    };
                } else {
                    throw new Error('設定保存に失敗しました');
                }
            } else {
                mcmLogger.info('✅ データ構造統一処理完了 - 更新不要:', {
                    reason: '全てのデータが既に統一されています'
                });

                return {
                    success: true,
                    processed: 0,
                    detectionModeAdded: 0,
                    settingsSynced: 0,
                    keywordAdded: 0,
                    selectorAdded: 0,
                    inconsistencyFixed: 0,
                    message: '全てのデータが既に統一されています'
                };
            }

        } catch (error) {
            console.error('❌ データ構造統一処理エラー:', error);
            return {
                success: false,
                error: error.message,
                message: 'データ構造統一処理でエラーが発生しました'
            };
        }
    }

    /**
     * 設定システムの初期化（アプリケーション起動時に実行）
     * @returns {Promise<boolean>} 初期化成功時はtrue
     */
    async initialize() {
        mcmLogger.debug('MonitoringConfigManager の初期化を開始...');

        try {
            // 0. Storage キー移行（旧キー → 新キー）
            const migrationResult = await this.migrateStorageKey();
            if (migrationResult.migrated) {
                mcmLogger.info('Storage キー移行結果:', migrationResult);
            }

            const popupMigrationResult = await this.migrateLegacyPopupStorage();
            if (popupMigrationResult.migrated) {
                mcmLogger.info('popup レガシー storage 移行結果:', popupMigrationResult);
            }

            // 旧互換配列を正本へ一度だけ移行する
            await this.migrateLegacyMultipleTargetsToConfigs();

            // 1. ヘルスチェック実行
            const health = await this.healthCheck();
            mcmLogger.debug('ヘルスチェック結果:', health);

            // 2. 設定読み込み（必要に応じて移行実行）
            const config = await this.loadConfig();
            mcmLogger.debug('現在の設定:', config);

            // 3. 古いバックアップのクリーンアップ
            await this.cleanupMigrationBackups();

            mcmLogger.debug('MonitoringConfigManager の初期化が完了しました');
            return true;

        } catch (error) {
            console.error('MonitoringConfigManager の初期化に失敗しました:', error);
            return false;
        }
    }

    /**
     * 監視設定の現在の状態を取得
     * @returns {Promise<Object>} 監視設定状態
     */
    async getStatus() {
        try {
            const config = await this.migrateLegacyMultipleTargetsToConfigs();
            mcmLogger.debug('🔍 getStatus - 現在の設定:', config);

            // デバッグ: 正本データの詳細確認
            mcmLogger.debug('🔍 getStatus - データソースの詳細確認:', {
                multipleConfigsExists: !!config.multiple_configs,
                multipleConfigsLength: config.multiple_configs ? config.multiple_configs.length : 0
            });

            return {
                success: true,
                mode: config.mode || 'single',
                multiple_configs: config.multiple_configs || [],
                multiple_common_settings: config.multiple_common_settings || {},
                single_config_backup: config.single_config_backup || null,
                multiple_configs_backup: config.multiple_configs_backup || null,
                multiple_test_scenario_state: config.multiple_test_scenario_state || null,
                single_config: config.single_config || {},
                single_scheduled_watch: config.single_scheduled_watch || this.getDefaultSingleScheduledWatch(),
                single_keyword_schedule: config.single_keyword_schedule || {
                    enabled: false,
                    startTime: '11:57'
                },
                // 🚀 簡素化: バージョン管理は削除済み
                last_updated: config.last_updated || new Date().toISOString(),
                targets_count: config.mode === 'multiple'
                    ? (config.multiple_configs || []).length // multiple_configsのみ使用
                    : (config.single_config?.monitoring_targets || []).length
            };
        } catch (error) {
            console.error('❌ getStatusエラー:', error);
            return {
                success: false,
                error: error.message,
                mode: 'single',
                multiple_configs: [],
                multiple_common_settings: {},
                single_config_backup: null,
                multiple_configs_backup: null,
                multiple_test_scenario_state: null,
                single_config: {},
                single_scheduled_watch: this.getDefaultSingleScheduledWatch(),
                single_keyword_schedule: {
                    enabled: false,
                    startTime: '11:57'
                },
                // 🚀 簡素化: バージョン管理は削除済み
                last_updated: new Date().toISOString(),
                targets_count: 0
            };
        }
    }

    /**
     * 監視設定をExcel形式でエクスポート
     * @param {string} format ファイル形式 ('xlsx' | 'xls' | 'csv')
     * @returns {Promise<{success: boolean, blob?: Blob, filename?: string, error?: string}>}
     */
    async exportToExcel(format = 'xlsx') {
        try {
            const config = await this.migrateLegacyMultipleTargetsToConfigs();

            // 監視設定データが存在しない場合
            if (!config.multiple_configs || config.multiple_configs.length === 0) {
                throw new Error('E001: 監視設定データが見つかりません');
            }

            // SheetJSライブラリを動的に読み込み
            if (typeof XLSX === 'undefined') {
                await this.loadSheetJSLibrary();
            }

            // Excel用データの変換
            const excelData = this.convertConfigsToExcelData(config.multiple_configs);

            // ワークブック作成
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            // 日本語ヘッダーの設定
            const headers = [
                'ID', '監視名', 'URL', '有効状態', '監視キーワード',
                'セレクター', '検知モード', '監視間隔(秒)', '監視時間(分)',
                '停止条件', 'ダウンロード形式', '初期検知', '通知設定',
                '作成日時', '更新日時'
            ];

            XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
            XLSX.utils.book_append_sheet(workbook, worksheet, '監視対象リスト');

            // 強制的にCSV形式で出力（確実に動作するため）
            let actualFormat = 'csv';
            console.log('✅ 確実に動作するCSV形式で出力します');

            // ファイル名生成（タイムスタンプ付き）- 強制的にCSV拡張子
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `監視設定リスト_${timestamp}.csv`;

            console.log('🔧 ファイル名生成確認:', { actualFormat, filename, timestamp });

            // Blob生成（強制的にCSV形式）
            const wbout = XLSX.write(workbook, { bookType: 'csv', type: 'array' });
            const blob = new Blob([wbout], {
                type: 'text/csv; charset=utf-8'
            });

            console.log('🔧 Blob生成確認:', {
                bookType: 'csv',
                blobSize: blob.size,
                blobType: blob.type,
                wboutLength: wbout.length
            });

            mcmLogger.info('Excel エクスポート成功:', { filename, recordCount: excelData.length, actualFormat });
            return {
                success: true,
                blob: blob,
                filename: filename,
                format: actualFormat,
                message: 'CSV形式で出力しました（Excelで開けます）'
            };

        } catch (error) {
            console.error('Excel エクスポートエラー:', error);
            return {
                success: false,
                error: error.message.startsWith('E001') ? error.message : 'E002: Excelファイル生成に失敗しました'
            };
        }
    }

    /**
     * Excelファイルから監視設定をインポート
     * @param {File} file Excelファイル
     * @param {Object} options インポートオプション
     * @returns {Promise<{success: boolean, imported_count?: number, errors?: Array, warnings?: Array}>}
     */
    async importFromExcel(file, options = {}) {
        try {
            const { overwrite = false, validate_only = false } = options;

            // ファイル形式チェック
            if (!this.isValidExcelFile(file)) {
                throw new Error('I001: ファイル形式が正しくありません');
            }

            // SheetJSライブラリを動的に読み込み
            if (typeof XLSX === 'undefined') {
                await this.loadSheetJSLibrary();
            }

            // ファイル読み込み
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            // 最初のワークシートを取得
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                throw new Error('I002: インポート可能なデータが見つかりません');
            }

            // データ検証
            const validationResult = this.validateImportData(jsonData);
            if (!validationResult.isValid) {
                throw new Error(`I003: ${validationResult.errors.join(', ')}`);
            }

            // 検証のみの場合
            if (validate_only) {
                return {
                    success: true,
                    imported_count: validationResult.validRecords.length,
                    errors: validationResult.errors,
                    warnings: validationResult.warnings
                };
            }

            // 実際のインポート処理
            const config = await this.migrateLegacyMultipleTargetsToConfigs();
            const importResult = await this.processImportData(
                validationResult.validRecords,
                config,
                overwrite
            );

            mcmLogger.info('Excel インポート成功:', importResult);
            return importResult;

        } catch (error) {
            console.error('Excel インポートエラー:', error);
            return {
                success: false,
                errors: [error.message],
                warnings: []
            };
        }
    }

    /**
     * 旧互換配列 multiple_targets を唯一の正本 multiple_configs へ移行する。
     * multiple_configs が存在する場合は常にそちらを優先し、移行後は旧配列を削除する。
     * @returns {Promise<Object>} 正本化後の監視設定
     */
    async migrateLegacyMultipleTargetsToConfigs() {
        const config = await this.loadConfig();
        if (!Object.prototype.hasOwnProperty.call(config, 'multiple_targets')) {
            return config;
        }

        const legacyTargets = Array.isArray(config.multiple_targets)
            ? config.multiple_targets
            : [];
        const canonicalConfigs = Array.isArray(config.multiple_configs)
            ? config.multiple_configs
            : [];

        if (canonicalConfigs.length === 0 && legacyTargets.length > 0) {
            config.multiple_configs = legacyTargets;
            mcmLogger.info('multiple_targets を multiple_configs へ移行しました', {
                count: legacyTargets.length
            });
        } else if (!Array.isArray(config.multiple_configs)) {
            config.multiple_configs = canonicalConfigs;
        }

        delete config.multiple_targets;
        const saved = await this.saveConfig(config);
        if (!saved) {
            throw new Error('旧監視設定の移行保存に失敗しました');
        }

        return config;
    }

    /**
     * 監視設定データをExcel用データに変換
     * @param {Array} configs 監視設定配列
     * @returns {Array} Excel用データ配列
     */
    convertConfigsToExcelData(configs) {
        return configs.map(config => ({
            'ID': config.id || '',
            '監視名': config.name || '',
            'URL': config.url || '',
            '有効状態': config.enabled ? '有効' : '無効',
            '監視キーワード': config.settings?.monitorKeyword || '',
            'セレクター': config.settings?.monitorSelector || '',
            '検知モード': this.getDetectModeLabel(config.settings?.detectMode),
            '監視間隔(秒)': config.settings?.interval || 30,
            '監視時間(分)': config.settings?.duration || 60,
            '停止条件': this.getStopConditionLabel(config.settings?.stopCondition),
            'ダウンロード形式': this.getDownloadFormatsString(config.settings),
            '初期検知': config.settings?.initialKeywordDetection ? '有効' : '無効',
            '通知設定': config.settings?.notifications !== false ? '有効' : '無効',
            '作成日時': config.created_at || '',
            '更新日時': config.updated_at || new Date().toISOString()
        }));
    }

    /**
     * SheetJSライブラリを動的に読み込み（Service Worker対応・CSP順守）
     * - eval/new Function を使用しない
     * - importScripts のみを使用し、失敗時は最小限実装にフォールバック
     */
    async loadSheetJSLibrary() {
        try {
            if (typeof XLSX !== 'undefined') {
                console.log('✅ SheetJSライブラリは既に読み込まれています');
                return;
            }

            console.log('🔄 SheetJSライブラリ読み込み開始...');

            if (typeof importScripts !== 'undefined') {
                // 相対パス（Service Workerのある `src/background/` 起点）
                try {
                    importScripts('../lib/xlsx.full.min.js');
                    console.log('✅ SheetJS読み込み成功 ../lib/xlsx.full.min.js');
                    return;
                } catch (e1) {
                    console.warn('相対パス読み込み失敗:', e1);
                }

                // 絶対パス（拡張内ルート起点）
                try {
                    importScripts('/src/lib/xlsx.full.min.js');
                    console.log('✅ SheetJS読み込み成功 /src/lib/xlsx.full.min.js');
                    return;
                } catch (e2) {
                    console.warn('絶対パス読み込み失敗:', e2);
                }
            }

            // フォールバック: 最小限のXLSXオブジェクトを提供（CSVのみ）
            if (typeof XLSX === 'undefined') {
                self.XLSX = {
                    utils: {
                        book_new: () => ({ SheetNames: [], Sheets: {} }),
                        json_to_sheet: (data) => {
                            const ws = { '!ref': 'A1' };
                            if (data && data.length > 0) {
                                const headers = Object.keys(data[0]);
                                headers.forEach((header, colIndex) => {
                                    const col = String.fromCharCode(65 + colIndex);
                                    ws[col + '1'] = { v: header, t: 's' };
                                });
                                data.forEach((row, rowIndex) => {
                                    headers.forEach((header, colIndex) => {
                                        const col = String.fromCharCode(65 + colIndex);
                                        const cellRef = col + (rowIndex + 2);
                                        ws[cellRef] = { v: row[header] || '', t: 's' };
                                    });
                                });
                                ws['!ref'] = `A1:${String.fromCharCode(65 + headers.length - 1)}${data.length + 1}`;
                            }
                            return ws;
                        },
                        sheet_add_aoa: (ws, data) => {
                            if (data && data.length > 0) {
                                data.forEach((row, rowIndex) => {
                                    row.forEach((cell, colIndex) => {
                                        const col = String.fromCharCode(65 + colIndex);
                                        const cellRef = col + (rowIndex + 1);
                                        ws[cellRef] = { v: cell, t: 's' };
                                    });
                                });
                            }
                            return ws;
                        },
                        book_append_sheet: (wb, ws, name) => {
                            wb.SheetNames.push(name);
                            wb.Sheets[name] = ws;
                        },
                        encode_cell: (ref) => String.fromCharCode(65 + ref.c) + (ref.r + 1),
                        decode_range: (ref) => {
                            const m = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
                            if (m) {
                                return {
                                    s: { c: m[1].charCodeAt(0) - 65, r: parseInt(m[2]) - 1 },
                                    e: { c: m[3].charCodeAt(0) - 65, r: parseInt(m[4]) - 1 }
                                };
                            }
                            return { s: { c: 0, r: 0 }, e: { c: 0, r: 0 } };
                        }
                    },
                    write: (wb) => {
                        try {
                            const sheetName = wb.SheetNames[0];
                            const ws = wb.Sheets[sheetName];
                            if (ws && ws['!ref']) {
                                const range = XLSX.utils.decode_range(ws['!ref']);
                                let csv = '';
                                for (let r = range.s.r; r <= range.e.r; r++) {
                                    const rowData = [];
                                    for (let c = range.s.c; c <= range.e.c; c++) {
                                        const cellRef = XLSX.utils.encode_cell({ r, c });
                                        const cell = ws[cellRef];
                                        rowData.push(cell ? cell.v : '');
                                    }
                                    csv += rowData.map(v => `"${v}"`).join(',') + '\n';
                                }
                                return new TextEncoder().encode(csv);
                            }
                            return new TextEncoder().encode('データなし\n');
                        } catch (e) {
                            return new TextEncoder().encode('エラーが発生しました\n');
                        }
                    }
                };
                console.log('✅ 最小限XLSXオブジェクト（CSV専用）を設定しました');
            }
        } catch (error) {
            console.error('❌ SheetJSライブラリ読み込みエラー:', error);
            throw new Error('SheetJSライブラリの読み込みに失敗しました: ' + error.message);
        }
    }

    /**
     * 検知モードのラベルを取得
     * @param {string} mode 検知モード
     * @returns {string} ラベル
     */
    getDetectModeLabel(mode) {
        const modeMap = {
            'appear': '出現検知',
            'disappear': '消失検知',
            'change': '変化検知'
        };
        return modeMap[mode] || '出現検知';
    }

    /**
     * 停止条件のラベルを取得
     * @param {string} condition 停止条件
     * @returns {string} ラベル
     */
    getStopConditionLabel(condition) {
        const conditionMap = {
            'time': '時間経過',
            'detection': '検知時',
            'manual': '手動のみ'
        };
        return conditionMap[condition] || '手動のみ';
    }

    /**
     * ダウンロード形式の文字列を取得
     * @param {Object} settings 設定オブジェクト
     * @returns {string} ダウンロード形式文字列
     */
    getDownloadFormatsString(settings) {
        const formats = [];
        if (settings?.downloadScreenshot) formats.push('screenshot');
        if (settings?.downloadSource) formats.push('page_source');
        if (settings?.downloadSourceWithoutFooter) formats.push('text');
        return formats.join(',');
    }

    /**
     * 有効なExcelファイルかチェック
     * @param {File} file ファイル
     * @returns {boolean} 有効な場合はtrue
     */
    isValidExcelFile(file) {
        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const fileName = file.name.toLowerCase();
        return validExtensions.some(ext => fileName.endsWith(ext));
    }

    /**
     * ファイルをArrayBufferとして読み込み
     * @param {File} file ファイル
     * @returns {Promise<ArrayBuffer>} ArrayBuffer
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * インポートデータの検証
     * @param {Array} data インポートデータ
     * @returns {Object} 検証結果
     */
    validateImportData(data) {
        const errors = [];
        const warnings = [];
        const validRecords = [];

        data.forEach((row, index) => {
            const rowNum = index + 2; // Excelの行番号（ヘッダー考慮）

            // 必須フィールドチェック
            if (!row['監視名'] || !row['URL']) {
                errors.push(`行${rowNum}: 監視名とURLは必須です`);
                return;
            }

            // URL形式チェック
            if (!row['URL'].match(/^https?:\/\/.+/)) {
                errors.push(`行${rowNum}: 有効なURL形式で入力してください`);
                return;
            }

            // 名前の長さチェック
            if (row['監視名'].length > 100) {
                errors.push(`行${rowNum}: 監視名は100文字以内で入力してください`);
                return;
            }

            // 数値フィールドの検証
            const interval = parseInt(row['監視間隔(秒)']) || 30;
            const duration = parseInt(row['監視時間(分)']) || 60;

            if (interval < 10 || interval > 3600) {
                warnings.push(`行${rowNum}: 監視間隔を30秒に設定しました（範囲: 10-3600秒）`);
            }

            if (duration < 1 || duration > 1440) {
                warnings.push(`行${rowNum}: 監視時間を60分に設定しました（範囲: 1-1440分）`);
            }

            validRecords.push(row);
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            validRecords
        };
    }

    /**
     * インポートデータを実際に処理
     * @param {Array} validRecords 検証済みレコード
     * @param {Object} config 現在の設定
     * @param {boolean} overwrite 既存データを上書きするか
     * @returns {Promise<Object>} 処理結果
     */
    async processImportData(validRecords, config, overwrite) {
        let importedCount = 0;
        const errors = [];
        const warnings = [];

        // 上書きモードの場合、既存データをクリア
        if (overwrite) {
            config.multiple_configs = [];
        }

        for (const record of validRecords) {
            try {
                const newConfig = this.convertExcelRowToConfig(record);

                // 重複チェック（URLベース）
                const existingIndex = config.multiple_configs.findIndex(c => c.url === newConfig.url);

                if (existingIndex >= 0) {
                    if (overwrite) {
                        config.multiple_configs[existingIndex] = newConfig;
                        warnings.push(`${newConfig.name}: 既存設定を更新しました`);
                    } else {
                        warnings.push(`${newConfig.name}: 既存URLのため追加をスキップしました`);
                        continue;
                    }
                } else {
                    config.multiple_configs.push(newConfig);
                }

                importedCount++;

            } catch (error) {
                errors.push(`${record['監視名']}: ${error.message}`);
            }
        }

        // 設定を保存
        await this.saveConfig(config);

        return {
            success: true,
            imported_count: importedCount,
            errors,
            warnings
        };
    }

    /**
     * ExcelデータをConfig形式に変換
     * @param {Object} row Excelの行データ
     * @returns {Object} Config形式のデータ
     */
    convertExcelRowToConfig(row) {
        const result = {
            id: row['ID'] || this.generateId(),
            name: row['監視名'],
            url: row['URL'],
            enabled: row['有効状態'] === '有効',
            selector: row['セレクター'] || '',
            keyword: row['監視キーワード'] || '',
            detection_mode: this.parseDetectMode(row['検知モード']),
            settings: {
                monitorKeyword: row['監視キーワード'] || '',
                monitorSelector: row['セレクター'] || '',
                detectMode: this.parseDetectMode(row['検知モード']),
                interval: Math.max(10, Math.min(3600, parseInt(row['監視間隔(秒)']) || 30)),
                duration: Math.max(1, Math.min(1440, parseInt(row['監視時間(分)']) || 60)),
                stopCondition: this.parseStopCondition(row['停止条件']),
                initialKeywordDetection: row['初期検知'] === '有効',
                notifications: row['通知設定'] !== '無効'
            },
            created_at: row['作成日時'] || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // ダウンロードフォーマット設定を統合
        const downloadFormats = this.parseDownloadFormats(row['ダウンロード形式']);
        Object.assign(result.settings, downloadFormats);

        return result;
    }

    /**
     * 検知モードをパース
     * @param {string} label ラベル
     * @returns {string} 検知モード
     */
    parseDetectMode(label) {
        const modeMap = {
            '出現検知': 'appear',
            '消失検知': 'disappear',
            '変化検知': 'change'
        };
        return modeMap[label] || 'appear';
    }

    /**
     * 停止条件をパース
     * @param {string} label ラベル
     * @returns {string} 停止条件
     */
    parseStopCondition(label) {
        const conditionMap = {
            '時間経過': 'time',
            '検知時': 'detection',
            '手動のみ': 'manual'
        };
        return conditionMap[label] || 'manual';
    }

    /**
     * ダウンロード形式をパース
     * @param {string} formatsString カンマ区切りの形式文字列
     * @returns {Object} ダウンロード設定オブジェクト
     */
    parseDownloadFormats(formatsString) {
        const formats = (formatsString || '').split(',').map(f => f.trim());
        return {
            downloadScreenshot: formats.includes('screenshot'),
            downloadSource: formats.includes('page_source'),
            downloadSourceWithoutFooter: formats.includes('text')
        };
    }
}

// Service Worker対応: グローバルスコープで利用可能
// export構文はService Worker環境では使用不可のため削除
