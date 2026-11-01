function generateFilename(type, downloadType, settings, timestamp, targetTab, detectionResult = null) {
    try {
        const normalizedSettings = settings || {};
        const resolvedUrl = targetTab?.url || normalizedSettings.targetUrl || normalizedSettings.url || 'https://unknown.com';
        const url = new URL(resolvedUrl);
        const hostnameParts = url.hostname.replace(/^www\./, '').split('.').filter(Boolean);
        const registrableIndex = hostnameParts.length >= 3 &&
            ['co', 'or', 'go', 'ac', 'ne'].includes(hostnameParts[hostnameParts.length - 2])
            ? hostnameParts.length - 3
            : hostnameParts.length - 2;
        const registrableLabel = hostnameParts[Math.max(0, registrableIndex)] || hostnameParts[0] || 'unknown';
        const siteName = registrableLabel.split('-')[0] || registrableLabel;
        const siteFormatted = siteName.charAt(0).toUpperCase() + siteName.slice(1);

        const resolvedKeyword = normalizedSettings.monitorKeyword || normalizedSettings.keyword || 'unknown';
        const keyword = resolvedKeyword
            .replace(/\s+/g, '')
            .substring(0, 10);

        let validTimestamp = timestamp;
        if (typeof timestamp === 'string' && timestamp.includes('-') && timestamp.includes('T')) {
            const parts = timestamp.split('T');
            if (parts.length === 2) {
                const datePart = parts[0];
                const timePart = parts[1];
                const timeRestored = timePart.replace(/^(\d{2})-(\d{2})-(\d{2})-(\d+)Z$/, '$1:$2:$3.$4Z');
                validTimestamp = `${datePart}T${timeRestored}`;
            }
        }

        const date = new Date(validTimestamp);
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid timestamp format: ${timestamp}`);
        }

        const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
        const jstString = jstDate.toISOString()
            .replace('T', '_')
            .replace(/:/g, '-')
            .substring(0, 19);

        let finalDownloadType = downloadType;
        if (detectionResult) {
            if (downloadType.includes('Final')) {
                if (detectionResult.timeout === true) {
                    if (detectionResult.reason === 'timeout_still_exists') {
                        finalDownloadType = downloadType.replace('Final', 'Final_StillExists');
                    } else if (detectionResult.reason === 'timeout_not_found') {
                        finalDownloadType = downloadType.replace('Final', 'Final_NotFound');
                    } else if (detectionResult.found === true) {
                        finalDownloadType = downloadType.replace('Final', 'Final_StillExists');
                    } else {
                        finalDownloadType = downloadType.replace('Final', 'Final_NotFound');
                    }
                } else if (detectionResult.found === false) {
                    finalDownloadType = downloadType.replace('Final', 'Final_NotFound');
                } else if (detectionResult.found === true) {
                    finalDownloadType = downloadType.replace('Final', 'Final_Found');
                }
            }
        }

        logger.debug('ファイル名生成成功:', {
            site: siteFormatted,
            keyword,
            time: jstString,
            url: url.hostname,
            originalTimestamp: timestamp,
            validTimestamp,
            downloadType: finalDownloadType,
            detectionResult
        });

        return `${type}_${finalDownloadType}_${siteFormatted}_${keyword}_${jstString}`;
    } catch (error) {
        logger.warn('ファイル名生成エラー:', error.message, {
            targetTabUrl: targetTab?.url,
            settingsTargetUrl: settings?.targetUrl,
            settingsUrl: settings?.url,
            keyword: settings?.monitorKeyword || settings?.keyword,
            timestamp
        });
        const fallbackTimestamp = timestamp.toString().replace(/[:.]/g, '-');
        return `${type}_${downloadType}_${fallbackTimestamp}`;
    }
}

function normalizeScheduleTime(timeValue) {
    return /^\d{2}:\d{2}$/.test(timeValue || '') ? timeValue : '13:00';
}

function scheduleTimeToMinutes(timeValue) {
    const [hour, minute] = normalizeScheduleTime(timeValue).split(':').map(Number);
    return hour * 60 + minute;
}

function normalizeMonitoringMode(mode) {
    return mode === 'long_running' ? 'long_running' : 'high_frequency';
}

function validateMonitoringModeSettings(settings = {}) {
    const monitoringMode = normalizeMonitoringMode(settings.monitoringMode);
    const interval = Number(settings.interval);
    const duration = Number(settings.duration);

    if (monitoringMode === 'high_frequency') {
        if (interval < 5 || interval > 20) {
            return '高頻度セッションの確認間隔は5〜20秒にしてください';
        }
        if (duration < 60 || duration > 60 * 60) {
            return '高頻度セッションの監視時間は1〜60分にしてください';
        }
        return null;
    }

    if (interval < 30) {
        return '長期監視の確認間隔は30秒以上にしてください';
    }
    if (duration < 30 * 60 || duration > 8 * 60 * 60) {
        return '長期監視の監視時間は30分〜8時間にしてください';
    }
    return null;
}

const SINGLE_MONITORING_SESSION_ALARM_PREFIX = 'singleMonitoringSession';

function createSingleMonitoringSessionId(now = Date.now(), random = Math.random) {
    return `single_${now}_${Math.floor(random() * 0x100000).toString(36)}`;
}

function getSingleMonitoringSessionAlarmName(sessionId) {
    return `${SINGLE_MONITORING_SESSION_ALARM_PREFIX}_${sessionId}`;
}

function isSingleMonitoringSessionAlarmName(alarmName) {
    return typeof alarmName === 'string' &&
        alarmName.startsWith(`${SINGLE_MONITORING_SESSION_ALARM_PREFIX}_`);
}

function createSingleMonitoringSession({ sessionId, tabId, settings, now = Date.now() }) {
    const id = sessionId || createSingleMonitoringSessionId(now);
    const durationMs = Number(settings?.duration || 0) * 1000;
    return {
        id,
        tabId,
        settings: { ...(settings || {}) },
        startedAt: now,
        endsAt: now + durationMs,
        active: true,
        monitoringMode: normalizeMonitoringMode(settings?.monitoringMode),
        generation: 1,
        alarmName: getSingleMonitoringSessionAlarmName(id),
        executionLease: null,
        initialCheckCompleted: false,
        keywordStateInitialized: false,
        previousKeywordPresent: null
    };
}

function evaluateSingleKeywordStateTransition({
    keywordStateInitialized = false,
    previousKeywordPresent = null,
    currentKeywordPresent,
    detectMode = 'appear',
    initialKeywordDetection = false
} = {}) {
    if (typeof currentKeywordPresent !== 'boolean') {
        return { decision: 'pending', keywordStateInitialized, previousKeywordPresent };
    }

    const normalizedDetectMode = detectMode === 'disappear' ? 'disappear' : 'appear';
    const hasBaseline = keywordStateInitialized === true && typeof previousKeywordPresent === 'boolean';
    const matchesCondition = normalizedDetectMode === 'disappear'
        ? currentKeywordPresent === false
        : currentKeywordPresent === true;

    if (!hasBaseline) {
        return {
            decision: initialKeywordDetection === true && matchesCondition ? 'detected' : 'baseline',
            keywordStateInitialized: true,
            previousKeywordPresent: currentKeywordPresent,
            isInitialState: true
        };
    }

    const detected = normalizedDetectMode === 'disappear'
        ? previousKeywordPresent === true && currentKeywordPresent === false
        : previousKeywordPresent === false && currentKeywordPresent === true;

    return {
        decision: detected ? 'detected' : 'not_detected',
        keywordStateInitialized: true,
        previousKeywordPresent: currentKeywordPresent,
        isInitialState: false
    };
}

function createLongRunningSingleMonitoringAlarmOptions(settings = {}, now = Date.now()) {
    const requestedIntervalSeconds = Number(settings?.interval);
    const intervalSeconds = Number.isFinite(requestedIntervalSeconds)
        ? Math.max(30, requestedIntervalSeconds)
        : 30;
    return {
        when: now + intervalSeconds * 1000,
        periodInMinutes: intervalSeconds / 60
    };
}

function canClaimSingleMonitoringSessionLease(session, now = Date.now()) {
    if (!session?.active || Number(session.endsAt) <= now) return false;
    return !session.executionLease || Number(session.executionLease.expiresAt) <= now;
}

function claimSingleMonitoringSessionLease(session, now = Date.now(), leaseMs = 60000) {
    if (!canClaimSingleMonitoringSessionLease(session, now)) return null;
    return {
        ...session,
        executionLease: { id: `lease_${now}`, expiresAt: now + leaseMs }
    };
}

function releaseSingleMonitoringSessionLease(session) {
    return { ...session, executionLease: null };
}

function getTwoTierAcceptanceScenario(scenarioId) {
    const scenarios = {
        high_frequency_single_duration: {
            mode: 'high_frequency',
            count: 1,
            expectedDetections: 0,
            expectedExpirations: 1,
            sessionBehaviors: ['remain_unmatched']
        },
        high_frequency_single_detect: {
            mode: 'high_frequency',
            count: 1,
            expectedDetections: 1,
            expectedExpirations: 0,
            sessionBehaviors: ['detect_after_initial']
        },
        high_frequency_multiple_duration: {
            mode: 'high_frequency',
            count: 2,
            expectedDetections: 0,
            expectedExpirations: 2,
            sessionBehaviors: ['remain_unmatched', 'remain_unmatched']
        },
        high_frequency_multiple_detect: {
            mode: 'high_frequency',
            count: 2,
            expectedDetections: 1,
            expectedExpirations: 1,
            sessionBehaviors: ['detect_after_initial', 'remain_unmatched']
        },
        long_running_single: {
            mode: 'long_running',
            count: 1,
            expectedDetections: 1,
            expectedExpirations: 0,
            sessionBehaviors: ['detect_after_initial']
        }
    };

    return scenarios[scenarioId] || null;
}

function isTwoTierAcceptanceAlarmRun(runSource) {
    return runSource === 'alarm';
}

function hasTwoTierAcceptanceExpectedOutcomes(status = {}) {
    const expectedDetections = status.expectedDetectionSessionIds || [];
    const expectedExpirations = status.expectedExpirationSessionIds || [];
    const detected = new Set(status.detectedSessionIds || []);
    const expired = new Set(status.expiredSessionIds || []);

    return expectedDetections.every((sessionId) => detected.has(sessionId)) &&
        expectedExpirations.every((sessionId) => expired.has(sessionId));
}

function hasTwoTierAcceptanceInitialChecks(status = {}) {
    const sessionIds = status.sessionIds || [];
    const initialNotDetected = new Set(status.initialNotDetectedSessionIds || []);
    return sessionIds.length > 0 && sessionIds.every((sessionId) => initialNotDetected.has(sessionId));
}

function hasTwoTierAcceptanceMinimumChecks(status = {}, minimumCount = 2) {
    const sessionIds = status.sessionIds || [];
    const checkCounts = status.checkCounts || {};
    return sessionIds.length > 0 && sessionIds.every((sessionId) =>
        Number(checkCounts[sessionId] || 0) >= minimumCount
    );
}

function markTwoTierAcceptanceServiceWorkerRestored(status = {}, sessionId, restoredAt) {
    const recoveredSessionIds = Array.from(new Set([
        ...(status.recoveredSessionIds || []),
        sessionId
    ].filter(Boolean)));
    return {
        ...status,
        recoveredSessionIds,
        serviceWorkerRestarted: true,
        serviceWorkerRestartedAt: restoredAt,
        verification: {
            ...(status.verification || {}),
            serviceWorkerRestartRestored: true
        }
    };
}

function getTwoTierAcceptanceRequiredCheckKeys(scenarioId) {
    const common = [
        'sessionCreated',
        'targetTabs',
        'initialNotDetected',
        'cadenceScheduled',
        'bcAlarmsUnchanged',
        'settingsRestored'
    ];
    if (scenarioId === 'long_running_single') {
        return [...common, 'longRunningAlarmCreated', 'longRunningAlarmFired'];
    }
    const highFrequencyCommon = [...common, 'staleReportIgnored'];
    if (scenarioId === 'high_frequency_single_duration' ||
        scenarioId === 'high_frequency_multiple_duration') {
        return [...highFrequencyCommon, 'continuedAndExpired'];
    }
    if (scenarioId === 'high_frequency_multiple_detect') {
        return [...highFrequencyCommon, 'detectedAndStopped', 'continuedAndExpired'];
    }
    return [...highFrequencyCommon, 'detectedAndStopped'];
}

function calculateHighFrequencyReloadDelayMs(intervalSeconds, checkStartedAt, now = Date.now()) {
    const intervalMs = Math.max(0, Number(intervalSeconds) * 1000);
    const startedAt = Number(checkStartedAt);
    if (!Number.isFinite(startedAt)) return intervalMs;
    return Math.max(0, intervalMs - Math.max(0, now - startedAt));
}

function areTwoTierAcceptanceChecksPassed(scenarioId, verification = {}) {
    return getTwoTierAcceptanceRequiredCheckKeys(scenarioId)
        .every((key) => verification[key] === true);
}

function resolveScheduleWindowSettings(settings = {}) {
    const scheduleWindowStart = normalizeScheduleTime(
        settings.scheduleWindowStart || settings.scheduleTime || '11:57'
    );
    let scheduleWindowEnd = normalizeScheduleTime(settings.scheduleWindowEnd || '12:05');
    const reloadIntervalSec = Math.min(
        300,
        Math.max(5, parseInt(settings.scheduleReloadIntervalSec, 10) || 30)
    );

    if (scheduleTimeToMinutes(scheduleWindowEnd) <= scheduleTimeToMinutes(scheduleWindowStart)) {
        const startMinutes = scheduleTimeToMinutes(scheduleWindowStart);
        const endMinutes = Math.min(startMinutes + 8, 23 * 60 + 59);
        const endHour = Math.floor(endMinutes / 60);
        const endMinute = endMinutes % 60;
        scheduleWindowEnd = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
    }

    return {
        scheduleWindowStart,
        scheduleWindowEnd,
        scheduleReloadIntervalSec: reloadIntervalSec
    };
}

function createScheduleDate(scheduleTime) {
    const [hour, minute] = normalizeScheduleTime(scheduleTime).split(':').map(Number);
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);
    if (next <= now) {
        next.setDate(next.getDate() + 1);
    }
    return next;
}

function getTodayScheduleTimeMs(timeValue) {
    const [hour, minute] = normalizeScheduleTime(timeValue).split(':').map(Number);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.getTime();
}

function getSiteAlarmName(baseName, siteId) {
    return `${baseName}_${siteId}`;
}

function extractSiteInfoFromAlarm(alarmName, baseName) {
    const prefix = `${baseName}_`;
    if (!alarmName.startsWith(prefix)) {
        return null;
    }
    const rest = alarmName.slice(prefix.length);
    const lastUnderscoreIndex = rest.lastIndexOf('_');
    if (lastUnderscoreIndex > 0) {
        const potentialIndex = rest.slice(lastUnderscoreIndex + 1);
        if (/^\d+$/.test(potentialIndex)) {
            return {
                siteId: rest.slice(0, lastUnderscoreIndex),
                scheduleIndex: parseInt(potentialIndex, 10)
            };
        }
    }
    return { siteId: rest, scheduleIndex: 0 };
}

function extractSiteIdFromAlarm(alarmName, baseName) {
    const info = extractSiteInfoFromAlarm(alarmName, baseName);
    return info ? info.siteId : null;
}

function getSchedulesFromSite(site) {
    if (Array.isArray(site.schedules) && site.schedules.length > 0) {
        return site.schedules;
    }
    if (site.schedule) {
        return [site.schedule];
    }
    return [{ startTime: '11:57', endTime: '12:05', intervalSeconds: 60 }];
}

function formatJstStockTimestamp(date = new Date()) {
    const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date(date);
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Tokyo',
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(d);
    const pick = (type) => parts.find((part) => part.type === type)?.value ?? '00';
    const yy = pick('year');
    const MM = pick('month');
    const dd = pick('day');
    const hh = pick('hour');
    const mm = pick('minute');
    const ss = pick('second');
    const yyMMdd = `${yy}${MM}${dd}`;
    return {
        yyMMdd,
        yyMMdd_hhmmss: `${yyMMdd}-${hh}${mm}${ss}`
    };
}

function formatJstTimestampReadable(date = new Date()) {
    const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date(date);
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).format(d).replace('T', ' ') + ' (JST)';
}

function extractKeywordFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const gspsk = urlObj.searchParams.get('gspsk');
        if (gspsk) {
            return decodeURIComponent(gspsk);
        }
    } catch (e) {
        // ignore
    }
    return '';
}

function buildAeonStockDownloadPath(kind, date = new Date(), ext = 'txt', options = {}) {
    const { yyMMdd, yyMMdd_hhmmss } = formatJstStockTimestamp(date);
    const { siteName = '' } = options;

    const safeName = (str) => str
        .replace(/[\s　]/g, '')
        .replace(/[\/\\:*?"<>|]/g, '_')
        .slice(0, 30);

    const namePart = siteName ? '_' + safeName(siteName) : '';

    return `aeon/stock/${yyMMdd}/${kind}${namePart}_${yyMMdd_hhmmss}.${ext}`;
}

function buildBaselineLogText(snapshot, session) {
    const urls = (snapshot?.urls || []).filter(Boolean);
    const now = new Date();
    const jstParts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).format(now);
    const jstTimestamp = `${jstParts} JST`;
    const lines = [
        'PageRecorder Scheduled Stock Log',
        'logType: baseline',
        `timestamp: ${jstTimestamp}`,
        `targetUrl: ${session?.targetUrl || ''}`,
        `comparisonKey: ${session?.comparisonKey || ''}`,
        `count: ${Number(snapshot?.count || 0)}`,
        `urlCount: ${urls.length}`,
        `usedSelector: ${snapshot?.usedSelector || ''}`,
        `title: ${snapshot?.title || ''}`,
        'urls:'
    ];
    for (const url of urls) {
        lines.push(url);
    }
    lines.push(`textPreview: ${snapshot?.textPreview || ''}`);
    return lines.join('\n');
}

function buildStockLogText(logEntry) {
    const detectedUrls = logEntry.detectedUrls || [];
    const newUrls = logEntry.newUrls || [];
    const currentCount = Number(logEntry.currentCount || 0);
    const lines = [
        'PageRecorder Scheduled Stock Log',
        'logType: detected',
        `timestamp: ${formatJstTimestampReadable(logEntry.timestamp)}`,
        `targetUrl: ${logEntry.targetUrl}`,
        `comparisonKey: ${logEntry.comparisonKey}`,
        `previousCount: ${logEntry.previousCount}`,
        `currentCount: ${logEntry.currentCount}`,
        `count: ${currentCount}`,
        `urlCount: ${detectedUrls.length}`,
        `usedSelector: ${logEntry.usedSelector || ''}`,
        'increaseDetected: true',
        'newUrls:'
    ];
    for (const url of newUrls) {
        lines.push(url);
    }
    lines.push('detectedUrls:');
    for (const url of detectedUrls) {
        lines.push(url);
    }
    lines.push(`title: ${logEntry.title || ''}`);
    lines.push(`textPreview: ${logEntry.textPreview || ''}`);
    return lines.join('\n');
}

function normalizeStockProductUrl(url) {
    if (!url || typeof url !== 'string') {
        return '';
    }

    try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
    } catch {
        return url.split('?')[0].replace(/\/$/, '');
    }
}

function resolveScheduledProductUrl(url, baseUrl = '') {
    if (!url || typeof url !== 'string') {
        return '';
    }

    try {
        return new URL(url, baseUrl || undefined).href;
    } catch {
        return '';
    }
}

function extractScheduledProductUrls(elements, baseUrl = '') {
    const urls = [];
    const seen = new Set();
    const nestedAnchorSelectors = [
        'a[href*="/product/0/P-"]',
        'a[href*="/product/"]',
        'a[href]'
    ];

    const pushUrl = (rawUrl) => {
        const resolved = resolveScheduledProductUrl(rawUrl, baseUrl);
        if (!resolved || seen.has(resolved)) {
            return;
        }
        seen.add(resolved);
        urls.push(resolved);
    };

    for (const element of elements || []) {
        if (!element) {
            continue;
        }

        if (String(element.tagName || '').toUpperCase() === 'A') {
            pushUrl(element.getAttribute ? element.getAttribute('href') : element.href);
            continue;
        }

        let anchor = null;
        for (const selector of nestedAnchorSelectors) {
            if (typeof element.querySelector !== 'function') {
                break;
            }
            anchor = element.querySelector(selector);
            if (anchor) {
                break;
            }
        }

        if (anchor) {
            pushUrl(anchor.getAttribute ? anchor.getAttribute('href') : anchor.href);
        }
    }

    return urls;
}

function diffStockProductUrls(previousUrls, currentUrls) {
    const previousList = (previousUrls || []).filter(Boolean);
    if (previousList.length === 0) {
        return [];
    }

    const previousSet = new Set(previousList.map(normalizeStockProductUrl).filter(Boolean));
    const seen = new Set();
    const newUrls = [];

    for (const url of currentUrls || []) {
        const normalized = normalizeStockProductUrl(url);
        if (!normalized || previousSet.has(normalized) || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        newUrls.push(url);
    }

    return newUrls;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

// テストタブの A: single / A: multiple シナリオ。本番と同じ高頻度の設定範囲で動かす。
// start は開始ページ、change は基準取得後の変化（append: キーワード追記 / remove: 削除）。
const TEST_TAB_SCENARIO_DEFINITIONS = {
    appear: { scope: 'single', count: 1, start: 'out_of_stock', detectMode: 'appear', initialKeywordDetection: false, change: 'append', expected: 'detected' },
    disappear: { scope: 'single', count: 1, start: 'in_stock', detectMode: 'disappear', initialKeywordDetection: false, change: 'remove', expected: 'detected' },
    initial_detected: { scope: 'single', count: 1, start: 'in_stock', detectMode: 'appear', initialKeywordDetection: true, change: null, expected: 'detected' },
    initial_not_detected: { scope: 'single', count: 1, start: 'out_of_stock', detectMode: 'appear', initialKeywordDetection: true, change: null, expected: 'expired' },
    element_not_found_check: { scope: 'single', count: 1, start: 'in_stock', detectMode: 'appear', initialKeywordDetection: false, change: null, expected: 'selector_error', selector: '.page-recorder-test-valid-but-not-found' },
    pending_error_check: { scope: 'single', count: 1, start: 'in_stock', detectMode: 'appear', initialKeywordDetection: false, change: null, expected: 'selector_error', selector: '[' },
    gmail_notification_check: { scope: 'single', count: 1, start: 'out_of_stock', detectMode: 'appear', initialKeywordDetection: false, change: 'append', expected: 'detected', requiresGmail: true },
    baseline_two_urls: { scope: 'multiple', count: 2, start: 'out_of_stock', detectMode: 'appear', initialKeywordDetection: false, change: null, expected: 'expired' },
    initial_detected_two_urls: { scope: 'multiple', count: 2, start: 'in_stock', detectMode: 'appear', initialKeywordDetection: true, change: null, expected: 'detected' },
    initial_not_detected_two_urls: { scope: 'multiple', count: 2, start: 'out_of_stock', detectMode: 'appear', initialKeywordDetection: true, change: null, expected: 'expired' },
    auto_appear_two_urls: { scope: 'multiple', count: 2, start: 'out_of_stock', detectMode: 'appear', initialKeywordDetection: false, change: 'append', expected: 'detected' },
    gmail_notification_one_url: { scope: 'multiple', count: 1, start: 'out_of_stock', detectMode: 'appear', initialKeywordDetection: false, change: 'append', expected: 'detected', requiresGmail: true },
    gmail_notification_two_urls: { scope: 'multiple', count: 2, start: 'out_of_stock', detectMode: 'appear', initialKeywordDetection: false, change: 'append', expected: 'detected', requiresGmail: true }
};

const TEST_TAB_OUT_OF_STOCK_SAMPLE_MISSING_MESSAGE =
    '在庫なしサンプルがないため、このシナリオは使えません。docs/在庫Fetch診断_サイト追加手順.md の手順で在庫なしサンプルを追加してください。';

function getTestTabScenarioDefinition(scenarioId) {
    return Object.prototype.hasOwnProperty.call(TEST_TAB_SCENARIO_DEFINITIONS, scenarioId)
        ? { id: scenarioId, ...TEST_TAB_SCENARIO_DEFINITIONS[scenarioId] }
        : null;
}

function resolveTestTabBehavior(change, reproductionMode) {
    if (!change) return 'none';
    if (reproductionMode === 'manual') return 'manual_after_initial';
    return change === 'remove' ? 'disappear_after_initial' : 'detect_after_initial';
}

function buildTestTabScenarioRun({ scenarioId, site, reproductionMode = 'auto' } = {}) {
    const definition = getTestTabScenarioDefinition(scenarioId);
    if (!definition) {
        return { ok: false, reason: 'unknown_scenario', message: `未知のテストシナリオです: ${scenarioId}` };
    }
    const sampleUrls = [...new Set((definition.start === 'out_of_stock' ? site?.outOfStockUrls : site?.inStockUrls) || [])]
        .filter((url) => typeof url === 'string' && url.trim())
        .map((url) => url.trim());
    if (!sampleUrls.length) {
        return definition.start === 'out_of_stock'
            ? { ok: false, reason: 'out_of_stock_sample_missing', message: TEST_TAB_OUT_OF_STOCK_SAMPLE_MISSING_MESSAGE }
            : { ok: false, reason: 'in_stock_sample_missing', message: '在庫ありサンプルがないため、このシナリオは使えません。' };
    }
    if (definition.count > sampleUrls.length) {
        const stateLabel = definition.start === 'out_of_stock' ? '在庫なし' : '在庫あり';
        return {
            ok: false,
            reason: 'multiple_samples_missing',
            message: `${stateLabel}サンプルが${definition.count}件必要ですが、${sampleUrls.length}件しかありません。異なる商品URLを追加してください。`
        };
    }
    const behavior = resolveTestTabBehavior(definition.change, reproductionMode);
    const configs = Array.from({ length: definition.count }, (_, index) => ({
        id: `test-tab-${scenarioId}-${index + 1}`,
        name: `${site.name || site.id} ${scenarioId} ${index + 1}`,
        url: sampleUrls[index],
        selector: definition.selector || site.selector,
        keyword: site.keyword,
        start: definition.start,
        expected: definition.expected,
        twoTierTestBehavior: behavior,
        manualAction: behavior === 'manual_after_initial' ? definition.change : null,
        settings: {
            monitoringMode: 'high_frequency',
            interval: 5,
            duration: 60,
            detectMode: definition.detectMode,
            initialKeywordDetection: definition.initialKeywordDetection,
            captureMode: 'reload',
            downloadSource: true,
            downloadScreenshot: true
        }
    }));
    return {
        ok: true,
        scenarioId,
        scope: definition.scope,
        reproductionMode: reproductionMode === 'manual' ? 'manual' : 'auto',
        requiresGmail: definition.requiresGmail === true,
        configs
    };
}

function describeTestTabFailure(session, reproductionMode) {
    if (session.reason === 'selector_error' && session.expected !== 'selector_error' && session.start === 'out_of_stock') {
        return '在庫なしページに監視要素がない（監視条件の見直しが必要）';
    }
    if (reproductionMode === 'manual' && session.expected === 'detected' && session.reason === 'expired') {
        return '手動変更が確認できませんでした';
    }
    return `期待: ${session.expected} / 結果: ${session.reason}`;
}

function evaluateTestTabScenarioOutcome({ sessions = [], reproductionMode = 'auto' } = {}) {
    if (!sessions.length) {
        return { status: 'failed', failures: [{ sessionId: null, expected: null, actual: null, message: '監視セッションを開始できませんでした' }] };
    }
    if (sessions.some((session) => !session.reason)) return { status: 'running', failures: [] };
    const failures = sessions
        .filter((session) => session.reason !== session.expected)
        .map((session) => ({
            sessionId: session.id,
            expected: session.expected,
            actual: session.reason,
            message: describeTestTabFailure(session, reproductionMode)
        }));
    return { status: failures.length ? 'failed' : 'passed', failures };
}

function buildTestTabManualReproductionCode({ selector, keyword, action }) {
    const change = action === 'remove'
        ? `target.textContent = (target.textContent || '').split(${JSON.stringify(keyword)}).join('');`
        : `target.textContent = \`\${target.textContent || ''} \${${JSON.stringify(keyword)}}\`;`;
    return `(() => {
  const targets = [...document.querySelectorAll(${JSON.stringify(selector)})];
  if (targets.length === 0) throw new Error('target not found');
  targets.forEach((target) => {
    ${change}
  });
  return { updatedCount: targets.length };
})()`;
}

function buildTestTabManualWindowLogMessage(name, phase, remainingSeconds) {
    if (phase === 'start') {
        return `🧪 [${name}] 手動変更の受付時間中です（残り${remainingSeconds}秒）。監視タブの DevTools でテストタブのコードを実行してください`;
    }
    if (phase === 'progress') return `🧪 [${name}] 手動変更の受付時間中です（残り${remainingSeconds}秒）`;
    if (phase === 'end') return `⏰ [${name}] 手動変更の受付時間が終わりました。これからキーワードを確認します`;
    return null;
}
