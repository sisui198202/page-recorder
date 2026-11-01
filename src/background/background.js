// 完全な機能を持つService Worker - Manifest V3対応版
// 共通ファイル保存ライブラリ読み込み
try {
  importScripts(
    '../lib/file/file-sanitizer.js',
    '../lib/file/filename-generator.js',
    '../lib/file/file-save.js',
  );
  console.log('[shared-lib] ファイル保存ライブラリ読み込み完了');
} catch (e) {
  console.error('[shared-lib] ファイル保存ライブラリ読み込み失敗:', e);
}
// 共通ログライブラリ読み込み
try {
  importScripts('../lib/logging/log-highlight.js');
  importScripts('../lib/logging/sw-log-buffer.js');
  importScripts('../lib/logging/timestamped-console.js');
  console.log('[shared-lib] ログライブラリ読み込み完了');

  // PageRecorder 固有パターンを追加（共有パターンに含まれない絵文字）
  if (typeof LogHighlight !== 'undefined') {
    const pageRecorderStyle = 'background: #ccffcc; color: #333; font-weight: bold;';
    LogHighlight.addPattern(/^⚡/, pageRecorderStyle);   // 即座取得
    LogHighlight.addPattern(/^🎉/, pageRecorderStyle);   // 処理完了
    LogHighlight.addPattern(/^🔄/, pageRecorderStyle);   // 監視開始・更新
    LogHighlight.addPattern(/^📸/, pageRecorderStyle);   // スクリーンショット
    LogHighlight.addPattern(/^📄/, pageRecorderStyle);   // HTML保存
    LogHighlight.addPattern(/^⏰/, pageRecorderStyle);   // 定時監視
    LogHighlight.addPattern(/^🧪/, pageRecorderStyle);   // テスト
    LogHighlight.addPattern(/^💾/, pageRecorderStyle);   // 保存
    LogHighlight.addPattern(/^🛑/, 'color: #ff6600; font-weight: bold;');  // 停止
    LogHighlight.addPattern(/\[周期リロード\]/, 'color: #4488ff;');  // 周期リロード
    console.log('[shared-lib] PageRecorder固有パターン追加完了');
  }
} catch (e) {
  console.error('[shared-lib] ログライブラリ読み込み失敗:', e);
}

try {
  importScripts(
    '../lib/notification/chrome-notify.js',
    '../lib/notification/external-messaging.js',
  );
  console.log('[shared-lib] 通知ライブラリ読み込み完了');
} catch (e) {
  console.error('[shared-lib] 通知ライブラリ読み込み失敗:', e);
}

// Service Worker初期化フラグ
let isServiceWorkerInitialized = false;

// Service Worker起動（ログ出力はlogger初期化後に制御）
const __bgConsole = {
  log: console.log.bind(console),
  info: (console.info || console.log).bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: (console.debug || console.log).bind(console),
};
// SWログリングバッファ（共通ライブラリに移行済み）
// 使用: SwLogBuffer.push(level, message, args), SwLogBuffer.getAll()
function appendToSwLogBuffer(level, message, args) {
  SwLogBuffer.push(level, message, args);
}

// ================================================================================
// AI判断サポートファイル生成
// ================================================================================

function formatAiSupportTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "(不明)";
  return date.toLocaleString("ja-JP", { hour12: false });
}

function createAiSupportReport(session) {
  const settings = session.settings || {};
  const aiSupportContext =
    settings.aiSupportContext && typeof settings.aiSupportContext === "object"
      ? settings.aiSupportContext
      : {};
  return {
    sessionId: session.id,
    monitoringScope: session.monitoringScope || "single",
    requestId: aiSupportContext.requestId || "",
    configId: aiSupportContext.configId || "",
    configName: aiSupportContext.configName || "",
    monitoringKind: settings.monitoringKind || "keyword",
    startedAt: new Date(session.startedAt || Date.now()).toISOString(),
    targetUrl: settings.targetUrl || "",
    settings: {
      monitorSelector: settings.monitorSelector || "",
      monitorKeyword: settings.monitorKeyword || "",
      detectMode: settings.detectMode || "appear",
      monitoringMode: session.monitoringMode || settings.monitoringMode || "high_frequency",
      captureMode: settings.captureMode === "fetch" ? "fetch" : "reload",
      interval: settings.interval || 20,
      duration: settings.duration || 60,
      initialKeywordDetection: settings.initialKeywordDetection === true,
    },
    stages: [{
      at: new Date(session.startedAt || Date.now()).toISOString(),
      name: "監視開始",
      status: "成功",
      detail: session.monitoringScope === "multiple"
        ? "複数URL監視セッションを開始"
        : "単一監視セッションを開始",
    }],
    artifacts: [],
  };
}

function getAiSupportOutcome(reason) {
  const outcomes = {
    detected: "成功（キーワード検知）",
    expired: "成功（監視時間終了・未検知）",
    window_end: "成功（監視時間終了・未検知）",
    window_end_after_check: "成功（監視時間終了・未検知）",
    new_product_detected: "成功（新商品検知）",
    manual_stop: "要確認（手動停止）",
    restarted: "要確認（再開始により停止）",
    selector_error: "失敗（セレクタエラー）",
    tab_missing: "失敗（監視タブなし）",
    tab_removed: "要確認（監視タブが閉じられた）",
  };
  return outcomes[reason] || `要確認（${reason || "不明"}）`;
}

function createAiSupportTerminalReport(session, reason, reportOverride = null) {
  const report = reportOverride || session.aiSupportReport || createAiSupportReport(session);
  return {
    ...report,
    stages: [...(report.stages || []), {
      at: new Date().toISOString(),
      name: "監視終了",
      status: getAiSupportOutcome(reason),
      detail: reason,
    }],
  };
}

function generateAiSupportFileContent(report) {
  const settings = report.settings || {};
  const isListDiffMonitoring = report.monitoringKind === "list-diff";
  const artifacts = report.artifacts || [];
  const stages = report.stages || [];
  const stageLines = stages.length
    ? stages.map((stage) => `| ${formatAiSupportTimestamp(stage.at)} | ${stage.name} | ${stage.status} | ${stage.detail || ""} |`).join("\n")
    : "| - | 実行工程 | 未記録 | - |";
  const artifactLines = artifacts.length
    ? artifacts.map((artifact) => `| ${artifact.type} | ${artifact.status} | ${artifact.filename || "-"} | ${artifact.downloadId ?? "-"} | ${artifact.error || ""} |`).join("\n")
    : "| - | 未生成 | - | - | - |";
  const multipleMonitoringDetails = report.monitoringScope === "multiple"
    ? `\n## 複数URL監視情報\n\n| 項目 | 値 |\n|------|-----|\n| 開始グループID | ${report.requestId || "(不明)"} |\n| 監視設定ID | ${report.configId || "(不明)"} |\n| 監視名 | ${report.configName || "(不明)"} |\n`
    : "";
  const executionChecks = report.execution?.checks || [];
  const executionDetails = report.execution
    ? `\n## 実行チェック履歴\n\n| 開始時刻 | 実測間隔 | 取得方式 | 結果 | 詳細 |\n|----------|----------|----------|------|------|\n${executionChecks.length
      ? executionChecks.map((check) => `| ${formatAiSupportTimestamp(check.startedAt)} | ${check.intervalMs == null ? "初回" : `${(check.intervalMs / 1000).toFixed(1)}秒`} | ${check.captureMode || "-"} | ${check.result || "-"} | ${check.detail || ""} |`).join("\n")
      : "| - | - | - | 未記録 | - |"}\n`
    : "";

  return `# AI判断サポートファイル

## 総合結果

- 判定: ${getAiSupportOutcome(report.terminalReason)}
- 実行ID: ${report.sessionId}
- 開始: ${formatAiSupportTimestamp(report.startedAt)}
- 終了: ${formatAiSupportTimestamp(report.completedAt)}
- 終了理由: ${report.terminalReason || "不明"}

## 監視設定

| 設定項目 | 値 |
|----------|-----|
| 監視URL | ${report.targetUrl || "(アクティブタブ)"} |
| セレクタ | ${settings.monitorSelector || "(未設定)"} |
| キーワード | ${isListDiffMonitoring ? "対象外（一覧差分監視）" : settings.monitorKeyword || "(未設定)"} |
| 検知モード | ${isListDiffMonitoring ? "URL差分（新規商品URL）" : settings.detectMode || "appear"} |
| 監視方式 | ${settings.monitoringMode || "high_frequency"} |
| 取得方式 | ${settings.captureMode || "reload"} |
| 監視間隔 | ${settings.interval || 20}秒 |
| 監視時間 | ${settings.duration || 60}秒 |
| 初回キーワード検知 | ${isListDiffMonitoring ? "対象外" : settings.initialKeywordDetection ? "ON" : "OFF"} |
${multipleMonitoringDetails}
${executionDetails}

## 工程結果

| 時刻 | 工程 | 結果 | 詳細 |
|------|------|------|------|
${stageLines}

## 証跡ダウンロード

| 種別 | 結果 | 要求ファイル名 | downloadId | エラー |
|------|------|----------------|------------|--------|
${artifactLines}

## AIへの確認依頼

- 終了理由と工程結果が期待した手動テストシナリオに一致するか確認してください。
- \`失敗\`または\`要確認\`の工程がある場合は、エラー列と当該工程を優先して確認してください。
- downloadIdはChrome Downloads APIの識別子です。ローカル絶対パスは拡張機能から取得できません。
`;
}

function sanitizeAiSupportFilenamePart(value, fallback = "unknown") {
  const normalized = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|%]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (normalized || fallback).slice(0, 80);
}

function buildAiSupportFilename(report, siteName, now = new Date()) {
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const safeSiteName = sanitizeAiSupportFilenamePart(siteName, "unknown");

  if (report.monitoringScope === "multiple") {
    return `PageRecorder/AI_Support_${sanitizeAiSupportFilenamePart(report.requestId, "unknown-request")}_${sanitizeAiSupportFilenamePart(report.configId, "unknown-config")}_${sanitizeAiSupportFilenamePart(report.configName, "unnamed")}_${safeSiteName}_${sanitizeAiSupportFilenamePart(report.terminalReason, "unknown")}_${dateStr}_${timeStr}.md`;
  }

  return `PageRecorder/AI_Support_${dateStr}_${timeStr}_${safeSiteName}.md`;
}

async function appendAiSupportReportStage(sessionId, stage) {
  const sessions = await getSingleMonitoringSessions();
  const session = sessions[sessionId];
  if (!session?.settings?.downloadAiSupportFile) return;
  const updatedReport = buildAiSupportReportWithStage(session, stage);
  sessions[sessionId] = {
    ...session,
    aiSupportReport: updatedReport,
  };
  await saveSingleMonitoringSessions(sessions);
  return updatedReport;
}

function buildAiSupportReportWithStage(session, stage) {
  const report = session.aiSupportReport || createAiSupportReport(session);
  const { artifacts, targetUrl, ...stageDetail } = stage;
  return {
    ...report,
    targetUrl: targetUrl || report.targetUrl,
    stages: [...(report.stages || []), { at: new Date().toISOString(), ...stageDetail }],
    artifacts: artifacts
      ? [...(report.artifacts || []), ...artifacts]
      : report.artifacts || [],
  };
}

async function downloadAiSupportFileForSession(session, terminalReason) {
  if (!session?.settings?.downloadAiSupportFile || session.aiSupportReport?.reportedAt) return;
  try {
    const executionHistory = session.executionHistoryKey
      ? await getMonitoringExecutionHistory()
      : {};
    const report = {
      ...(session.aiSupportReport || createAiSupportReport(session)),
      ...(session.executionHistoryKey && executionHistory[session.executionHistoryKey]
        ? { execution: executionHistory[session.executionHistoryKey] }
        : {}),
      terminalReason,
      completedAt: new Date().toISOString(),
    };
    const siteName = extractSiteNameFromUrl(report.targetUrl || session.settings.targetUrl || "");
    const filename = buildAiSupportFilename(report, siteName);
    const { downloadId } = await FileSave.download({
      filename,
      textContent: generateAiSupportFileContent(report),
      mimeType: "text/markdown;charset=utf-8",
    });
    const sessions = await getSingleMonitoringSessions();
    if (sessions[session.id]) {
      sessions[session.id] = {
        ...sessions[session.id],
        aiSupportReport: { ...report, reportedAt: new Date().toISOString(), reportFilename: filename, reportDownloadId: downloadId },
      };
      await saveSingleMonitoringSessions(sessions);
    }
    bgLogInfo(`📋 AI判断サポートファイル保存完了: ${filename}`, { sessionId: session.id, downloadId });
  } catch (error) {
    bgLogError("❌ AI判断サポートファイル生成エラー:", error);
  }
}

// 複数URL B/C のセッションは singleMonitoringSessions とは別ストアで管理するため、
// 終端レポートもここで直接保存する。設定は開始時の session.settings に固定される。
async function downloadAiSupportFileForMultiSiteSession(session, terminalReason) {
  if (!session?.settings?.downloadAiSupportFile) return;
  try {
    const executionHistory = session.executionHistoryKey
      ? await getMonitoringExecutionHistory()
      : {};
    const report = {
      ...createAiSupportTerminalReport(session, terminalReason),
      ...(session.executionHistoryKey && executionHistory[session.executionHistoryKey]
        ? { execution: executionHistory[session.executionHistoryKey] }
        : {}),
      terminalReason,
      completedAt: new Date().toISOString(),
    };
    const siteName = extractSiteNameFromUrl(report.targetUrl || session.targetUrl || "");
    const filename = buildAiSupportFilename(report, siteName);
    const { downloadId } = await FileSave.download({
      filename,
      textContent: generateAiSupportFileContent(report),
      mimeType: "text/markdown;charset=utf-8",
    });
    bgLogInfo(`📋 [${session.siteId || "multi-site"}][${session.trigger || "scheduled"}] AI判断サポートファイル保存完了: ${filename}`, {
      sessionId: session.id,
      downloadId,
    });
  } catch (error) {
    bgLogError(`❌ [${session?.siteId || "multi-site"}] AI判断サポートファイル生成エラー:`, error);
  }
}

/**
 * URLからサイト名を抽出する
 * @param {string} url - URL
 * @returns {string} サイト名（ホスト名ベース）
 */
function extractSiteNameFromUrl(url) {
  if (!url) return 'unknown';
  try {
    const urlObj = new URL(url);
    // ホスト名からwww.を除去し、ドメイン部分を返す
    return urlObj.hostname.replace(/^www\./, '').split('.')[0] || 'unknown';
  } catch {
    return 'unknown';
  }
}

function isMultipleTestRequestId(requestId) {
  return (
    typeof requestId === "string" &&
    (requestId.startsWith("testMultiple_") ||
      requestId.startsWith("bgTestMultiple_"))
  );
}

function extractMultipleTestRequestIdFromMessage(message) {
  if (typeof message !== "string") {
    return "";
  }

  const match = message.match(/\[((?:testMultiple_|bgTestMultiple_)[^\]]+)\]/);
  return match ? match[1] : "";
}

function extractConfigNameFromBgMessage(message) {
  if (typeof message !== "string") {
    return "";
  }

  const match = message.match(/\[([^\]:]+)\]/);
  return match ? match[1] : "";
}

function findBgLogObjectArg(args = []) {
  return args.find((arg) => arg && typeof arg === "object" && !Array.isArray(arg));
}

function resolveBgLogTabId(args = []) {
  const objectArg = findBgLogObjectArg(args);
  return typeof objectArg?.tabId === "number" ? objectArg.tabId : null;
}

function resolveBgLogRequestId(args = []) {
  const objectArg = findBgLogObjectArg(args);
  return typeof objectArg?.requestId === "string" ? objectArg.requestId : "";
}

function resolveBgLogDecision(args = []) {
  const objectArg = findBgLogObjectArg(args);
  return typeof objectArg?.decision === "string" ? objectArg.decision : "";
}

function hasActiveMultipleTestConfigName(configName, activeSessions) {
  if (typeof configName !== "string" || configName.trim() === "") {
    return false;
  }

  for (const session of activeSessions.values()) {
    if (session?.configName === configName) {
      return true;
    }
  }

  return false;
}

function formatBgLogTimestamp(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const mmm = String(date.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${mmm}:`;
}

function prefixBgLogMessage(message, prefix) {
  if (typeof message !== "string") {
    return [prefix, message];
  }

  return [`${prefix} ${message}`.replace(/\n/g, `\n${prefix} `)];
}

function writeStyledBgConsole(method, style, message, ...args) {
  const writer = __bgConsole[method] || __bgConsole.log;
  const prefix = formatBgLogTimestamp();

  if (typeof message === "undefined") {
    writer(prefix);
    return;
  }

  if (typeof message !== "string") {
    writer(prefix, message, ...args);
    return;
  }

  writer(
    `%c${prefixBgLogMessage(message, prefix)[0]}`,
    style,
    ...args,
  );
}

function writeBgConsole(method, message, ...args) {
  const writer = __bgConsole[method] || __bgConsole.log;
  const prefix = formatBgLogTimestamp();

  if (typeof message === "undefined") {
    writer(prefix);
    appendToSwLogBuffer(method, "", []);
    return;
  }

  // LogHighlight でスタイル取得
  let style = null;
  if (typeof LogHighlight !== 'undefined') {
    const patterns = LogHighlight.getPatterns();
    const msgStr = String(message);
    for (const { pattern, style: s } of patterns) {
      if (pattern.test(msgStr)) {
        style = s;
        break;
      }
    }
  }

  // error メソッドの場合は強制的に赤スタイル
  if (method === 'error' && !style) {
    style = 'color: #ff4444; font-weight: bold;';
  }

  if (style) {
    writeStyledBgConsole(method, style, message, ...args);
  } else {
    writer(...prefixBgLogMessage(message, prefix), ...args);
  }
  appendToSwLogBuffer(method, message ?? "", args);
}

// MonitoringConfigManagerのインポート
importScripts("./monitoringConfigManager.js");
importScripts("./lib/stock-helpers.js");

// SheetJSライブラリの読み込み（Service Worker対応）
let sheetJSLoaded = false;
try {
  importScripts("../lib/xlsx.full.min.js");
  if (typeof XLSX !== "undefined") {
    sheetJSLoaded = true;
    // SheetJSライブラリ読み込み完了（ログ不要）
  } else {
    throw new Error("XLSXオブジェクトが定義されていません");
  }
} catch (error) {
  writeBgConsole(
    "warn",
    "⚠️ SheetJSライブラリ読み込み失敗 (background.js):",
    error.message,
  );
  writeBgConsole("warn", "📝 最小限XLSXオブジェクトを使用します");

  // 最小限XLSXオブジェクトをグローバルに定義
  self.XLSX = {
    read: (data, options = {}) => {
      writeBgConsole("log", "🔄 最小限XLSX.read実行 (background.js)");
      // CSVファイルの基本的な読み込み処理
      return createMinimalWorkbook(data);
    },
    utils: {
      sheet_to_json: (worksheet) => {
        writeBgConsole("log", "🔄 最小限XLSX.utils.sheet_to_json実行開始");
        logger.debug("🔍 ワークシート情報:", {
          worksheet: worksheet,
          keys: Object.keys(worksheet),
          hasRef: !!worksheet["!ref"],
          ref: worksheet["!ref"],
        });

        const jsonData = [];
        if (worksheet && worksheet["!ref"]) {
          try {
            // 範囲を解析
            const range = decode_range(worksheet["!ref"]);
            logger.debug("🔍 範囲情報:", range);

            // ヘッダー行を取得（1行目）
            const headers = [];
            for (let col = range.s.c; col <= range.e.c; col++) {
              const cellRef = encode_cell({ r: 0, c: col });
              const cell = worksheet[cellRef];
              headers.push(cell ? cell.v : `Column${col + 1}`);
            }
            writeBgConsole("log", "📋 ヘッダー行:", headers);

            // データ行を処理（2行目以降）
            for (let row = range.s.r + 1; row <= range.e.r; row++) {
              const rowData = {};
              for (let col = range.s.c; col <= range.e.c; col++) {
                const cellRef = encode_cell({ r: row, c: col });
                const cell = worksheet[cellRef];
                const header = headers[col - range.s.c];
                rowData[header] = cell ? cell.v : "";
              }
              jsonData.push(rowData);
            }

            writeBgConsole("log", "✅ データ抽出完了:", {
              rows: jsonData.length,
              headers: headers.length,
              sample: jsonData.slice(0, 2),
            });
          } catch (error) {
            writeBgConsole("error", "❌ データ抽出エラー:", error);
          }
        } else {
          writeBgConsole("warn", "⚠️ ワークシートに範囲情報がありません");
        }

        return jsonData;
      },
    },
  };
}

// セル参照エンコード
function encode_cell(ref) {
  const col = String.fromCharCode(65 + ref.c);
  return col + (ref.r + 1);
}

// 範囲デコード
function decode_range(ref) {
  const match = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (match) {
    return {
      s: { c: match[1].charCodeAt(0) - 65, r: parseInt(match[2]) - 1 },
      e: { c: match[3].charCodeAt(0) - 65, r: parseInt(match[4]) - 1 },
    };
  }
  return { s: { c: 0, r: 0 }, e: { c: 0, r: 0 } };
}

const DAILY_STOCK_CHECK_ALARM = "dailyStockCheck";
const DAILY_MULTIPLE_MONITORING_ALARM = "dailyMultipleMonitoring";
const DAILY_SINGLE_KEYWORD_MONITORING_ALARM = "dailySingleKeywordMonitoring";
const STOCK_WATCH_TICK_ALARM = "stockWatchTick";
const BASELINE_FETCH_ALARM = "baselineFetch";
const STOCK_SNAPSHOT_STORAGE_KEY = "scheduledStockSnapshots";
const STOCK_LOG_STORAGE_KEY = "scheduledStockLogs";
const STOCK_WATCH_SESSION_KEY = "scheduledStockWatchSession";
const MULTI_SITE_SESSIONS_KEY = "scheduledWatchSessions";
const SCHEDULED_WATCH_TEST_SESSION_KEY = "scheduledWatchTestSession";
const SCHEDULED_WATCH_TEST_STATUS_KEY = "scheduledWatchTestStatus";
const SCHEDULED_WATCH_TEST_ALARM = "scheduledWatchTestTick";
const SCHEDULED_WATCH_RESYNC_RESULT_SESSION_KEY = "scheduledWatchResyncResult";
const SCHEDULED_WATCH_EXECUTION_RESULTS_SESSION_KEY = "scheduledWatchExecutionResults";
// popup に表示する、対象ごとの実行中または直近1実行の履歴。
// popup を閉じても確認できるよう local に保存する。
const MONITORING_EXECUTION_HISTORY_KEY = "monitoringExecutionHistory";
const LOG_LEVEL_STORAGE_KEY = "serviceWorkerLogLevel";
const GMAIL_NOTIFICATION_SETTINGS_KEY = "gmailNotificationSettings";
const GMAIL_NOTIFICATION_LAST_RESULT_KEY = "gmailNotificationLastResult";
const GMAIL_NOTIFICATION_TEST_VERIFICATION_KEY = "gmailNotificationTestVerification";
const MULTIPLE_GMAIL_TEST_STATUS_STORAGE_KEY = "multipleGmailTestStatus";
const GMAIL_SEND_ENDPOINT = "https://www.googleapis.com/gmail/v1/users/me/messages/send";
const SCHEDULED_WATCH_SITES_PATH = "src/config/scheduled-watch-sites.json";
const EC_SITES_PATH = "src/config/ec-sites.json";
const POPUP_LIST_WATCH_PREFIX = "popup-list-";
const AEON_BASELINE_DEBUG_FOREGROUND = false;

/** 同一 SW 内での監視開始の二重実行防止（storage 反映前のレース対策） */
let stockWatchStartInFlight = null;
/** 同一 SW 内での tick 二重実行防止（待機中に別 tick が検査タブを増やすのを防ぐ） */
let stockWatchTickInFlight = null;

const pageReadyLocks = new Map();
let scheduledWatchExecutionResultStorageLock = Promise.resolve();
let monitoringExecutionHistoryStorageLock = Promise.resolve();
// A/B/C の設定済み間隔による再読込だけを、DOM準備完了まで追跡する。
// contentScriptReady は再読込完了の前に届くため、tabId をキーに保持する。
const periodicReloadContexts = new Map();

function buildMonitoringExecutionHistoryKey({ scope, targetId, targetUrl }) {
  return `${scope || "unknown"}:${targetId || targetUrl || "unknown"}`;
}

function buildMonitoringExecutionRecord({ scope, targetId, targetName, targetUrl, sessionId, settings = {}, startedAt = Date.now() }) {
  const startedAtIso = new Date(startedAt).toISOString();
  return {
    historyKey: buildMonitoringExecutionHistoryKey({ scope, targetId, targetUrl }),
    runId: sessionId || `${scope || "monitor"}_${Date.now()}`,
    scope: scope || "unknown",
    targetId: targetId || "",
    targetName: targetName || targetUrl || targetId || "監視対象",
    targetUrl: targetUrl || "",
    monitoringMode: settings.monitoringMode || "scheduled",
    requestedCaptureMode: settings.captureMode === "fetch" ? "fetch" : "reload",
    effectiveCaptureMode: settings.captureMode === "fetch" ? "fetch" : "reload",
    intervalSeconds: Number(settings.interval || settings.reloadIntervalSec || 0),
    status: "running",
    startedAt: startedAtIso,
    completedAt: null,
    endReason: null,
    events: [{ at: startedAtIso, type: "started", result: "success", detail: "監視を開始しました" }],
    checks: [],
  };
}

async function updateMonitoringExecutionHistory(historyKey, updater) {
  if (!historyKey) return null;
  let updatedRecord = null;
  monitoringExecutionHistoryStorageLock = monitoringExecutionHistoryStorageLock.then(async () => {
    const stored = await chrome.storage.local.get(MONITORING_EXECUTION_HISTORY_KEY);
    const histories = stored[MONITORING_EXECUTION_HISTORY_KEY] || {};
    const current = histories[historyKey] || null;
    updatedRecord = updater(current);
    if (updatedRecord) {
      histories[historyKey] = updatedRecord;
      await chrome.storage.local.set({ [MONITORING_EXECUTION_HISTORY_KEY]: histories });
    }
  });
  await monitoringExecutionHistoryStorageLock;
  return updatedRecord;
}

async function startMonitoringExecutionHistory(details) {
  const record = buildMonitoringExecutionRecord(details);
  await updateMonitoringExecutionHistory(record.historyKey, () => record);
  return record;
}

async function appendMonitoringExecutionCheck(historyKey, check = {}) {
  const startedAt = check.startedAt || new Date().toISOString();
  return updateMonitoringExecutionHistory(historyKey, (current) => {
    if (!current) return current;
    const previous = current.checks?.at(-1);
    const startedAtMs = new Date(startedAt).getTime();
    const previousStartedAtMs = previous ? new Date(previous.startedAt).getTime() : NaN;
    const intervalMs = Number.isFinite(previousStartedAtMs)
      ? Math.max(0, startedAtMs - previousStartedAtMs)
      : null;
    return {
      ...current,
      effectiveCaptureMode: check.captureMode || current.effectiveCaptureMode,
      checks: [...(current.checks || []), {
        startedAt,
        completedAt: check.completedAt || new Date().toISOString(),
        intervalMs,
        durationMs: Number.isFinite(check.durationMs) ? check.durationMs : null,
        captureMode: check.captureMode || current.effectiveCaptureMode,
        result: check.result || "success",
        detail: check.detail || "",
      }],
    };
  });
}

function formatMonitoringExecutionIntervalForLog(intervalMs) {
  return Number.isFinite(intervalMs)
    ? `${(Math.max(0, intervalMs) / 1000).toFixed(1)}秒`
    : "初回";
}

function formatMonitoringExecutionTimeForLog(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "不明";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function buildFetchExecutionCheckLogMessage({
  systemLabel,
  targetLabel,
  executionRecord,
  configuredIntervalSeconds,
  extraLines = [],
} = {}) {
  const check = executionRecord?.checks?.at(-1);
  if (!check) return null;

  const isFailure = ["fetch_error", "error"].includes(check.result);
  const prefix = isFailure ? "⚠️" : "⏰";
  const configuredInterval = Number(configuredIntervalSeconds);
  const configuredIntervalLabel = Number.isFinite(configuredInterval) && configuredInterval > 0
    ? `${configuredInterval}秒`
    : "未設定";
  const durationLabel = Number.isFinite(check.durationMs)
    ? `${(Math.max(0, check.durationMs) / 1000).toFixed(1)}秒`
    : "未記録";
  const lines = [
    `${prefix} [Fetch実行][${systemLabel || "監視"}][${targetLabel || "対象未設定"}] 結果`,
    `  - チェック開始: ${formatMonitoringExecutionTimeForLog(check.startedAt)}`,
    `  - 実測間隔: ${formatMonitoringExecutionIntervalForLog(check.intervalMs)}（設定: ${configuredIntervalLabel}）`,
    `  - 取得所要: ${durationLabel}`,
    `  - 結果: ${check.result || "不明"}${check.detail ? `（${check.detail}）` : ""}`,
  ];
  return [...lines, ...extraLines.map((line) => `  - ${line}`)].join("\n");
}

async function appendMonitoringExecutionEvent(historyKey, event = {}) {
  return updateMonitoringExecutionHistory(historyKey, (current) => current && ({
    ...current,
    effectiveCaptureMode: event.captureMode || current.effectiveCaptureMode,
    events: [...(current.events || []), {
      at: event.at || new Date().toISOString(),
      type: event.type || "info",
      result: event.result || "success",
      detail: event.detail || "",
    }],
  }));
}

async function completeMonitoringExecutionHistory(historyKey, { reason, status, detail, captureMode } = {}) {
  return updateMonitoringExecutionHistory(historyKey, (current) => current && ({
    ...current,
    status: status || "completed",
    effectiveCaptureMode: captureMode || current.effectiveCaptureMode,
    completedAt: new Date().toISOString(),
    endReason: reason || "unknown",
    events: [...(current.events || []), {
      at: new Date().toISOString(), type: "completed", result: status || "completed", detail: detail || reason || "監視を終了しました",
    }],
  }));
}

async function getMonitoringExecutionHistory() {
  const stored = await chrome.storage.local.get(MONITORING_EXECUTION_HISTORY_KEY);
  return stored[MONITORING_EXECUTION_HISTORY_KEY] || {};
}

function normalizeGmailNotificationSettings(settings = {}) {
  return {
    enabled: settings?.enabled === true,
    recipientEmail:
      typeof settings?.recipientEmail === "string"
        ? settings.recipientEmail.trim()
        : "",
  };
}

function isValidGmailRecipientEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function encodeUtf8Base64(value) {
  const bytes = new TextEncoder().encode(String(value ?? ""));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function encodeBase64Url(value) {
  return encodeUtf8Base64(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeRfc2047Subject(subject) {
  return `=?UTF-8?B?${encodeUtf8Base64(subject)}?=`;
}

function buildGmailRawMessage({ recipientEmail, subject, body }) {
  const mime = [
    `To: ${recipientEmail}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "MIME-Version: 1.0",
    `Subject: ${encodeRfc2047Subject(subject)}`,
    "",
    body,
  ].join("\r\n");
  return encodeBase64Url(mime);
}

function resolveGmailDetectionSiteName(event = {}) {
  if (typeof event.siteName === "string" && event.siteName.trim()) {
    return event.siteName.trim();
  }
  try {
    return new URL(event.targetUrl).hostname.replace(/^www\./, "");
  } catch (_) {
    return "不明なサイト";
  }
}

function buildGmailDetectionEmail(event = {}) {
  const occurredAt = event.occurredAt || new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  const siteName = resolveGmailDetectionSiteName(event);
  if (event.type === "test") {
    return {
      subject: "[テスト] PageRecorder Gmail 通知",
      body: `PageRecorder の Gmail 通知テストです。\n\n日時: ${occurredAt}`,
    };
  }
  const isKeyword = event.type === "keyword";
  const newUrls = Array.isArray(event.newUrls) ? event.newUrls.filter(Boolean) : [];
  const shownUrls = newUrls.slice(0, 10);
  const subject = isKeyword
    ? `[PageRecorder] キーワード検知: ${siteName}`
    : `[PageRecorder] 新規商品を検知: ${siteName}`;
  const lines = [
    "PageRecorder が検知しました。",
    "",
    `日時: ${occurredAt}`,
    `検知種別: ${isKeyword ? "キーワード" : "新規商品URL"}`,
    `サイト名: ${siteName}`,
    `対象URL: ${event.targetUrl || ""}`,
  ];

  if (isKeyword) {
    lines.push(`キーワード: ${event.keyword || ""}`);
    lines.push(`検知モード: ${event.detectMode === "disappear" ? "消失" : "出現"}`);
  } else {
    lines.push(`増加件数: ${event.previousCount ?? 0}件 → ${event.currentCount ?? newUrls.length}件`);
    lines.push(`新規URL数: ${newUrls.length}件`);
    if (shownUrls.length > 0) {
      lines.push("新規URL:", ...shownUrls.map((url) => `- ${url}`));
      if (newUrls.length > shownUrls.length) lines.push(`- 他 ${newUrls.length - shownUrls.length} 件`);
    }
  }
  return { subject, body: lines.join("\n") };
}

function createGmailKeywordDetectionEvent(settings = {}, targetUrl = "", siteName = "") {
  return {
    type: "keyword",
    siteName,
    targetUrl: targetUrl || settings.targetUrl || "",
    keyword: settings.monitorKeyword || settings.keyword || "",
    detectMode: settings.detectMode || "appear",
    suppressGmailNotification: settings.suppressGmailNotification === true,
    testRunId: settings.gmailTestRunId || "",
    gmailTestConfigId: settings.gmailTestConfigId || "",
  };
}

function isMultipleGmailTestEvent(event = {}) {
  return typeof event.testRunId === "string" && event.testRunId !== "" &&
    typeof event.gmailTestConfigId === "string" && event.gmailTestConfigId !== "";
}

async function recordMultipleGmailTestOutcome(event = {}, result = {}) {
  if (!isMultipleGmailTestEvent(event)) return null;
  const stored = await chrome.storage.session.get(MULTIPLE_GMAIL_TEST_STATUS_STORAGE_KEY);
  const current = stored[MULTIPLE_GMAIL_TEST_STATUS_STORAGE_KEY];
  if (!current || current.gmailTestRunId !== event.testRunId) return null;
  const successConfigIds = Array.isArray(current.successConfigIds) ? current.successConfigIds : [];
  const expectedCount = Number(current.expectedCount) || 0;
  let next = { ...current, successConfigIds };
  if (result.status === "success") {
    if (!successConfigIds.includes(event.gmailTestConfigId)) {
      next = { ...next, successConfigIds: [...successConfigIds, event.gmailTestConfigId] };
    }
    if (next.successConfigIds.length >= expectedCount) {
      next = { ...next, status: "passed", active: false, failureReason: null, completedAt: new Date().toISOString() };
    }
  } else if (result.status !== "skipped") {
    next = {
      ...next,
      status: result.status === "auth_required" || result.status === "validation_error" ? "needs_review" : "failed",
      active: false,
      failureReason: result.message || "Gmail 検知送信に失敗しました",
      completedAt: new Date().toISOString(),
    };
  }
  await chrome.storage.session.set({ [MULTIPLE_GMAIL_TEST_STATUS_STORAGE_KEY]: next });
  return next;
}

async function finalizeGmailNotification(event, result) {
  await recordMultipleGmailTestOutcome(event, result);
  return result;
}

async function notifyGmailForKeywordDetection(settings, targetUrl, siteName) {
  return sendGmailNotification({
    source: "detection",
    event: createGmailKeywordDetectionEvent(settings, targetUrl, siteName),
  });
}

async function waitForDetectionNotification(notification, timeoutMs = 15000) {
  let timeoutId;
  try {
    return await Promise.race([
      Promise.resolve(notification)
        .then((result) => ({ timedOut: false, result }))
        .catch((error) => ({ timedOut: false, error })),
      new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function notifyGmailForNewProductDetection(session, snapshot, newUrls) {
  return sendGmailNotification({
    source: "detection",
    event: {
      type: "new_product_url",
      siteName: session?.siteName,
      targetUrl: session?.targetUrl,
      previousCount: session?.baselineCount,
      currentCount: snapshot?.count || 0,
      newUrls,
      suppressGmailNotification: session?.suppressGmailNotification === true,
      testRunId: session?.gmailTestRunId || "",
    },
  });
}

async function loadGmailNotificationSettings() {
  const stored = await chrome.storage.local.get(GMAIL_NOTIFICATION_SETTINGS_KEY);
  return normalizeGmailNotificationSettings(stored[GMAIL_NOTIFICATION_SETTINGS_KEY]);
}

async function saveGmailNotificationLastResult(result) {
  const normalized = {
    status: result.status,
    message: result.message,
    sentAt: new Date().toISOString(),
    source: result.source,
    ...(typeof result.testRunId === "string" && result.testRunId ? { testRunId: result.testRunId } : {}),
  };
  try {
    await chrome.storage.local.set({ [GMAIL_NOTIFICATION_LAST_RESULT_KEY]: normalized });
  } catch (error) {
    bgLogWarn("⚠️ Gmail 送信結果を保存できません", { source: result.source, error: error.message });
  }
  return normalized;
}

async function saveGmailNotificationTestVerification(settings = {}) {
  const normalizedSettings = normalizeGmailNotificationSettings(settings);
  const verification = {
    enabled: normalizedSettings.enabled,
    recipientEmail: normalizedSettings.recipientEmail,
    verifiedAt: new Date().toISOString(),
  };
  try {
    await chrome.storage.local.set({ [GMAIL_NOTIFICATION_TEST_VERIFICATION_KEY]: verification });
  } catch (error) {
    bgLogWarn("⚠️ Gmail テストメール確認状態を保存できません", { error: error.message });
  }
  return verification;
}

async function getGmailAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      const error = chrome.runtime.lastError;
      if (error || !token) {
        reject(new Error(error?.message || "Gmail 認証が必要です"));
        return;
      }
      resolve(token);
    });
  });
}

async function sendGmailNotification({ source = "detection", event = {}, interactive = false, settings } = {}) {
  let resolvedSettings;
  try {
    resolvedSettings = normalizeGmailNotificationSettings(settings || await loadGmailNotificationSettings());
  } catch (error) {
    bgLogWarn("⚠️ Gmail 通知設定を読み込めません", { source, error: error.message });
    return finalizeGmailNotification(event, { success: false, status: "api_error", message: "Gmail 通知設定を読み込めませんでした", source });
  }
  if (source === "detection" && (!resolvedSettings.enabled || event.suppressGmailNotification === true)) {
    return finalizeGmailNotification(event, { success: true, status: "skipped", message: "Gmail 通知は送信しませんでした" });
  }
  if (!isValidGmailRecipientEmail(resolvedSettings.recipientEmail)) {
    const result = await saveGmailNotificationLastResult({
      status: "validation_error",
      message: "送信先メールアドレスを確認してください",
      source,
      testRunId: event.testRunId,
    });
    bgLogWarn("⚠️ Gmail 通知を送信できません", { source, status: result.status });
    return finalizeGmailNotification(event, { success: false, ...result });
  }

  let token;
  try {
    token = await getGmailAuthToken(interactive);
  } catch (error) {
    const result = await saveGmailNotificationLastResult({
      status: "auth_required",
      message: "Gmail の認証が必要です。テストメール送信で認証してください。",
      source,
      testRunId: event.testRunId,
    });
    bgLogWarn("⚠️ Gmail 認証が必要です", { source, status: result.status, error: error.message });
    return finalizeGmailNotification(event, { success: false, ...result });
  }

  const email = buildGmailDetectionEmail(event);
  try {
    const response = await fetch(GMAIL_SEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: buildGmailRawMessage({ recipientEmail: resolvedSettings.recipientEmail, ...email }) }),
    });
    if (!response.ok) throw new Error(`Gmail API error: ${response.status}`);
    const result = await saveGmailNotificationLastResult({
      status: "success",
      message: "Gmail を送信しました",
      source,
      testRunId: event.testRunId,
    });
    if (source === "test") {
      await saveGmailNotificationTestVerification(resolvedSettings);
    }
    bgLogInfo("✅ Gmail 通知を送信しました", { source, status: result.status });
    return finalizeGmailNotification(event, { success: true, ...result });
  } catch (error) {
    const result = await saveGmailNotificationLastResult({
      status: "api_error",
      message: "Gmail の送信に失敗しました",
      source,
      testRunId: event.testRunId,
    });
    bgLogWarn("⚠️ Gmail 通知の送信に失敗しました", { source, status: result.status, error: error.message });
    return finalizeGmailNotification(event, { success: false, ...result });
  }
}

async function sendGmailTestEmail() {
  return sendGmailNotification({
    source: "test",
    interactive: true,
    event: { type: "test", siteName: "PageRecorder", targetUrl: "", occurredAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) },
  });
}

function isPeriodicReloadContext(context) {
  return Boolean(
    context &&
      typeof context.tabId === "number" &&
      periodicReloadContexts.get(context.tabId) === context,
  );
}

function periodicReloadPrefix(context) {
  return isPeriodicReloadContext(context) ? "[周期リロード] " : "";
}

async function suspendPeriodicReloadContext(context, callback) {
  if (!isPeriodicReloadContext(context)) return callback();

  periodicReloadContexts.delete(context.tabId);
  try {
    return await callback();
  } finally {
    if (!periodicReloadContexts.has(context.tabId)) {
      periodicReloadContexts.set(context.tabId, context);
    }
  }
}

async function runPeriodicReload(tabId, monitoringSystem, waitForReady) {
  const context = { tabId, monitoringSystem };
  periodicReloadContexts.set(tabId, context);

  try {
    bgLogProgress("🔄 [周期リロード] ページリロード開始", {
      event: "periodic-reload-start",
      scope: { tabId, monitoringSystem },
      details: { tabId, monitoringSystem },
    });
    await chrome.tabs.reload(tabId);
    await waitForTabComplete(tabId);
    await waitForReady(context);
    bgLogProgress("✅ [周期リロード] ページリロード・DOM準備完了", {
      event: "periodic-reload-ready",
      scope: { tabId, monitoringSystem },
      details: { tabId, monitoringSystem },
    });
  } finally {
    if (periodicReloadContexts.get(tabId) === context) {
      periodicReloadContexts.delete(tabId);
    }
  }
}

/** スクリーンショット取得の排他制御用ロック */
let screenshotLock = null;

/**
 * captureVisibleTab はウィンドウの前面タブしか取得できないため、
 * 対象タブの前面化から撮影完了までを全監視系で直列化する。
 */
async function captureEvidenceScreenshot(tabId) {
  while (screenshotLock) {
    await screenshotLock;
  }

  let releaseLock;
  screenshotLock = new Promise((resolve) => {
    releaseLock = resolve;
  });

  let previousActiveTabId = null;
  try {
    const targetTab = await chrome.tabs.get(tabId);
    const activeTabs = await chrome.tabs.query({
      active: true,
      windowId: targetTab.windowId,
    });
    previousActiveTabId = activeTabs[0]?.id ?? null;

    await chrome.tabs.update(tabId, { active: true });
    await waitForPageReady(tabId);

    return await chrome.tabs.captureVisibleTab(targetTab.windowId, {
      format: "png",
    });
  } finally {
    if (previousActiveTabId !== null && previousActiveTabId !== tabId) {
      try {
        await chrome.tabs.update(previousActiveTabId, { active: true });
      } catch (error) {
        logger.debug("証跡撮影後のアクティブタブ復元に失敗:", error.message);
      }
    }
    screenshotLock = null;
    releaseLock();
  }
}

async function waitForTabComplete(tabId, timeoutMs = 15000) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab?.status === "complete") {
      return;
    }
  } catch (error) {
    logger.debug("waitForTabComplete 初期状態確認に失敗:", error.message);
  }

  await new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeoutMs);
  });
}

function buildAeonProductListPageUrl(baseUrl, targetPage) {
  if (!baseUrl || typeof baseUrl !== "string") {
    return "";
  }

  const page = Number(targetPage);
  if (!Number.isInteger(page) || page <= 1) {
    return baseUrl;
  }

  try {
    const parsed = new URL(baseUrl);
    parsed.searchParams.set("psc", String(page));
    parsed.searchParams.set("gspsp", String(page));
    return parsed.href;
  } catch {
    return baseUrl;
  }
}

function summarizeSingleKeywordMatches(texts, keyword) {
  const normalizedKeyword = typeof keyword === "string" ? keyword : "";
  const normalizedTexts = Array.isArray(texts)
    ? texts.map((text) =>
        typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "",
      )
    : [];
  const matchedIndexes = normalizedTexts.reduce((indexes, text, index) => {
    if (text.includes(normalizedKeyword)) {
      indexes.push(index);
    }
    return indexes;
  }, []);

  return {
    texts: normalizedTexts,
    count: normalizedTexts.length,
    matchedIndexes,
    representativeText:
      normalizedTexts[matchedIndexes[0]] || normalizedTexts[0] || "",
  };
}

function evaluateSingleKeywordDetection(texts, keyword, detectMode = "appear") {
  const summary = summarizeSingleKeywordMatches(texts, keyword);
  const hasAnyKeyword = summary.matchedIndexes.length > 0;
  const detected =
    detectMode === "disappear"
      ? summary.count > 0 && !hasAnyKeyword
      : hasAnyKeyword;

  return {
    ...summary,
    hasAnyKeyword,
    detected,
  };
}

function resolveSingleKeywordDetectMode(detectMode = "appear") {
  return detectMode === "disappear" ? "disappear" : "appear";
}

function resolveSingleKeywordMonitoringOptions(settings = {}) {
  return {
    selector: settings.monitorSelector || settings.selector || "body",
    keyword: settings.monitorKeyword || settings.keyword || "",
    detectMode: resolveSingleKeywordDetectMode(
      settings.detectMode || settings.detectionMode || "appear",
    ),
  };
}

function resolveMultipleMonitorSharedSettings(
  config = {},
  commonSettings = {},
) {
  const targetSettings =
    config.settings && typeof config.settings === "object" ? config.settings : {};
  const sharedSettings =
    commonSettings && typeof commonSettings === "object" ? commonSettings : {};

  return {
    ...targetSettings,
    detectMode:
      sharedSettings.detectMode ??
      targetSettings.detectMode ??
      targetSettings.detectionMode ??
      config.detection_mode ??
      "appear",
    initialKeywordDetection:
      sharedSettings.initialKeywordDetection ??
      targetSettings.initialKeywordDetection ??
      config.initialKeywordDetection ??
      false,
    interval: sharedSettings.interval ?? targetSettings.interval ?? 20,
    duration: sharedSettings.duration ?? targetSettings.duration ?? 60,
    reloadWaitAfterReload:
      sharedSettings.reloadWaitAfterReload ??
      targetSettings.reloadWaitAfterReload ??
      3,
    captureMode:
      (sharedSettings.captureMode ?? targetSettings.captureMode) === "fetch"
        ? "fetch"
        : "reload",
    downloadAiSupportFile:
      sharedSettings.downloadAiSupportFile ??
      targetSettings.downloadAiSupportFile ??
      false,
  };
}

function resolveStartAllMonitoringRequestMeta(request = {}) {
  const configs = Array.isArray(request.configs) ? request.configs : [];
  const receivedAt = new Date().toISOString();
  const requestId =
    typeof request.requestId === "string" && request.requestId.trim() !== ""
      ? request.requestId
      : `bgStartAll_${receivedAt}_${configs.length}`;

  return {
    requestId,
    receivedAt,
    configCount: configs.length,
    configIds: configs.map((config, index) => config?.id || `index_${index}`),
    commonSettings: request.commonSettings || {},
  };
}

function buildPersistedConfigForStartAllMonitoring(
  currentConfig = {},
  request = {},
  receivedAt = new Date().toISOString(),
) {
  const safeCurrentConfig =
    currentConfig && typeof currentConfig === "object" ? currentConfig : {};
  const safeCommonSettings =
    request.commonSettings && typeof request.commonSettings === "object"
      ? request.commonSettings
      : safeCurrentConfig.multiple_common_settings || {};

  return {
    ...safeCurrentConfig,
    mode: "multiple",
    single_config: safeCurrentConfig.single_config || {},
    multiple_configs: Array.isArray(safeCurrentConfig.multiple_configs)
      ? safeCurrentConfig.multiple_configs
      : [],
    multiple_common_settings: safeCommonSettings,
    last_updated: receivedAt,
  };
}

function summarizeStartAllMonitoringResults(results = []) {
  const safeResults = Array.isArray(results) ? results : [];
  const successCount = safeResults.filter((result) => result.success).length;
  const failureCount = safeResults.length - successCount;

  return {
    total: safeResults.length,
    successCount,
    failureCount,
  };
}

function normalizeMultipleMonitorIntervalMs(value, fallbackSeconds = 20) {
  const intervalSeconds = Number(value);
  const safeSeconds =
    Number.isFinite(intervalSeconds) && intervalSeconds > 0
      ? intervalSeconds
      : fallbackSeconds;
  return safeSeconds * 1000;
}

function normalizeMultipleMonitorDurationSeconds(value, fallbackSeconds = 60) {
  const durationSeconds = Number(value);
  return Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds
    : fallbackSeconds;
}

async function runMultipleMonitoringStartConfigs(request, requestMeta) {
  const startResults = [];
  const isMultipleTestSession = isMultipleTestRequestId(requestMeta?.requestId);
  const monitoringOrigin = request?.monitoringOrigin === "scheduled" ? "scheduled" : "immediate";

  for (let i = 0; i < request.configs.length; i++) {
    const config = request.configs[i];
    let targetTabId = null;
    bgLogInfo(
      `🎯 [${i + 1}/${request.configs.length}] [${requestMeta.requestId}] 監視開始:`,
      config.name,
    );

    try {
      if (config.url && config.url.trim() !== "") {
        const tab = await chrome.tabs.create({
          url: config.url,
          active: false,
        });
        targetTabId = tab.id;
        bgLogInfo(`✅ [${config.name}] 新規タブ作成完了:`, targetTabId);

        await new Promise((resolve) => {
          const checkComplete = (tabId, changeInfo) => {
            if (tabId === targetTabId && changeInfo.status === "complete") {
              chrome.tabs.onUpdated.removeListener(checkComplete);
              resolve();
            }
          };
          chrome.tabs.onUpdated.addListener(checkComplete);

          setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(checkComplete);
            resolve();
          }, 5000);
        });
        bgLogInfo(`✅ [${config.name}] タブ読み込み完了待機終了:`, targetTabId);
      } else {
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!activeTab) {
          throw new Error("アクティブタブが見つかりません");
        }
        targetTabId = activeTab.id;
        bgLogInfo(`✅ [${config.name}] アクティブタブ使用:`, targetTabId);
      }

      const baseSettings = resolveMultipleMonitorSharedSettings(
        config,
        request.commonSettings,
      );
      const settings = {
        monitorType: config.url ? "url" : "tab",
        targetUrl: config.url || "",
        selector:
          baseSettings.monitorSelector ||
          baseSettings.selector ||
          config.selector ||
          "",
        keyword:
          baseSettings.monitorKeyword ||
          baseSettings.keyword ||
          config.keyword ||
          "",
        detectMode:
          baseSettings.detectMode ||
          baseSettings.detection_mode ||
          config.detection_mode ||
          "appear",
        interval: (() => {
          const finalInterval = normalizeMultipleMonitorIntervalMs(
            baseSettings.interval ?? config.interval,
          );
          bgLogInfo(
            `🔧 [${config.name}] 監視間隔設定: ${finalInterval}ms (${Math.round(
              finalInterval / 1000,
            )}秒)`,
          );
          return finalInterval;
        })(),
        duration: (() => {
          const finalDuration = normalizeMultipleMonitorDurationSeconds(
            baseSettings.duration ?? config.duration,
          );
          bgLogInfo(
            `🔧 [${config.name}] 監視時間設定: ${finalDuration}秒`,
          );
          return finalDuration;
        })(),
        initialKeywordDetection: baseSettings.initialKeywordDetection ?? false,
        downloadScreenshot:
          baseSettings.downloadScreenshot !== undefined
            ? baseSettings.downloadScreenshot
            : true,
        downloadSource:
          baseSettings.downloadSource !== undefined
            ? baseSettings.downloadSource
            : true,
        downloadSourceWithoutFooter:
          baseSettings.downloadSourceWithoutFooter || false,
        downloadAiSupportFile: baseSettings.downloadAiSupportFile === true,
        suppressGmailNotification: isMultipleTestSession && !requestMeta.gmailTestRunId,
        gmailTestRunId: requestMeta.gmailTestRunId || "",
        gmailTestConfigId: requestMeta.gmailTestRunId ? (config.id || `index_${i}`) : "",
      };

      // multiple 開始は通常・テストとも、single と同じ永続セッション基盤（二層セッション）を使用する。
      const sessionSettings = {
        monitorType: "tab",
        targetUrl: config.url || "",
        monitorSelector: settings.selector,
        monitorKeyword: settings.keyword,
        detectMode: settings.detectMode,
        monitoringMode: normalizeMonitoringMode(baseSettings.monitoringMode),
        captureMode: baseSettings.captureMode === "fetch" ? "fetch" : "reload",
        interval: Math.round(settings.interval / 1000),
        duration: settings.duration,
        initialKeywordDetection: settings.initialKeywordDetection,
        downloadScreenshot: settings.downloadScreenshot,
        downloadSource: settings.downloadSource,
        downloadSourceWithoutFooter: settings.downloadSourceWithoutFooter,
        downloadAiSupportFile: settings.downloadAiSupportFile,
        aiSupportContext: {
          requestId: requestMeta.requestId,
          configId: config.id || `index_${i}`,
          configName: config.name || "",
        },
        suppressGmailNotification: settings.suppressGmailNotification,
        notifyExternalExtension: false,
        twoTierTestBehavior: requestMeta.testOnly === "two_tier_acceptance"
          ? (config.twoTierTestBehavior || "detect_after_initial")
          : requestMeta.testOnly === "test_tab_scenario"
            ? (config.twoTierTestBehavior || "none")
            : null,
        // テスト実行だけが Gmail 送信結果を実行IDで追跡する。通常監視では空文字のまま。
        gmailTestRunId: settings.gmailTestRunId,
        gmailTestConfigId: settings.gmailTestConfigId,
      };
      const started = await startSingleMonitoring(sessionSettings, targetTabId, {
        allowTestTiming: false,
        persistConfig: false,
        monitoringScope: "multiple",
        monitoringOrigin,
        testOnly: requestMeta.testOnly || null,
        testRunId: requestMeta.testRunId || null,
      });
      startResults.push({ ...started, configId: config.id || `index_${i}`, configName: config.name });
    } catch (error) {
      bgLogError(`❌ [${config.name}] 個別監視開始失敗:`, error);
      startResults.push({
        success: false,
        name: config.name,
        error: error.message,
      });
    }
  }

  return startResults;
}

function classifySingleKeywordDetectionError(error) {
  const message = typeof error === "string" ? error.trim() : "";
  if (!message) {
    return null;
  }

  if (
    message === "Content Script応答なし" ||
    message === "Content Script未準備"
  ) {
    return {
      decision: "pending",
      reason:
        message === "Content Script応答なし"
          ? "content_script_no_response"
          : "content_script_not_ready",
    };
  }

  if (message.includes("Cloudflare")) {
    return {
      decision: "pending",
      reason: "cloudflare_pending",
    };
  }

  if (
    message.includes("ページ準備待ち") ||
    message.includes("DOM準備待機") ||
    message.includes("読み込み待ち")
  ) {
    return {
      decision: "pending",
      reason: "page_not_ready",
    };
  }

  if (message.includes("キーワード") && message.includes("未設定")) {
    return {
      decision: "error",
      reason: "keyword_missing",
    };
  }

  if (message.includes("セレクタ構文エラー")) {
    return {
      decision: "error",
      reason: "selector_syntax_error",
    };
  }

  if (
    message.includes("一致する要素が見つかりません") ||
    message.includes("セレクタが見つかりません") ||
    message === "Element not found"
  ) {
    return {
      decision: "error",
      reason: "element_not_found",
    };
  }

  return {
    decision: "error",
    reason: "runtime_error",
  };
}

function normalizeSingleKeywordDetectionResult({
  detectMode = "appear",
  keyword = "",
  hasKeyword = null,
  texts = null,
  text = "",
  fullText = "",
  selector = "",
  element = null,
  timestamp = new Date().toISOString(),
  error = null,
  reason = null,
} = {}) {
  const resolvedDetectMode = resolveSingleKeywordDetectMode(detectMode);
  const normalizedKeyword = typeof keyword === "string" ? keyword.trim() : "";
  const classifiedError = classifySingleKeywordDetectionError(
    !normalizedKeyword ? error || "キーワードが未設定です" : error,
  );

  if (classifiedError) {
    return {
      found: null,
      hasKeyword: null,
      detected: false,
      decision: classifiedError.decision,
      reason: reason || classifiedError.reason,
      text: typeof text === "string" ? text : "",
      fullText: typeof fullText === "string" ? fullText : "",
      texts: Array.isArray(texts) ? texts : [],
      matchedIndexes: [],
      count: Array.isArray(texts) ? texts.length : 0,
      selector,
      element,
      timestamp,
      error:
        !normalizedKeyword && !error ? "キーワードが未設定です" : error || null,
    };
  }

  let evaluatedDetection = null;
  if (typeof hasKeyword !== "boolean" && Array.isArray(texts)) {
    evaluatedDetection = evaluateSingleKeywordDetection(
      texts,
      normalizedKeyword,
      resolvedDetectMode,
    );
    hasKeyword = evaluatedDetection.hasAnyKeyword;
  }

  if (typeof hasKeyword !== "boolean") {
    return {
      found: null,
      hasKeyword: null,
      detected: false,
      decision: "pending",
      reason: reason || "state_unavailable",
      text: typeof text === "string" ? text : "",
      fullText: typeof fullText === "string" ? fullText : "",
      texts: Array.isArray(texts) ? texts : [],
      matchedIndexes: [],
      count: Array.isArray(texts) ? texts.length : 0,
      selector,
      element,
      timestamp,
      error: null,
    };
  }

  const decision =
    resolvedDetectMode === "disappear"
      ? hasKeyword
        ? "not_detected"
        : "detected"
      : hasKeyword
        ? "detected"
        : "not_detected";
  const normalizedTexts = evaluatedDetection?.texts || (Array.isArray(texts) ? texts : []);
  const representativeText =
    evaluatedDetection?.representativeText ||
    (typeof text === "string" ? text : "") ||
    (typeof fullText === "string" ? fullText : "") ||
    normalizedTexts[0] ||
    "";
  const resolvedFullText =
    (typeof fullText === "string" ? fullText : "") || representativeText;

  return {
    found: hasKeyword,
    hasKeyword,
    detected: decision === "detected",
    decision,
    reason:
      reason ||
      (decision === "detected" ? "matched_condition" : "condition_not_met"),
    text: representativeText,
    fullText: resolvedFullText,
    texts: normalizedTexts,
    matchedIndexes: evaluatedDetection?.matchedIndexes || [],
    count:
      evaluatedDetection?.count ||
      (Array.isArray(normalizedTexts) ? normalizedTexts.length : 0),
    selector,
    element,
    timestamp,
    error: null,
  };
}

async function focusAeonBaselineDebugTab(tabId) {
  if (!AEON_BASELINE_DEBUG_FOREGROUND) {
    return;
  }

  try {
    const tab = await chrome.tabs.update(tabId, { active: true });
    if (tab?.windowId) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  } catch (error) {
    logger.debug("AEON baseline デバッグ前面表示に失敗:", error.message);
  }
}

function isAeonProductListUrl(url) {
  if (!url || typeof url !== "string") {
    return false;
  }
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("aeonretail.com") &&
      parsed.pathname.includes("/Form/Product/ProductList.aspx")
    );
  } catch {
    return url.includes("aeonretail.com") && url.includes("ProductList.aspx");
  }
}

async function waitForAeonProductListReady(
  tabId,
  maxWaitTime = 8000,
  periodicReloadContext = null,
) {
  const lockKey = `aeon_list_${tabId}`;
  if (pageReadyLocks.has(lockKey)) {
    return await pageReadyLocks.get(lockKey);
  }

  const startTime = Date.now();
  let attempts = 0;
  const maxAttempts = Math.ceil(maxWaitTime / 500);
  const listSelector =
    'ul.product__item--container > li.product__item .product__item--name a[href*="/product/0/P-"]';

  const waitPromise = (async () => {
    try {
      logger.debug(
        `⏳ ${periodicReloadPrefix(periodicReloadContext)}ページ準備待機開始 (Tab: ${tabId}, siteId: aeon)`,
      );
      while (attempts < maxAttempts) {
        try {
          const tab = await chrome.tabs.get(tabId);
          if (tab.status !== "complete") {
            await new Promise((resolve) => setTimeout(resolve, 500));
            attempts++;
            continue;
          }

          const readyResult = await chrome.scripting.executeScript({
            target: { tabId },
            func: (selector) => {
              const bodyText = (document.body?.innerText || "").replace(
                /\s+/g,
                " ",
              );
              const productAnchors = document.querySelectorAll(selector).length;
              const hasCountText = /対象アイテム：\s*\d+\s*件/.test(bodyText);
              return {
                readyState: document.readyState,
                isReady: document.readyState === "complete",
                hasContent: Boolean(
                  document.body && document.body.children.length > 0,
                ),
                productAnchors,
                hasCountText,
              };
            },
            args: [listSelector],
          });

          const domState = readyResult[0]?.result;
          logger.debug(
            `🔍 ${periodicReloadPrefix(periodicReloadContext)}DOM状態確認 (Tab: ${tabId}, siteId: aeon, attempt: ${attempts + 1}):`,
            domState,
          );
          const listReady =
            domState?.isReady &&
            domState?.hasContent &&
            (domState.productAnchors > 0 || domState.hasCountText);

          if (listReady) {
            logger.info(
              `✅ ${periodicReloadPrefix(periodicReloadContext)}DOM準備完了 (siteId: aeon, ${Date.now() - startTime}ms)`,
            );
            return true;
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        } catch (error) {
          logger.warn(
            `⚠️ AEON一覧DOM確認エラー (attempt: ${attempts + 1}):`,
            error.message,
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        }
      }

      logger.warn(
        `⚠️ AEON一覧DOM準備待機タイムアウト (${Date.now() - startTime}ms)`,
      );
      return false;
    } finally {
      pageReadyLocks.delete(lockKey);
      logger.debug(
        `🔓 ${periodicReloadPrefix(periodicReloadContext)}DOM待機ロック解除 (Tab: ${tabId}, siteId: aeon)`,
      );
    }
  })();

  pageReadyLocks.set(lockKey, waitPromise);
  return await waitPromise;
}

/**
 * 汎用的な商品一覧ページDOM準備待機関数
 * scheduled-watch-sites.json の selectors.productLinks を使用
 */
// ========================================
// Cloudflare チャレンジ対応
// ========================================

/**
 * Cloudflareチャレンジページを検知する
 * @param {number} tabId - 対象タブID
 * @returns {Promise<{isCloudflareChallenge: boolean, indicators: object, title: string}>}
 */
async function detectCloudflareChallenge(tabId) {
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const bodyHtml = document.body?.innerHTML || "";
        const indicators = {
          // タイトルベースの検知
          titleMatch:
            document.title.includes("Just a moment") ||
            document.title.includes("Checking your browser") ||
            document.title.includes("Attention Required") ||
            document.title.includes("Security check") ||
            document.title.includes("One more step"),
          // DOM要素ベースの検知
          hasChallengeTurnstile:
            !!document.querySelector("#challenge-running") ||
            !!document.querySelector(".cf-turnstile") ||
            !!document.querySelector("#cf-wrapper") ||
            !!document.querySelector("#challenge-form") ||
            !!document.querySelector("#challenge-stage") ||
            !!document.querySelector(".challenge-running") ||
            !!document.querySelector("[data-ray]"),
          // body内容ベースの検知
          bodyHasChallenge:
            bodyHtml.includes("cf-challenge") ||
            bodyHtml.includes("Checking your browser") ||
            bodyHtml.includes("challenge-platform") ||
            bodyHtml.includes("turnstile") ||
            bodyHtml.includes("Verify you are human"),
          // URL検知（リダイレクトURL）
          urlHasChallenge:
            window.location.href.includes("/cdn-cgi/") ||
            window.location.href.includes("challenge"),
        };

        const isChallenge =
          indicators.titleMatch ||
          indicators.hasChallengeTurnstile ||
          indicators.bodyHasChallenge ||
          indicators.urlHasChallenge;

        return {
          isCloudflareChallenge: isChallenge,
          indicators,
          title: document.title,
          url: window.location.href,
        };
      },
    });
    return (
      result[0]?.result || {
        isCloudflareChallenge: false,
        indicators: {},
        title: "",
        url: "",
      }
    );
  } catch (error) {
    logger.warn("⚠️ Cloudflare検知エラー:", error.message);
    return { isCloudflareChallenge: false, indicators: {}, title: "", url: "" };
  }
}

/**
 * Cloudflareセッション（cf_clearanceクッキー）の状態を確認する
 * @param {string} domain - 対象ドメイン
 * @returns {Promise<{valid: boolean, expiresAt?: number, cookie?: object}>}
 */
async function getCloudflareSession(domain) {
  try {
    const cookies = await chrome.cookies.getAll({
      domain,
      name: "cf_clearance",
    });
    if (cookies.length > 0) {
      const cookie = cookies[0];
      const expiresAt = cookie.expirationDate * 1000;
      // 1分のマージンを持たせて有効性を判定
      if (Date.now() < expiresAt - 60000) {
        return { valid: true, expiresAt, cookie };
      }
    }
    return { valid: false };
  } catch (error) {
    logger.warn("⚠️ Cloudflareセッション確認エラー:", error.message);
    return { valid: false };
  }
}

/**
 * Cloudflare突破後のセッション情報をログに記録する
 * @param {string} domain - 対象ドメイン
 */
async function saveCloudflareSession(domain) {
  try {
    const cookies = await chrome.cookies.getAll({
      domain,
      name: "cf_clearance",
    });
    if (cookies.length > 0) {
      const cookie = cookies[0];
      const expiresAt = new Date(cookie.expirationDate * 1000);
      logger.info(
        `✅ cf_clearance取得: ${domain}, 有効期限: ${expiresAt.toISOString()}`,
      );
    } else {
      logger.warn(`⚠️ cf_clearance未取得: ${domain}`);
    }
  } catch (error) {
    logger.warn("⚠️ Cloudflareセッション保存エラー:", error.message);
  }
}

/**
 * Cloudflareチャレンジの自動解決を待機する
 * Cloudflareは通常20秒程度で自動的に解決されるため、静かに待機する
 * @param {number} tabId - 対象タブID
 * @param {string} siteId - サイトID
 * @param {object} options - オプション
 * @param {number} options.challengeWaitTime - 最大待機時間（ms）デフォルト30秒
 * @param {boolean} options.autoForeground - タブを自動でフォアグラウンド化するか
 * @returns {Promise<{success: boolean, reason?: string, waitedMs?: number}>}
 */
async function handleCloudflareChallenge(tabId, siteId, options = {}) {
  const maxWaitTime = options.challengeWaitTime || 30000; // デフォルト30秒（自動解決は約20秒）
  const checkInterval = 2000; // 2秒ごとに確認

  try {
    // タブをフォアグラウンド化（オプション、Cloudflare解決に必要な場合がある）
    if (options.autoForeground !== false) {
      try {
        const tabInfo = await chrome.tabs.get(tabId);
        await chrome.tabs.update(tabId, { active: true });
        await chrome.windows.update(tabInfo.windowId, {
          focused: true,
        });
      } catch (tabError) {
        logger.warn(
          `⚠️ [${siteId}] タブフォアグラウンド化失敗:`,
          tabError.message,
        );
      }
    }

    logger.info(
      `🛡️ [${siteId}] Cloudflareチャレンジ検出、自動解決を待機中 (最大${maxWaitTime / 1000}秒)`,
    );

    // 自動解決を待機
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));

      // タブが閉じられていないか確認
      try {
        await chrome.tabs.get(tabId);
      } catch {
        logger.warn(`⚠️ [${siteId}] チャレンジ待機中にタブが閉じられました`);
        return {
          success: false,
          reason: "tab_closed",
          waitedMs: Date.now() - startTime,
        };
      }

      // チャレンジ通過チェック
      const checkResult = await detectCloudflareChallenge(tabId);
      const elapsed = Date.now() - startTime;

      if (!checkResult.isCloudflareChallenge) {
        // 通過成功
        logger.info(
          `✅ [${siteId}] Cloudflareチャレンジ自動解決 (${elapsed}ms)`,
        );

        // セッション情報を保存
        try {
          const tab = await chrome.tabs.get(tabId);
          const url = new URL(tab.url);
          await saveCloudflareSession(url.hostname);
        } catch (e) {
          logger.warn("⚠️ セッション保存でエラー:", e.message);
        }

        return { success: true, waitedMs: elapsed };
      }

      // 待機中のログ（5秒ごと）
      if (elapsed % 5000 < checkInterval) {
        logger.info(
          `⏳ [${siteId}] Cloudflare解決待機中... (${Math.round(elapsed / 1000)}秒経過)`,
        );
      }
    }

    // タイムアウト
    const waitedMs = Date.now() - startTime;
    logger.warn(
      `⚠️ [${siteId}] Cloudflareチャレンジ待機タイムアウト (${waitedMs}ms)`,
    );

    return { success: false, reason: "timeout", waitedMs };
  } catch (error) {
    logger.error(
      `❌ [${siteId}] Cloudflareチャレンジ処理エラー:`,
      error.message,
    );
    return { success: false, reason: "error", error: error.message };
  }
}

async function waitForProductListReady(
  tabId,
  productSelector,
  siteId,
  maxWaitTime = 8000,
  cloudflareConfig = {},
  readyOptions = {},
  periodicReloadContext = null,
) {
  const lockKey = `product_list_${siteId}_${tabId}`;
  if (pageReadyLocks.has(lockKey)) {
    return await pageReadyLocks.get(lockKey);
  }

  const startTime = Date.now();
  let attempts = 0;
  const maxAttempts = Math.ceil(maxWaitTime / 500);
  let cloudflareHandled = false; // Cloudflare対応済みフラグ

  const waitPromise = (async () => {
    try {
      logger.debug(
        `⏳ ${periodicReloadPrefix(periodicReloadContext)}ページ準備待機開始 (Tab: ${tabId}, siteId: ${siteId})`,
      );
      while (attempts < maxAttempts) {
        try {
          const tab = await chrome.tabs.get(tabId);
          if (tab.status !== "complete") {
            await new Promise((resolve) => setTimeout(resolve, 500));
            attempts++;
            continue;
          }

          const readyResult = await chrome.scripting.executeScript({
            target: { tabId },
            func: (selector, itemCountSelector) => {
              const parseCountText = (text) => {
                const match = String(text || "")
                  .replace(/,/g, "")
                  .match(/\d+/);
                return match ? parseInt(match[0], 10) : NaN;
              };
              const productCount = document.querySelectorAll(selector).length;
              const itemCountEl = itemCountSelector
                ? document.querySelector(itemCountSelector)
                : null;
              const itemCount = itemCountEl
                ? parseCountText(itemCountEl.textContent)
                : NaN;
              const pagerRootExists = Boolean(
                document.querySelector(".product__pager"),
              );
              const pagerItems = document.querySelectorAll(
                ".product__pager .product__pager--pageitem a",
              ).length;
              const currentPage =
                document
                  .querySelector(
                    ".product__pager .product__pager--currentpage a",
                  )
                  ?.textContent?.trim() || "";
              return {
                readyState: document.readyState,
                isReady: document.readyState === "complete",
                hasContent: Boolean(
                  document.body && document.body.children.length > 0,
                ),
                productCount,
                itemCount,
                pagerRootExists,
                pagerItems,
                currentPage,
              };
            },
            args: [productSelector, readyOptions.itemCountSelector || ""],
          });

          const domState = readyResult[0]?.result;
          logger.debug(
            `🔍 ${periodicReloadPrefix(periodicReloadContext)}DOM状態確認 (Tab: ${tabId}, siteId: ${siteId}, attempt: ${attempts + 1}):`,
            domState,
          );
          const baseReady =
            domState?.isReady &&
            domState?.hasContent &&
            domState.productCount > 0;
          const shouldRequirePager =
            readyOptions.requirePagerWhenCountExceedsProducts &&
            Number.isFinite(domState?.itemCount) &&
            domState.itemCount > domState.productCount;
          const listReady =
            baseReady && (!shouldRequirePager || domState.pagerItems > 0);

          if (listReady) {
            logger.info(
              `✅ ${periodicReloadPrefix(periodicReloadContext)}DOM準備完了 (siteId: ${siteId}, ${Date.now() - startTime}ms, ${domState.productCount}件)`,
              {
                productCount: domState.productCount,
                itemCount: Number.isFinite(domState.itemCount)
                  ? domState.itemCount
                  : null,
                pagerRootExists: domState.pagerRootExists,
                pagerItems: domState.pagerItems,
                currentPage: domState.currentPage || null,
                requirePager: Boolean(shouldRequirePager),
              },
            );
            return true;
          }

          if (baseReady && shouldRequirePager && attempts % 4 === 0) {
            logger.info(`⏳ [${siteId}] 一覧DOM追加待機中`, {
              productCount: domState.productCount,
              itemCount: domState.itemCount,
              pagerRootExists: domState.pagerRootExists,
              pagerItems: domState.pagerItems,
              currentPage: domState.currentPage || null,
            });
          }

          // === 早期Cloudflareチャレンジ検知（最初の5回は毎回チェック） ===
          if (cloudflareConfig.enabled && !cloudflareHandled && attempts < 5) {
            const cfCheck = await detectCloudflareChallenge(tabId);
            logger.info(
              `🔍 [${siteId}] Cloudflare検知 (attempt: ${attempts + 1}, productCount: ${domState?.productCount || 0}, title: "${cfCheck.title}", isChallenge: ${cfCheck.isCloudflareChallenge}, indicators: ${JSON.stringify(cfCheck.indicators)})`,
            );

            if (cfCheck?.isCloudflareChallenge) {
              logger.warn(
                `🛡️ [${siteId}] Cloudflareチャレンジを検出 (title: ${cfCheck.title})`,
              );

              const challengeResult = await handleCloudflareChallenge(
                tabId,
                siteId,
                {
                  challengeWaitTime:
                    cloudflareConfig.challengeWaitTime || 30000,
                  autoForeground: cloudflareConfig.autoForeground !== false,
                },
              );

              if (challengeResult.success) {
                // 突破成功 - ページをリロードして再試行
                cloudflareHandled = true;
                logger.info(
                  `🔄 [${siteId}] Cloudflare突破後、ページをリロード`,
                );
                await suspendPeriodicReloadContext(periodicReloadContext, async () => {
                  await chrome.tabs.reload(tabId);
                  await waitForTabComplete(tabId);
                });
                attempts = 0; // リトライカウンタをリセット
                continue;
              } else {
                // 突破失敗
                logger.warn(
                  `⚠️ [${siteId}] Cloudflareチャレンジ突破失敗: ${challengeResult.reason}`,
                );
                return false;
              }
            }
          }
          // === 通常のCloudflare検知（productCount === 0 かつ早期検知期間後） ===
          else if (
            cloudflareConfig.enabled &&
            !cloudflareHandled &&
            attempts >= 5 &&
            domState?.productCount === 0
          ) {
            const cfCheck = await detectCloudflareChallenge(tabId);
            // 5秒ごとにログ出力
            if (attempts % 10 === 0) {
              logger.info(
                `🔍 [${siteId}] Cloudflare継続検知 (attempt: ${attempts + 1}, title: "${cfCheck.title}", isChallenge: ${cfCheck.isCloudflareChallenge})`,
              );
            }
            if (cfCheck?.isCloudflareChallenge) {
              logger.warn(
                `🛡️ [${siteId}] Cloudflareチャレンジを検出 (title: ${cfCheck.title})`,
              );

              const challengeResult = await handleCloudflareChallenge(
                tabId,
                siteId,
                {
                  challengeWaitTime:
                    cloudflareConfig.challengeWaitTime || 30000,
                  autoForeground: cloudflareConfig.autoForeground !== false,
                },
              );

              if (challengeResult.success) {
                cloudflareHandled = true;
                logger.info(
                  `🔄 [${siteId}] Cloudflare突破後、ページをリロード`,
                );
                await suspendPeriodicReloadContext(periodicReloadContext, async () => {
                  await chrome.tabs.reload(tabId);
                  await waitForTabComplete(tabId);
                });
                attempts = 0;
                continue;
              } else {
                logger.warn(
                  `⚠️ [${siteId}] Cloudflareチャレンジ突破失敗: ${challengeResult.reason}`,
                );
                return false;
              }
            }
          }
          // === ここまで ===

          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        } catch (error) {
          logger.warn(
            `⚠️ [${siteId}] DOM確認エラー (attempt: ${attempts + 1}):`,
            error.message,
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        }
      }

      // === タイムアウト前の最終Cloudflare検知 ===
      if (cloudflareConfig.enabled && !cloudflareHandled) {
        logger.info(
          `🔍 [${siteId}] タイムアウト前の最終Cloudflare検知チェック`,
        );
        try {
          const cfCheck = await detectCloudflareChallenge(tabId);
          if (cfCheck?.isCloudflareChallenge) {
            logger.warn(
              `🛡️ [${siteId}] タイムアウト時にCloudflareチャレンジを検出 (title: ${cfCheck.title})`,
            );

            const challengeResult = await handleCloudflareChallenge(
              tabId,
              siteId,
              {
                challengeWaitTime: cloudflareConfig.challengeWaitTime || 30000,
                autoForeground: cloudflareConfig.autoForeground !== false,
              },
            );

            if (challengeResult.success) {
              logger.info(`🔄 [${siteId}] Cloudflare突破後、ページをリロード`);
              await suspendPeriodicReloadContext(periodicReloadContext, async () => {
                await chrome.tabs.reload(tabId);
                await waitForTabComplete(tabId);
              });

              // 再度DOM確認を試みる（簡易版）
              const retryResult = await chrome.scripting.executeScript({
                target: { tabId },
                func: (selector) => document.querySelectorAll(selector).length,
                args: [productSelector],
              });
              const retryCount = retryResult[0]?.result || 0;
              if (retryCount > 0) {
                logger.info(
                  `✅ [${siteId}] Cloudflare突破後、一覧DOM準備完了 (${retryCount}件)`,
                );
                return true;
              }
            } else {
              logger.warn(
                `⚠️ [${siteId}] Cloudflareチャレンジ突破失敗: ${challengeResult.reason}`,
              );
            }
          }
        } catch (e) {
          logger.warn(`⚠️ [${siteId}] 最終Cloudflare検知エラー:`, e.message);
        }
      }
      // === ここまで ===

      logger.warn(
        `⚠️ [${siteId}] 一覧DOM準備待機タイムアウト (${Date.now() - startTime}ms)`,
      );
      return false;
    } finally {
      pageReadyLocks.delete(lockKey);
      logger.debug(
        `🔓 ${periodicReloadPrefix(periodicReloadContext)}DOM待機ロック解除 (Tab: ${tabId}, siteId: ${siteId})`,
      );
    }
  })();

  pageReadyLocks.set(lockKey, waitPromise);
  return await waitPromise;
}

async function waitForScheduledWatchPageReady(
  tabId,
  targetUrl,
  periodicReloadContext = null,
  settings = null,
) {
  // 安全テストではページ自体の準備だけを確認し、商品セレクタの0件は
  // snapshot後に「要確認」として判定する。
  if (settings) {
    const pageReadyTimeoutMs = Number(settings.pageReadyTimeoutMs);
    return waitForPageReady(tabId, {
      periodicReloadContext,
      ...(Number.isFinite(pageReadyTimeoutMs) && pageReadyTimeoutMs > 0
        ? { maxWaitTime: pageReadyTimeoutMs }
        : {}),
    });
  }

  // scheduled-watch-sites.json から設定を取得
  const sites = await loadScheduledWatchSites();
  const site = sites.find((s) => {
    if (!s.enabled || !s.url) return false;
    try {
      const siteHostname = new URL(s.url).hostname;
      return targetUrl.includes(siteHostname);
    } catch {
      return false;
    }
  });

  if (site && site.selectors?.productLinks) {
    // サイト設定のセレクタを使用した汎用待機
    // Cloudflare対策設定があれば渡す
    const cloudflareConfig = site.cloudflareProtection || {};
    // Cloudflare保護が有効な場合は長いタイムアウトを使用（デフォルト30秒）
    // それ以外は通常タイムアウト（8秒）
    const defaultTimeout = cloudflareConfig.enabled ? 30000 : 8000;
    const domWaitTimeout = site.domWaitTimeout || defaultTimeout;
    return waitForProductListReady(
      tabId,
      site.selectors.productLinks,
      site.id,
      domWaitTimeout,
      cloudflareConfig,
      {},
      periodicReloadContext,
    );
  }

  // AEON専用判定（後方互換性）
  if (isAeonProductListUrl(targetUrl)) {
    return waitForAeonProductListReady(tabId, 8000, periodicReloadContext);
  }

  return waitForPageReady(tabId, { periodicReloadContext });
}

function normalizeWatchTargetUrl(url) {
  if (!url || typeof url !== "string") {
    return "";
  }
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}${parsed.search}`.replace(
      /\/$/,
      "",
    );
  } catch {
    return url.split("#")[0].replace(/\/$/, "");
  }
}

function tabMatchesWatchTarget(tab, targetUrl) {
  const key = normalizeWatchTargetUrl(targetUrl);
  if (!key) {
    return false;
  }
  const candidates = [tab.url, tab.pendingUrl].filter(Boolean);
  return candidates.some(
    (candidate) => normalizeWatchTargetUrl(candidate) === key,
  );
}

/**
 * 監視対象一覧 URL のタブを1枚にそろえる（既存があれば再利用、重複は閉じる）
 */
async function ensureScheduledWatchInspectionTab(targetUrl) {
  const allTabs = await chrome.tabs.query({});
  const matching = allTabs.filter((tab) =>
    tabMatchesWatchTarget(tab, targetUrl),
  );

  if (matching.length > 0) {
    const keep = matching[0];
    for (let i = 1; i < matching.length; i++) {
      try {
        await chrome.tabs.remove(matching[i].id);
        logger.warn("⏰ 重複した監視一覧タブをクローズしました", {
          tabId: matching[i].id,
        });
      } catch (closeError) {
        logger.warn("重複監視タブのクローズに失敗:", closeError.message);
      }
    }
    return keep;
  }

  return chrome.tabs.create({ url: targetUrl, active: false });
}

async function closeDuplicateWatchTabs(targetUrl, keepTabId) {
  const allTabs = await chrome.tabs.query({});
  for (const tab of allTabs) {
    if (tab.id === keepTabId || !tabMatchesWatchTarget(tab, targetUrl)) {
      continue;
    }
    try {
      await chrome.tabs.remove(tab.id);
      logger.warn("⏰ 重複した監視一覧タブをクローズしました", {
        tabId: tab.id,
      });
    } catch (closeError) {
      logger.warn("重複監視タブのクローズに失敗:", closeError.message);
    }
  }
}

async function scheduleStockWatchTick(delaySec) {
  const delayMs = Math.max(1000, Number(delaySec) * 1000);
  await chrome.alarms.create(STOCK_WATCH_TICK_ALARM, {
    when: Date.now() + delayMs,
  });
}

async function clearStockWatchAlarms() {
  await chrome.alarms.clear(DAILY_STOCK_CHECK_ALARM);
  await chrome.alarms.clear(STOCK_WATCH_TICK_ALARM);
}

/**
 * scheduled-watch-sites.json を読み込んで設定を取得
 * @returns {Promise<Array>} サイト設定の配列（エラー時は空配列）
 */
async function loadScheduledWatchSites() {
  try {
    const url = chrome.runtime.getURL(SCHEDULED_WATCH_SITES_PATH);
    const response = await fetch(url);
    if (!response.ok) {
      logger.warn(
        "定時監視サイト設定ファイルが見つかりません:",
        response.status,
      );
      return [];
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.sites)) {
      logger.warn("定時監視サイト設定の形式が不正です");
      return [];
    }
    // オーバーライド設定をマージ
    const overrides = await loadScheduledWatchOverrides();
    const staticSites = data.sites.map((site) => {
      const siteOverride = overrides[site.id];
      if (siteOverride && siteOverride.fetchMode) {
        return {
          ...site,
          fetchMode: {
            ...site.fetchMode,
            ...siteOverride.fetchMode,
          },
        };
      }
      return site;
    });
    return [...staticSites, ...(await loadPopupListWatchSites())];
  } catch (error) {
    logger.warn("定時監視サイト設定の読み込みエラー:", error.message);
    return [];
  }
}

/** popup 登録の検索結果・一覧ページ監視を、Cと同じ安全な定時実行形式へ解決する。 */
async function loadPopupListWatchSites() {
  return (await resolvePopupListWatchSites()).sites;
}

/** popup 登録の一覧監視対象を、実行可能なサイト設定と設定エラーに分けて解決する。 */
async function resolvePopupListWatchSites() {
  try {
    const [config, response, scheduledResponse] = await Promise.all([
      configManager.loadConfig(),
      fetch(chrome.runtime.getURL(EC_SITES_PATH)),
      fetch(chrome.runtime.getURL(SCHEDULED_WATCH_SITES_PATH)),
    ]);
    if (!response.ok) {
      return { sites: [], errors: [{ id: '', name: '一覧監視設定', reason: 'サイト設定を読み込めませんでした。' }] };
    }
    const ecData = await response.json();
    const ecSites = Array.isArray(ecData?.sites) ? ecData.sites : [];
    const scheduledData = scheduledResponse.ok ? await scheduledResponse.json() : {};
    const scheduledSites = Array.isArray(scheduledData?.sites) ? scheduledData.sites : [];
    const common = config?.multiple_list_watch_common_settings || {};
    const targets = Array.isArray(config?.multiple_list_watch_configs)
      ? config.multiple_list_watch_configs : [];
    const sites = [];
    const errors = [];
    for (const target of targets) {
      const addError = (reason) => {
        errors.push({
          id: target?.id || '',
          name: target?.name || '名前なし',
          reason,
        });
      };
      const site = ecSites.find((item) => item.id === target?.siteId);
      const scheduledProfiles = scheduledSites
        .filter((item) => item?.source?.kind === "buy-target" &&
          item?.notification?.siteId === site?.id &&
          typeof item?.id === "string" && item.id.trim() &&
          typeof item?.url === "string" && item.url.trim() &&
          typeof item?.selectors?.productLinks === "string" && item.selectors.productLinks.trim())
        .map((item) => ({
          id: item.id,
          name: item.name || item.id,
          url: item.url,
          productSelector: item.selectors.productLinks,
        }));
      const profiles = scheduledProfiles.length > 0
        ? scheduledProfiles
        : Array.isArray(site?.scheduledWatchProfiles) ? site.scheduledWatchProfiles : [];
      const profile = profiles.find((item) => item.id === target?.profileId);
      if (!target?.id) {
        addError('監視対象IDが未設定です。対象を編集して保存してください。');
        continue;
      }
      if (!site) {
        addError('選択したサイト設定が見つかりません。対象を編集してサイトを選び直してください。');
        continue;
      }
      if (!profile) {
        addError('選択した検証済みプロファイルが見つかりません。対象を編集してプロファイルを選び直してください。');
        continue;
      }
      if (!profile.productSelector) {
        addError('選択したプロファイルに商品取得セレクタがありません。プロファイルを見直してください。');
        continue;
      }
      if (!target.url) {
        addError('検索結果・一覧ページURLが未設定です。対象を編集してURLを入力してください。');
        continue;
      }
      try {
        const targetHost = new URL(target.url).hostname.replace(/^www\./, "");
        const profileHost = new URL(profile.url).hostname.replace(/^www\./, "");
        if (targetHost !== profileHost) {
          addError('検索結果・一覧ページURLのホストが選択したプロファイルと一致しません。対象を編集してください。');
          continue;
        }
      } catch {
        addError('検索結果・一覧ページURLまたはプロファイルURLが不正です。対象を編集してください。');
        continue;
      }
      sites.push({
        id: `${POPUP_LIST_WATCH_PREFIX}${target.id}`,
        targetId: target.id,
        name: target.name || `${site.name || site.id} ${profile.name || profile.id}`,
        url: target.url,
        enabled: target.enabled === true,
        source: "popup-list-watch",
        selectors: { productLinks: profile.productSelector, itemCount: null },
        schedules: [{
          startTime: target.startTime || "11:57",
          endTime: target.endTime || "12:05",
          intervalSeconds: Number(target.intervalSeconds) || 30,
        }],
        notification: {
          openProductUrl: common.openProductUrl === true,
          notifyOtherExtensions: common.notifyExternalExtension === true,
          externalExtensionId: common.externalExtensionId || null,
          downloadAiSupportFile: common.downloadAiSupportFile === true,
          siteId: target.siteId,
        },
        fetchMode: { enabled: false, fallbackToDom: true },
      });
    }
    return { sites, errors };
  } catch (error) {
    logger.warn("popup一覧監視設定の解決に失敗:", error.message);
    return { sites: [], errors: [{ id: '', name: '一覧監視設定', reason: `設定の読み込みに失敗しました: ${error.message}` }] };
  }
}

/**
 * オーバーライド設定を storage.local から読み込む
 * @returns {Promise<Object>} サイトIDをキーとしたオーバーライド設定
 */
async function loadScheduledWatchOverrides() {
  try {
    const result = await chrome.storage.local.get("scheduledWatchOverrides");
    return result.scheduledWatchOverrides || {};
  } catch (error) {
    logger.warn("オーバーライド設定の読み込みエラー:", error.message);
    return {};
  }
}

/**
 * オーバーライド設定を storage.local に保存
 * @param {Object} overrides - サイトIDをキーとしたオーバーライド設定
 */
async function saveScheduledWatchOverrides(overrides) {
  try {
    await chrome.storage.local.set({ scheduledWatchOverrides: overrides });
    logger.info("オーバーライド設定を保存しました");
  } catch (error) {
    logger.error("オーバーライド設定の保存エラー:", error.message);
    throw error;
  }
}

/**
 * 特定サイトの fetchMode オーバーライドを更新
 * @param {string} siteId - サイトID
 * @param {Object} fetchModeUpdate - 更新する fetchMode の内容
 */
async function updateSiteFetchModeOverride(siteId, fetchModeUpdate) {
  const overrides = await loadScheduledWatchOverrides();
  if (!overrides[siteId]) {
    overrides[siteId] = {};
  }
  overrides[siteId].fetchMode = {
    ...overrides[siteId].fetchMode,
    ...fetchModeUpdate,
  };
  await saveScheduledWatchOverrides(overrides);
  logger.info(`サイト ${siteId} の fetchMode オーバーライドを更新しました`);
}

async function updateScheduledWatchCaptureMode(siteId, captureMode) {
  const sites = await loadScheduledWatchSites();
  const site = sites.find((item) => item.id === siteId);
  if (!site) throw new Error("サイトIDが不正です");
  if (!["fetch", "reload"].includes(captureMode)) {
    throw new Error("取得方式が不正です");
  }
  await updateSiteFetchModeOverride(siteId, {
    enabled: captureMode === "fetch",
    fallbackToDom: true,
  });
  return { siteId, siteName: site.name, captureMode };
}

/**
 * Fetch方式でスケジュール監視のスナップショットを取得
 * タブを開かずにHTMLを取得し、offscreenで解析する
 * @param {string} url - 監視対象URL
 * @param {Object} settings - サイト設定
 * @returns {Promise<Object|null>} スナップショット（DOM監視と同形式）
 */
async function captureScheduledSnapshotViaFetch(url, settings) {
  const monitorSelector = settings.selectors?.productLinks || "";
  if (!monitorSelector) {
    logger.warn("Fetch監視: productLinks セレクタが未設定");
    return null;
  }

  try {
    // HTMLをFetchで取得
    const response = await fetch(url, {
      method: "GET",
      credentials: "omit",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      logger.warn(`Fetch監視: HTTPエラー ${response.status} (${url})`);
      return {
        fetchMode: true,
        fetchStatus: response.status,
        fetchError: `HTTP ${response.status}`,
        href: url,
        count: 0,
        urls: [],
      };
    }

    const html = await response.text();

    // offscreenでURL抽出
    await ensureOffscreenDocument();
    const extractionResult = await chrome.runtime.sendMessage({
      target: "offscreen",
      type: "OFFSCREEN_EXTRACT_PRODUCT_URLS",
      payload: {
        html,
        selector: monitorSelector,
        baseUrl: url,
      },
    });

    if (!extractionResult?.success) {
      logger.warn("Fetch監視: URL抽出失敗", extractionResult?.error);
      return {
        fetchMode: true,
        fetchStatus: response.status,
        fetchError: extractionResult?.error || "URL extraction failed",
        href: url,
        count: 0,
        urls: [],
      };
    }

    const extraction = extractionResult.extraction;
    logger.info("Fetch監視: スナップショット取得成功", {
      url,
      urlCount: extraction.count,
      usedSelector: extraction.usedSelector,
    });

    return {
      href: url,
      title: "",
      count: extraction.count,
      matchedCount: extraction.count,
      usedSelector: extraction.usedSelector,
      urls: extraction.urls,
      textPreview: "",
      fetchMode: true,
      fetchStatus: response.status,
    };
  } catch (error) {
    logger.error("Fetch監視: 取得エラー", error.message);
    return {
      fetchMode: true,
      fetchError: error.message,
      href: url,
      count: 0,
      urls: [],
    };
  }
}

/**
 * 複数サイト監視のアラームを設定
 */
async function syncMultiSiteScheduledCheck() {
  const sites = await loadScheduledWatchSites();
  const enabledSites = sites.filter((site) => site.enabled);

  // JSON から削除・無効化されたサイトの通常開始アラームを残さない。
  // 実行中 session の tick はここで止めず、通常の終了処理へ委ねる。
  const existingAlarms = await chrome.alarms.getAll();
  await Promise.all(
    existingAlarms
      .filter((alarm) =>
        alarm.name.startsWith(`${BASELINE_FETCH_ALARM}_`) ||
        alarm.name.startsWith(`${DAILY_STOCK_CHECK_ALARM}_`),
      )
      .map((alarm) => chrome.alarms.clear(alarm.name)),
  );

  if (enabledSites.length === 0) {
    logger.debug("📋 複数サイト監視: 有効なサイトがありません");
    return;
  }

  for (const site of enabledSites) {
    // ベースライン取得アラームの設定（baselineTimeが指定されている場合）
    if (site.baselineTime) {
      const baselineAlarmName = getSiteAlarmName(BASELINE_FETCH_ALARM, site.id);
      const baselineNextRun = createScheduleDate(site.baselineTime);

      await chrome.alarms.create(baselineAlarmName, {
        when: baselineNextRun.getTime(),
        periodInMinutes: 24 * 60,
      });

      logger.debug(`📊 ベースライン取得アラーム設定: ${site.name}`, {
        siteId: site.id,
        alarmName: baselineAlarmName,
        baselineTime: site.baselineTime,
        nextRun: baselineNextRun.toISOString(),
      });
    }

    const schedules = getSchedulesFromSite(site);

    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      // 複数スケジュールの場合はインデックスを含める
      const alarmName =
        schedules.length > 1
          ? `${DAILY_STOCK_CHECK_ALARM}_${site.id}_${i}`
          : getSiteAlarmName(DAILY_STOCK_CHECK_ALARM, site.id);
      const startTime = schedule.startTime || "11:57";
      const nextRun = createScheduleDate(startTime);

      await chrome.alarms.create(alarmName, {
        when: nextRun.getTime(),
        periodInMinutes: 24 * 60,
      });

      logger.debug(
        `⏰ 複数サイト監視アラーム設定: ${site.name} [${i + 1}/${schedules.length}]`,
        {
          siteId: site.id,
          scheduleIndex: i,
          alarmName,
          startTime,
          endTime: schedule.endTime,
          nextRun: nextRun.toISOString(),
        },
      );
    }
  }
}

/** C 再同期後に、定義から期待される実行アラームを実在アラームと照合する。 */
function buildScheduledWatchResyncResult({ sites = [], alarms = [], error = null } = {}) {
  const failureMessage = typeof error === "object" && error?.message ? error.message : error;
  if (failureMessage) {
    return {
      status: "failed",
      decisionReason: `C アラームの再同期に失敗しました: ${failureMessage}`,
      activeSiteCount: 0,
      expectedAlarmCount: 0,
      configuredAlarmCount: 0,
      missingAlarms: [],
      configurationIssues: [],
    };
  }

  const enabledSites = sites.filter((site) => site?.enabled);
  const configurationIssues = [];
  const expectedAlarms = [];
  enabledSites.forEach((site, siteIndex) => {
    const siteName = site?.name || `有効サイト ${siteIndex + 1}`;
    const siteId = typeof site?.id === "string" ? site.id.trim() : "";
    const url = typeof site?.url === "string" ? site.url.trim() : "";
    if (!siteId) {
      configurationIssues.push({ siteName, reason: "サイトIDが未設定です" });
      return;
    }
    if (!url) {
      configurationIssues.push({ siteName, reason: "監視URLが未設定です" });
      return;
    }
    if (site.baselineTime) {
      expectedAlarms.push({ siteName, name: `${BASELINE_FETCH_ALARM}_${siteId}` });
    }
    const schedules = Array.isArray(site.schedules) && site.schedules.length > 0
      ? site.schedules
      : site.schedule
        ? [site.schedule]
        : [{ startTime: "11:57" }];
    schedules.forEach((_, scheduleIndex) => {
      expectedAlarms.push({
        siteName,
        name: schedules.length > 1
          ? `${DAILY_STOCK_CHECK_ALARM}_${siteId}_${scheduleIndex}`
          : `${DAILY_STOCK_CHECK_ALARM}_${siteId}`,
      });
    });
  });

  const alarmNames = new Set(alarms.map((alarm) => alarm?.name));
  const missingAlarms = expectedAlarms.filter((alarm) => !alarmNames.has(alarm.name));
  const configuredAlarmCount = expectedAlarms.length - missingAlarms.length;
  let status = "success";
  let decisionReason = `有効サイト ${enabledSites.length}件のアラーム ${configuredAlarmCount}件を設定・照合できました。`;
  if (enabledSites.length === 0) {
    status = "warning";
    decisionReason = "有効な C サイトがないため、再同期するアラームはありません。";
  } else if (configurationIssues.length > 0) {
    status = "warning";
    decisionReason = "実行アラームを作れない設定不足があるため、サイト定義を確認してください。";
  } else if (missingAlarms.length > 0) {
    status = "warning";
    decisionReason = `期待アラーム ${expectedAlarms.length}件のうち ${missingAlarms.length}件を確認できませんでした。`;
  }
  return {
    status,
    decisionReason,
    activeSiteCount: enabledSites.length,
    expectedAlarmCount: expectedAlarms.length,
    configuredAlarmCount,
    missingAlarms,
    configurationIssues,
  };
}

/** C アラーム再同期の最新表示結果を、ブラウザ起動中だけ復元できるように保持する。 */
async function setScheduledWatchResyncResult(result) {
  try {
    await chrome.storage.session.set({
      [SCHEDULED_WATCH_RESYNC_RESULT_SESSION_KEY]: result,
    });
  } catch (error) {
    logger.warn("C アラーム再同期結果の session 保存に失敗しました", error?.message);
  }
  return result;
}

async function getStoredScheduledWatchResyncResult() {
  try {
    const stored = await chrome.storage.session.get(
      SCHEDULED_WATCH_RESYNC_RESULT_SESSION_KEY,
    );
    return stored[SCHEDULED_WATCH_RESYNC_RESULT_SESSION_KEY] || null;
  } catch (error) {
    logger.warn("C アラーム再同期結果の session 読み込みに失敗しました", error?.message);
    return null;
  }
}

function buildScheduledWatchExecutionResult(session) {
  return {
    runId: `${session.siteId}_${session.scheduleIndex}_${Date.now()}`,
    siteId: session.siteId,
    siteName: session.siteName || session.siteId,
    scheduleIndex: session.scheduleIndex ?? 0,
    status: "starting",
    startedAt: session.startedAt || new Date().toISOString(),
    endedAt: null,
    scheduledWindowStart: session.scheduleWindowStart || null,
    scheduledWindowEnd: session.scheduleWindowEnd || null,
    endReason: null,
    snapshotCaptured: false,
    selectorTextCaptured: false,
    matchedCount: 0,
    snapshotCount: 0,
    textPreview: "",
    tickCount: 0,
    decisionReason: "指定時刻の監視開始を準備しています。",
  };
}

function resolveScheduledWatchExecutionOutcome(execution = {}, reason = "unknown") {
  if (reason === "start_error" || reason === "capture_error") {
    return {
      status: "failed",
      decisionReason: "監視開始または指定セレクタの取得に失敗しました。",
    };
  }
  if (!execution.snapshotCaptured) {
    return {
      status: "failed",
      decisionReason: "監視終了までに指定セレクタの取得を確認できませんでした。",
    };
  }
  if (!execution.selectorTextCaptured) {
    return {
      status: "needs_review",
      decisionReason: "snapshotは取得しましたが、指定セレクタのテキストを確認できませんでした。",
    };
  }
  if (reason === "new_product_detected") {
    return {
      status: "success",
      decisionReason: "指定セレクタのテキスト取得後、新商品検知により監視を正常終了しました。",
    };
  }
  if (reason === "window_end" || reason === "window_end_after_check") {
    return {
      status: "success",
      decisionReason: "指定セレクタのテキスト取得を確認し、監視終了時刻まで正常に完走しました。",
    };
  }
  return {
    status: "needs_review",
    decisionReason: "監視は終了しましたが、終了理由を確認してください。",
  };
}

async function updateScheduledWatchExecutionResult(session, patch = {}) {
  if (!session?.siteId) return null;
  const next = {
    ...(session.executionResult || buildScheduledWatchExecutionResult(session)),
    ...patch,
  };
  session.executionResult = next;
  scheduledWatchExecutionResultStorageLock = scheduledWatchExecutionResultStorageLock.then(async () => {
    try {
      const stored = await chrome.storage.session.get(
        SCHEDULED_WATCH_EXECUTION_RESULTS_SESSION_KEY,
      );
      const results = stored[SCHEDULED_WATCH_EXECUTION_RESULTS_SESSION_KEY] || {};
      results[session.siteId] = next;
      await chrome.storage.session.set({
        [SCHEDULED_WATCH_EXECUTION_RESULTS_SESSION_KEY]: results,
      });
    } catch (error) {
      logger.warn("C 監視実行結果の session 保存に失敗しました", error?.message);
    }
  });
  await scheduledWatchExecutionResultStorageLock;
  return next;
}

async function getStoredScheduledWatchExecutionResults() {
  try {
    const stored = await chrome.storage.session.get(
      SCHEDULED_WATCH_EXECUTION_RESULTS_SESSION_KEY,
    );
    return stored[SCHEDULED_WATCH_EXECUTION_RESULTS_SESSION_KEY] || {};
  } catch (error) {
    logger.warn("C 監視実行結果の session 読み込みに失敗しました", error?.message);
    return {};
  }
}

async function resyncScheduledWatchSites() {
  try {
    await syncMultiSiteScheduledCheck();
    const [sites, alarms, siteStatusResult] = await Promise.all([
      loadScheduledWatchSites(),
      chrome.alarms.getAll(),
      getScheduledWatchSitesStatus(),
    ]);
    const resyncResult = buildScheduledWatchResyncResult({ sites, alarms });
    await setScheduledWatchResyncResult(resyncResult);
    return {
      success: true,
      sites: siteStatusResult.sites,
      popupListWatchErrors: siteStatusResult.popupListWatchErrors,
      resyncResult,
    };
  } catch (error) {
    const errorMessage = error?.message || "不明なエラー";
    bgLogError("❌ C アラームの再同期に失敗しました:", error);
    const resyncResult = buildScheduledWatchResyncResult({ error: errorMessage });
    await setScheduledWatchResyncResult(resyncResult);
    return {
      success: false,
      sites: [],
      resyncResult,
      error: errorMessage,
    };
  }
}

async function syncScheduledStockCheck(config = null) {
  let resolvedConfig = config;
  try {
    resolvedConfig = config || (await configManager.loadConfig());
    const scheduledWatch = resolvedConfig?.single_scheduled_watch || {};
    const targetUrl = scheduledWatch.url || "";
    const monitorSelector = scheduledWatch.monitorSelector || "";
    const windowSettings = resolveScheduleWindowSettings({
      scheduleWindowStart: scheduledWatch.startTime,
      scheduleWindowEnd: scheduledWatch.endTime,
      scheduleReloadIntervalSec: scheduledWatch.intervalSeconds,
    });

    if (
      !scheduledWatch.enabled ||
      !targetUrl ||
      !monitorSelector
    ) {
      const stored = await chrome.storage.local.get(STOCK_WATCH_SESSION_KEY);
      const activeSession = stored[STOCK_WATCH_SESSION_KEY];
      if (activeSession?.active && activeSession.trigger === "immediate") {
        // 即時監視は予約設定と独立しているため、設定保存時に tick を止めない。
        await chrome.alarms.clear(DAILY_STOCK_CHECK_ALARM);
      } else if (activeSession?.active) {
        await clearStockWatchAlarms();
        await endStockWatchSession(stored[STOCK_WATCH_SESSION_KEY], { reason: "scheduled_watch_disabled" });
      } else {
        await clearStockWatchAlarms();
        await chrome.storage.local.remove(STOCK_WATCH_SESSION_KEY);
      }
      logger.debug("⏰ 定時差分検知アラームをクリアしました");
    } else {
      const nextRun = createScheduleDate(windowSettings.scheduleWindowStart);
      chrome.alarms.create(DAILY_STOCK_CHECK_ALARM, {
        when: nextRun.getTime(),
        periodInMinutes: 24 * 60,
      });

      logger.debug("⏰ 定時監視ウィンドウアラームを予約しました", {
        targetUrl,
        scheduleWindowStart: windowSettings.scheduleWindowStart,
        scheduleWindowEnd: windowSettings.scheduleWindowEnd,
        scheduleReloadIntervalSec: windowSettings.scheduleReloadIntervalSec,
        nextRun: nextRun.toISOString(),
      });
    }
  } catch (error) {
    bgLogError("❌ 定時監視アラームの予約に失敗しました:", error);
  }

  // 複数サイト監視のアラームも設定（JSON設定ファイルベース）
  try {
    await syncMultiSiteScheduledCheck();
  } catch (error) {
    bgLogError("❌ 複数サイト監視アラーム設定エラー:", error);
  }

  try {
    await syncMultipleMonitoringSchedule(resolvedConfig);
  } catch (error) {
    bgLogError("❌ 複数URL監視の定時アラーム設定エラー:", error);
  }

  try {
    await syncSingleKeywordMonitoringSchedule(resolvedConfig);
  } catch (error) {
    bgLogError("❌ 単一URLキーワード監視の定時アラーム設定エラー:", error);
  }
}

/** A: Popup で設定した複数URL監視の毎日開始アラームを同期する。 */
async function syncMultipleMonitoringSchedule(config = null) {
  const resolvedConfig = config || (await configManager.loadConfig());
  const commonSettings = resolvedConfig?.multiple_common_settings || {};
  const enabledConfigs = Array.isArray(resolvedConfig?.multiple_configs)
    ? resolvedConfig.multiple_configs.filter((item) => item?.enabled)
    : [];
  const scheduleTime = commonSettings.scheduleTime || "11:57";
  const enabled = resolvedConfig?.mode === "multiple" &&
    commonSettings.scheduleEnabled === true &&
    enabledConfigs.length > 0;

  await chrome.alarms.clear(DAILY_MULTIPLE_MONITORING_ALARM);
  if (!enabled) {
    logger.debug("⏰ 複数URL監視の定時アラームをクリアしました");
    return {
      enabled: false,
      scheduleEnabled: commonSettings.scheduleEnabled === true,
      scheduleTime,
      targetCount: enabledConfigs.length,
      reason: enabledConfigs.length === 0
        ? "有効な監視対象が0件のため予約できません"
        : "定時監視が無効です",
    };
  }

  const nextRun = createScheduleDate(scheduleTime);
  await chrome.alarms.create(DAILY_MULTIPLE_MONITORING_ALARM, {
    when: nextRun.getTime(),
    periodInMinutes: 24 * 60,
  });
  logger.debug("⏰ 複数URL監視の定時アラームを予約しました", {
    scheduleTime,
    enabledCount: enabledConfigs.length,
    nextRun: nextRun.toISOString(),
  });
  return {
    enabled: true,
    scheduleEnabled: true,
    scheduleTime,
    targetCount: enabledConfigs.length,
    nextRunAt: nextRun.getTime(),
    reason: null,
  };
}

/** A: Popup で設定した単一URLキーワード監視の毎日開始アラームを同期する。 */
async function syncSingleKeywordMonitoringSchedule(config = null) {
  const resolvedConfig = config || (await configManager.loadConfig());
  const schedule = resolvedConfig?.single_keyword_schedule || {};
  const targetUrl = resolvedConfig?.single_config?.url || "";
  const scheduleTime = schedule.startTime || "11:57";
  const enabled = resolvedConfig?.mode === "single" &&
    schedule.enabled === true &&
    Boolean(targetUrl);

  await chrome.alarms.clear(DAILY_SINGLE_KEYWORD_MONITORING_ALARM);
  if (!enabled) {
    logger.debug("⏰ 単一URLキーワード監視の定時アラームをクリアしました");
    return {
      enabled: false,
      scheduleEnabled: schedule.enabled === true,
      scheduleTime,
      reason: !schedule.enabled
        ? "定時監視が無効です"
        : resolvedConfig?.mode !== "single"
          ? "単一URL監視モードで設定してください"
          : "商品ページURLを指定してください",
    };
  }

  const nextRun = createScheduleDate(scheduleTime);
  await chrome.alarms.create(DAILY_SINGLE_KEYWORD_MONITORING_ALARM, {
    when: nextRun.getTime(),
    periodInMinutes: 24 * 60,
  });
  logger.debug("⏰ 単一URLキーワード監視の定時アラームを予約しました", {
    scheduleTime,
    targetUrl,
    nextRun: nextRun.toISOString(),
  });
  return {
    enabled: true,
    scheduleEnabled: true,
    scheduleTime,
    nextRunAt: nextRun.getTime(),
    reason: null,
  };
}

/** A の定時アラームから、保存済みの単一URLキーワード監視を開始する。 */
async function startScheduledSingleKeywordMonitoring() {
  const config = await configManager.loadConfig();
  const schedule = config?.single_keyword_schedule || {};
  const singleConfig = config?.single_config || {};
  const targetUrl = singleConfig.url || "";
  if (config?.mode !== "single" || schedule.enabled !== true || !targetUrl) {
    logger.debug("⏰ 単一URLキーワード監視の定時開始をスキップしました", {
      mode: config?.mode,
      scheduleEnabled: schedule.enabled,
      hasTargetUrl: Boolean(targetUrl),
    });
    return { success: false, skipped: true };
  }

  const sessions = await getSingleMonitoringSessions();
  const hasActiveSingleSession = Object.values(sessions).some((session) => (
    session?.active && getMonitoringSessionScope(session) === "single"
  ));
  if (hasActiveSingleSession) {
    logger.debug("⏰ 単一URLキーワード監視は実行中のため定時開始をスキップしました");
    return { success: false, skipped: true, reason: "single_monitoring_already_running" };
  }

  const settings = {
    ...(singleConfig.settings || {}),
    monitorType: "url",
    targetUrl,
  };
  return startSingleMonitoring(settings, null, {
    persistConfig: false,
    monitoringScope: "single",
  });
}

/** A の定時アラームから、保存済みの通常複数URL監視を開始する。 */
async function startScheduledMultipleMonitoring() {
  const config = await configManager.loadConfig();
  const commonSettings = config?.multiple_common_settings || {};
  const configs = Array.isArray(config?.multiple_configs)
    ? config.multiple_configs.filter((item) => item?.enabled)
    : [];
  if (config?.mode !== "multiple" || commonSettings.scheduleEnabled !== true || configs.length === 0) {
    logger.info("⏰ 複数URL監視の定時開始をスキップしました", {
      mode: config?.mode,
      scheduleEnabled: commonSettings.scheduleEnabled,
      enabledCount: configs.length,
    });
    return { success: false, skipped: true };
  }

  const request = {
    configs,
    commonSettings,
    requestId: `scheduledMultiple_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    monitoringOrigin: "scheduled",
  };
  const requestMeta = resolveStartAllMonitoringRequestMeta(request);
  const results = await runMultipleMonitoringStartConfigs(request, requestMeta);
  const summary = summarizeStartAllMonitoringResults(results);
  logger.info("⏰ 複数URL監視の定時開始結果", {
    requestId: requestMeta.requestId,
    total: summary.total,
    success: summary.successCount,
    failure: summary.failureCount,
  });
  return { success: summary.successCount > 0, ...summary, results };
}

/** C の定義・実行状態を popup 用に集約する。JSON 自体は変更しない。 */
async function getScheduledWatchSitesStatus() {
  const [sites, popupListWatchResolution, store, alarms, executionResults] = await Promise.all([
    loadScheduledWatchSites(),
    resolvePopupListWatchSites(),
    chrome.storage.local.get([MULTI_SITE_SESSIONS_KEY, STOCK_LOG_STORAGE_KEY]),
    chrome.alarms.getAll(),
    getStoredScheduledWatchExecutionResults(),
  ]);
  const sessions = store[MULTI_SITE_SESSIONS_KEY] || {};
  const logs = store[STOCK_LOG_STORAGE_KEY] || [];
  const statusSites = sites.map((site) => {
    const siteAlarms = alarms.filter((alarm) =>
      alarm.name.includes(`_${site.id}`),
    );
    const lastLog = [...logs]
      .reverse()
      .find((log) => log.siteId === site.id || log.siteName === site.name);
    return {
      id: site.id,
      targetId: site.targetId || null,
      source: site.source || "scheduled-watch-sites",
      name: site.name,
      url: site.url,
      enabled: Boolean(site.enabled),
      fetchMode: site.fetchMode || { enabled: false, fallbackToDom: true },
      schedules: getSchedulesFromSite(site),
      status: sessions[site.id]?.active ? "running" : site.enabled ? "scheduled" : "disabled",
      activeSession: sessions[site.id] || null,
      trigger: sessions[site.id]?.trigger || null,
      latestExecution: executionResults[site.id] || null,
      alarms: siteAlarms.map((alarm) => ({ name: alarm.name, scheduledTime: alarm.scheduledTime })),
      lastError: (lastLog?.error || lastLog?.reason === "start_error")
        ? (lastLog.error || "開始エラー")
        : null,
    };
  });
  return { sites: statusSites, popupListWatchErrors: popupListWatchResolution.errors };
}

/**
 * B/C の本運用に影響しない一回限りの確認を開始する。
 * baseline の保存、通知、ダウンロード、検知 URL の表示は行わない。
 */
async function startScheduledWatchTest(mode, siteId = null) {
  const existing = await chrome.storage.local.get([SCHEDULED_WATCH_TEST_SESSION_KEY, STOCK_WATCH_SESSION_KEY]);
  if (existing[SCHEDULED_WATCH_TEST_SESSION_KEY]?.active) {
    throw new Error("定時テストは既に実行中です");
  }

  let target = null;
  if (mode === "single") {
    const config = await configManager.loadConfig();
    const single = config?.single_scheduled_watch || {};
    const settings = { monitorSelector: single.monitorSelector || "" };
    const url = single.url || "";
    if (!url) throw new Error("B の指定URLが未設定です");
    if (existing[STOCK_WATCH_SESSION_KEY]?.active) {
      throw new Error("B の本運用中はテストを開始できません");
    }
    target = { mode, id: "single", name: "単一サイト定時検証", url, settings };
  } else if (mode === "multi") {
    const sites = await loadScheduledWatchSites();
    const site = sites.find((item) => item.id === siteId);
    if (!siteId || !site?.enabled) throw new Error("有効な C サイトを選択してください");
    if ((await getMultiSiteSession(siteId))?.active) {
      throw new Error("選択した C サイトは本運用中です");
    }
    target = { mode, id: site.id, name: site.name, url: site.url, settings: {
      monitorSelector: site.selectors?.productLinks || "",
      itemCountSelector: site.selectors?.itemCount || "",
    }};
  } else {
    throw new Error("定時テスト種別が不正です");
  }

  const session = {
    ...target,
    active: true,
    suppressGmailNotification: true,
    status: "running",
    phase: "scheduled",
    startedAt: new Date().toISOString(),
    decisionReason: "対象ページを開き、DOM準備と商品取得を確認しています。",
    verificationItems: buildScheduledWatchTestVerificationItems(),
  };
  await chrome.storage.local.set({
    [SCHEDULED_WATCH_TEST_SESSION_KEY]: session,
    [SCHEDULED_WATCH_TEST_STATUS_KEY]: { ...session, status: "running" },
  });
  await chrome.alarms.create(SCHEDULED_WATCH_TEST_ALARM, { when: Date.now() + 1000 });
  return { started: true, status: "running", target: { mode: target.mode, id: target.id, name: target.name } };
}

/** C の URL 差分検知だけを、通常監視と切り離して二段階で確認する。 */
async function startScheduledWatchDiffTest(siteId, { checkGmail = false } = {}) {
  const existing = await chrome.storage.local.get(SCHEDULED_WATCH_TEST_SESSION_KEY);
  if (existing[SCHEDULED_WATCH_TEST_SESSION_KEY]?.active) {
    throw new Error("定時テストは既に実行中です");
  }
  const sites = await loadScheduledWatchSites();
  const site = sites.find((item) => item.id === siteId);
  if (!siteId || !site?.enabled) throw new Error("有効な C サイトを選択してください");
  if ((await getMultiSiteSession(siteId))?.active) {
    throw new Error("選択した C サイトは本運用中です");
  }
  if (checkGmail) {
    const preflight = await getGmailNotificationAutoTestPreflight();
    if (!preflight.ready) throw new Error(preflight.reason || "Gmail の事前確認が完了していません");
  }

  const session = {
    mode: "multi-diff",
    id: site.id,
    name: site.name,
    url: site.url,
    settings: {
      monitorSelector: site.selectors?.productLinks || "",
      itemCountSelector: site.selectors?.itemCount || "",
      // 差分検知テストだけは、遅延する商品一覧の初回描画を待つ。
      pageReadyTimeoutMs: 30000,
    },
    active: true,
    status: "running",
    phase: "initial_snapshot",
    checkGmail: checkGmail === true,
    gmailTestRunId: checkGmail ? `c-diff-${site.id}-${Date.now()}` : "",
    startedAt: new Date().toISOString(),
    decisionReason: "初回 snapshot を取得し、テスト専用 baseline を作成しています。",
    verificationItems: buildScheduledWatchDiffTestVerificationItems({ checkGmail }),
  };
  await chrome.storage.local.set({
    [SCHEDULED_WATCH_TEST_SESSION_KEY]: session,
    [SCHEDULED_WATCH_TEST_STATUS_KEY]: { ...session },
  });
  await chrome.alarms.create(SCHEDULED_WATCH_TEST_ALARM, { when: Date.now() + 1000 });
  return { started: true, status: "running", target: { mode: session.mode, id: site.id, name: site.name } };
}

/** C の通常保存経路を、テスト専用アラームで確認する。 */
async function startScheduledWatchArtifactDiffTest(siteId, { executionMode = "fast" } = {}) {
  const existing = await chrome.storage.local.get(SCHEDULED_WATCH_TEST_SESSION_KEY);
  if (existing[SCHEDULED_WATCH_TEST_SESSION_KEY]?.active) throw new Error("定時テストは既に実行中です");
  const sites = await loadScheduledWatchSites();
  const site = sites.find((item) => item.id === siteId);
  if (!siteId || !site?.enabled) throw new Error("有効な C サイトを選択してください");
  if ((await getMultiSiteSession(siteId))?.active) throw new Error("選択した C サイトは本運用中です");
  if (!String(site.selectors?.productLinks || "").trim()) throw new Error("商品取得セレクタが未設定です");
  const normalizedExecutionMode = executionMode === "alarm" ? "alarm" : "fast";
  const session = {
    mode: "multi-artifact-diff", id: site.id, name: site.name, url: site.url,
    settings: { monitorSelector: site.selectors.productLinks, itemCountSelector: site.selectors?.itemCount || "", pageReadyTimeoutMs: 30000 },
    active: true, status: "running", phase: "baseline", executionMode: normalizedExecutionMode, startedAt: new Date().toISOString(),
    decisionReason: "テスト専用アラームで、基準証跡を保存しています。",
    verificationItems: buildScheduledWatchArtifactDiffTestVerificationItems(),
  };
  await chrome.storage.local.set({ [SCHEDULED_WATCH_TEST_SESSION_KEY]: session, [SCHEDULED_WATCH_TEST_STATUS_KEY]: { ...session } });
  await chrome.alarms.create(SCHEDULED_WATCH_TEST_ALARM, { when: Date.now() + 1000 });
  return { started: true, status: "running", target: { mode: session.mode, id: site.id, name: site.name } };
}

function buildScheduledWatchArtifactDiffTestVerificationItems({ initialSnapshotCount, newUrls, artifacts = [], completed = false } = {}) {
  const artifact = (kind) => artifacts.find((item) => item.kind === kind);
  const item = (label, value) => ({ label, passed: value?.success === true, reason: value ? (value.success ? `${value.filename} (downloadId: ${value.downloadId})` : value.error || "保存失敗") : "確認中です" });
  return [
    { label: "基準URL取得", passed: Number(initialSnapshotCount || 0) > 0, reason: Number.isFinite(initialSnapshotCount) ? `${initialSnapshotCount}件` : "確認中です" },
    item("baseline PNG 保存", artifact("baseline PNG")), item("baseline HTML 保存", artifact("baseline HTML")), item("baseline TXT 保存", artifact("baseline TXT")),
    { label: "強制差分検知", passed: Array.isArray(newUrls) && newUrls.length > 0, reason: Array.isArray(newUrls) ? `${newUrls.length}件` : "確認中です" },
    item("detected PNG 保存", artifact("detected PNG")), item("detected HTML 保存", artifact("detected HTML")),
    { label: "テスト終了", passed: completed === true, reason: completed ? "一時タブ・専用アラーム・テストsessionを終了" : "確認中です" },
  ];
}

async function runScheduledWatchArtifactDiffTestTick(initialSession) {
  let session = initialSession;
  bgLogDebug(`🧪 [TEST] runScheduledWatchArtifactDiffTestTick 開始`, { phase: session?.phase, tabId: session?.tabId, active: session?.active, mode: session?.mode });
  let tabId = session.tabId ?? null;
  let finalPatch = {};
  try {
    if (session.phase === "baseline") {
      const tab = await chrome.tabs.create({ url: session.url, active: false });
      tabId = tab.id;
      await waitForTabComplete(tabId);
      if (!await waitForScheduledWatchPageReady(tabId, session.url, null, session.settings)) throw new Error("DOM準備待機が完了しませんでした");
      // 通常経路テスト: 全ページ巡回（実際の監視動作と同じ）
      const snapshot = await captureScheduledSnapshot(tabId, session.settings, { mode: "baseline", targetUrl: session.url });
      const urls = Array.isArray(snapshot?.urls) ? snapshot.urls.filter(Boolean) : [];
      bgLogDebug(`🧪 [TEST] baseline snapshot取得完了`, { snapshotUrls: urls.length });
      if (!urls.length) throw new Error("基準URLを取得できませんでした");
      const artifactSession = { siteId: session.id, siteName: `TEST_${session.name}`, targetUrl: session.url, baselineUrls: urls, baselineCount: Number(snapshot.count || 0) };
      const baselineArtifacts = await saveScheduledStockBaselineArtifacts(artifactSession, snapshot, tabId);
      if (baselineArtifacts.some((item) => !item.success)) throw new Error("基準証跡の保存に失敗しました");
      // baseline完了後、タブを閉じる
      bgLogDebug(`🧪 [TEST] baseline完了、タブを閉じる`, { tabId });
      try { await chrome.tabs.remove(tabId); } catch (_) { /* already closed */ }
      tabId = null;
      const next = { ...session, active: true, tabId: null, phase: "detect", initialSnapshotCount: urls.length, temporaryBaselineUrls: urls.slice(1), baselineArtifacts, decisionReason: "テスト用baselineから1件を除外し、差分検知と検知証跡保存を確認しています。" };
      await chrome.storage.local.set({ [SCHEDULED_WATCH_TEST_SESSION_KEY]: next, [SCHEDULED_WATCH_TEST_STATUS_KEY]: { ...next, verificationItems: buildScheduledWatchArtifactDiffTestVerificationItems({ initialSnapshotCount: urls.length, artifacts: baselineArtifacts }) } });
      if (session.executionMode === "alarm") {
        bgLogDebug(`🧪 [TEST] baseline完了、次の専用アラームtickでdetectフェーズへ移行`, { nextPhase: next.phase, nextActive: next.active });
        await chrome.alarms.create(SCHEDULED_WATCH_TEST_ALARM, { when: Date.now() + 1000 });
        return;
      }
      bgLogDebug(`🧪 [TEST] baseline完了、detectフェーズへ直接移行（短縮検証）`, { nextPhase: next.phase, nextActive: next.active });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      session = next;
    }
    // detect フェーズ: 新しいタブを開いて1ページ目を取得
    bgLogDebug(`🧪 [TEST] detectフェーズ開始、新しいタブを開く`, { url: session.url, temporaryBaselineUrls: session.temporaryBaselineUrls?.length });
    const detectTab = await chrome.tabs.create({ url: session.url, active: false });
    tabId = detectTab.id;
    await waitForTabComplete(tabId);
    if (!await waitForScheduledWatchPageReady(tabId, session.url, null, session.settings)) throw new Error("detect準備: DOM準備待機が完了しませんでした");
    // 通常経路テスト: 全ページ巡回（実際の監視動作と同じ）
    const snapshot = await captureScheduledSnapshot(tabId, session.settings, { mode: "baseline", targetUrl: session.url });
    const urls = Array.isArray(snapshot?.urls) ? snapshot.urls.filter(Boolean) : [];
    bgLogDebug(`🧪 [TEST] detectフェーズ snapshot取得完了`, { snapshotUrls: urls.length, temporaryBaselineUrls: session.temporaryBaselineUrls?.length });
    const newUrls = diffStockProductUrls(session.temporaryBaselineUrls || [], urls);
    bgLogDebug(`🧪 [TEST] 差分検知結果`, { newUrls: newUrls.length, baselineUrlsUsed: session.temporaryBaselineUrls?.length, currentUrls: urls.length });
    if (!newUrls.length) throw new Error("テスト用 baseline との差分を検知できませんでした");
    const artifactSession = { siteId: session.id, siteName: `TEST_${session.name}`, targetUrl: session.url };
    const detectedArtifacts = await saveScheduledStockDetectionArtifacts(artifactSession, tabId);
    const artifacts = [...(session.baselineArtifacts || []), ...detectedArtifacts];
    if (detectedArtifacts.some((item) => !item.success)) throw new Error("検知証跡の保存に失敗しました");
    finalPatch = { initialSnapshotCount: session.initialSnapshotCount, newUrls, artifacts, decisionReason: "テスト専用の強制差分を検知し、基準・検知証跡を保存しました。" };
  } catch (error) {
    bgLogError(`🧪 [TEST] エラー発生`, { message: error?.message, phase: session?.phase, stack: error?.stack });
    finalPatch = { initialSnapshotCount: session.initialSnapshotCount, artifacts: session.baselineArtifacts || [], failureReason: error?.message || "保存付き差分テスト実行エラー", decisionReason: error?.message || "保存付き差分テストを完了できませんでした。" };
  } finally {
    bgLogDebug(`🧪 [TEST] finally ブロック`, { phase: session?.phase, hasFailure: !!finalPatch.failureReason, tabId });
    if (session.phase === "detect" || finalPatch.failureReason) {
      if (tabId != null) try { await chrome.tabs.remove(tabId); } catch (_) { /* already closed */ }
      await chrome.alarms.clear(SCHEDULED_WATCH_TEST_ALARM);
      const completed = { ...session, ...finalPatch, active: false, status: finalPatch.failureReason ? "failed" : "success", completedAt: new Date().toISOString() };
      completed.verificationItems = buildScheduledWatchArtifactDiffTestVerificationItems({ ...completed, completed: true });
      await chrome.storage.local.set({ [SCHEDULED_WATCH_TEST_STATUS_KEY]: completed });
      await chrome.storage.local.remove(SCHEDULED_WATCH_TEST_SESSION_KEY);
    }
  }
}

function buildScheduledWatchTestVerificationItems({ monitorSelector, matchedCount, snapshotCount, snapshotAvailable = true } = {}) {
  const hasMonitorSelector = typeof monitorSelector === "string" && monitorSelector.trim().length > 0;
  const hasMatchedCount = Number.isFinite(matchedCount);
  const hasSnapshotCount = Number.isFinite(snapshotCount);
  return [
    {
      label: "商品取得セレクタ結果",
      passed: hasMonitorSelector && hasMatchedCount ? matchedCount > 0 : false,
      reason: !hasMonitorSelector
        ? "商品取得セレクタが未設定です"
        : !hasMatchedCount
          ? "確認中です"
          : `${matchedCount}件`,
    },
    {
      label: "snapshot取得件数",
      passed: snapshotAvailable && hasSnapshotCount ? snapshotCount > 0 : false,
      reason: !snapshotAvailable
        ? "snapshotを取得できませんでした"
        : !hasSnapshotCount
          ? "確認中です"
          : `${snapshotCount}件`,
    },
  ];
}

function buildScheduledWatchDiffTestVerificationItems({
  initialSnapshotCount,
  temporaryBaselineCount,
  refetchCount,
  newUrls,
  checkGmail = false,
  gmailResult,
  completed = false,
} = {}) {
  const hasInitialSnapshot = Number.isFinite(initialSnapshotCount) && initialSnapshotCount > 0;
  const hasBaseline = Number.isFinite(temporaryBaselineCount) && temporaryBaselineCount >= 0;
  const hasRefetch = Number.isFinite(refetchCount) && refetchCount > 0;
  const detected = Array.isArray(newUrls) && newUrls.length > 0;
  const gmailPassed = checkGmail
    ? gmailResult?.status === "success" && Boolean(gmailResult?.testRunId)
    : true;
  return [
    { label: "URL取得", passed: hasInitialSnapshot, reason: Number.isFinite(initialSnapshotCount) ? `${initialSnapshotCount}件` : "確認中です" },
    { label: "テスト用baseline作成", passed: hasBaseline, reason: Number.isFinite(temporaryBaselineCount) ? `${temporaryBaselineCount}件（URLを1件除外）` : "確認中です" },
    { label: "再取得", passed: hasRefetch, reason: Number.isFinite(refetchCount) ? `${refetchCount}件` : "確認中です" },
    { label: "newUrls検知", passed: detected, reason: Array.isArray(newUrls) ? `${newUrls.length}件` : "確認中です" },
    {
      label: "Gmail 検知送信",
      passed: gmailPassed,
      reason: !checkGmail ? "実行しない" : gmailResult?.status === "success" ? "今回の実行IDで送信成功" : gmailResult?.message || "確認中です",
    },
    { label: "テスト終了", passed: completed, reason: completed ? "一時タブ・専用アラーム・テストsessionを終了" : "確認中です" },
  ];
}

function getScheduledWatchTestDecisionReason({ status, warningReason, failureReason } = {}) {
  if (status === "success") {
    return "対象ページ準備後、設定済み商品取得経路でsnapshotを1件以上取得できた。";
  }
  if (status === "warning") {
    return warningReason || "商品取得設定または対象ページを確認してください。";
  }
  if (status === "failed") {
    return failureReason || "定時テストを完了できませんでした。";
  }
  return "対象ページを開き、DOM準備と商品取得を確認しています。";
}

async function runScheduledWatchTestTick() {
  const store = await chrome.storage.local.get(SCHEDULED_WATCH_TEST_SESSION_KEY);
  const session = store[SCHEDULED_WATCH_TEST_SESSION_KEY];
  bgLogDebug(`🧪 [TEST] runScheduledWatchTestTick 開始`, { hasSession: !!session, active: session?.active, phase: session?.phase, mode: session?.mode });
  if (!session?.active) {
    bgLogDebug(`🧪 [TEST] session.active が false のため終了`, { session: session ? { active: session.active, phase: session.phase } : null });
    return;
  }
  let tabId = null;
  try {
    if (session.mode === "multi-diff") {
      await runScheduledWatchDiffTestTick(session);
      return;
    }
    if (session.mode === "multi-artifact-diff") {
      bgLogDebug(`🧪 [TEST] multi-artifact-diff モードで runScheduledWatchArtifactDiffTestTick を呼び出します`, { phase: session.phase, active: session.active });
      await runScheduledWatchArtifactDiffTestTick(session);
      return;
    }
    const tab = await chrome.tabs.create({ url: session.url, active: false });
    tabId = tab.id;
    await waitForTabComplete(tabId);
    const pageReady = await waitForScheduledWatchPageReady(
      tabId,
      session.url,
      null,
      session.settings,
    );
    if (!pageReady) {
      throw new Error("DOM準備待機が完了しませんでした");
    }
    const snapshot = await captureScheduledSnapshot(tabId, session.settings, {
      mode: "test", targetUrl: session.url,
    });
    const monitorSelector = String(session.settings?.monitorSelector || "").trim();
    const snapshotCount = Number(snapshot?.count || 0);
    const matchedCount = Number(snapshot?.matchedCount || 0);
    const warningReason = !monitorSelector
      ? "商品取得セレクタが未設定です"
      : matchedCount === 0
        ? "商品取得セレクタの結果が0件です"
        : snapshotCount === 0
          ? "snapshotの取得件数が0件です"
          : null;
    const status = !snapshot ? "failed" : warningReason ? "warning" : "success";
    const failureReason = snapshot ? null : "snapshot を取得できませんでした";
    await chrome.storage.local.set({
      [SCHEDULED_WATCH_TEST_STATUS_KEY]: {
        ...session,
        active: false,
        status,
        snapshotCount,
        matchedCount,
        tickedAt: new Date().toISOString(),
        failureReason,
        warningReason,
        decisionReason: getScheduledWatchTestDecisionReason({ status, warningReason, failureReason }),
        verificationItems: buildScheduledWatchTestVerificationItems({
          monitorSelector,
          matchedCount,
          snapshotCount,
          snapshotAvailable: Boolean(snapshot),
        }),
      },
    });
  } catch (error) {
    const failureReason = error.message || "テスト実行エラー";
    await chrome.storage.local.set({
      [SCHEDULED_WATCH_TEST_STATUS_KEY]: {
        ...session, active: false, status: "failed", tickedAt: new Date().toISOString(),
        failureReason,
        decisionReason: getScheduledWatchTestDecisionReason({ status: "failed", failureReason }),
        verificationItems: buildScheduledWatchTestVerificationItems({ snapshotAvailable: false }),
      },
    });
  } finally {
    // 差分検知テストは二段階で実行するため、session・アラーム・一時タブの
    // 後始末を各専用runnerの完了時まで保持する。
    if (session.mode !== "multi-diff" && session.mode !== "multi-artifact-diff") {
      if (tabId != null) {
        try { await chrome.tabs.remove(tabId); } catch (_) { /* already closed */ }
      }
      await chrome.alarms.clear(SCHEDULED_WATCH_TEST_ALARM);
      await chrome.storage.local.remove(SCHEDULED_WATCH_TEST_SESSION_KEY);
    }
  }
}

async function runScheduledWatchDiffTestTick(session) {
  let tabId = session.tabId ?? null;
  let finalStatus = "failed";
  let finalPatch = {};
  try {
    if (session.phase === "initial_snapshot") {
      if (!String(session.settings?.monitorSelector || "").trim()) {
        throw new Error("商品取得セレクタが未設定です");
      }
      const tab = await chrome.tabs.create({ url: session.url, active: false });
      tabId = tab.id;
      await waitForTabComplete(tabId);
      const pageReady = await waitForScheduledWatchPageReady(tabId, session.url, null, session.settings);
      if (!pageReady) throw new Error("DOM準備待機が完了しませんでした");
      const snapshot = await captureScheduledSnapshot(tabId, session.settings, { mode: "test", targetUrl: session.url });
      if (Number(snapshot?.matchedCount || 0) === 0) throw new Error("商品取得セレクタの結果が0件です");
      if (Number(snapshot?.count || 0) === 0) throw new Error("初回 snapshot の取得件数が0件です");
      const urls = Array.isArray(snapshot?.urls) ? snapshot.urls.filter(Boolean) : [];
      if (urls.length === 0) throw new Error("初回 snapshot の URL が0件です");
      const nextSession = {
        ...session,
        tabId,
        phase: "refetch",
        initialSnapshotCount: urls.length,
        temporaryBaselineUrls: urls.slice(1),
        temporaryBaselineCount: urls.length - 1,
        // popup の進捗表示は URL 件数のままにし、Gmail の増加件数だけは
        // 商品総数を基準に表示する。
        temporaryBaselineProductCount: Math.max(0, Number(snapshot.count || 0) - 1),
        decisionReason: "URLを1件除外したテスト専用 baseline を作成し、再取得しています。",
      };
      await chrome.storage.local.set({
        [SCHEDULED_WATCH_TEST_SESSION_KEY]: nextSession,
        [SCHEDULED_WATCH_TEST_STATUS_KEY]: {
          ...nextSession,
          verificationItems: buildScheduledWatchDiffTestVerificationItems(nextSession),
        },
      });
      await chrome.alarms.create(SCHEDULED_WATCH_TEST_ALARM, { when: Date.now() + 1000 });
      return;
    }

    if (tabId == null) throw new Error("テスト用タブが見つかりません");
    const snapshot = await captureScheduledSnapshot(tabId, session.settings, { mode: "test", targetUrl: session.url });
    if (Number(snapshot?.matchedCount || 0) === 0) throw new Error("再取得の商品取得セレクタの結果が0件です");
    if (Number(snapshot?.count || 0) === 0) throw new Error("再取得の snapshot 件数が0件です");
    const urls = Array.isArray(snapshot?.urls) ? snapshot.urls.filter(Boolean) : [];
    if (urls.length === 0) throw new Error("再取得の URL が0件です");
    const newUrls = diffStockProductUrls(session.temporaryBaselineUrls || [], urls);
    if (newUrls.length === 0) throw new Error("テスト用 baseline との差分を検知できませんでした");

    let gmailResult = null;
    if (session.checkGmail) {
      await notifyGmailForNewProductDetection({
        siteName: session.name,
        targetUrl: session.url,
        baselineCount: session.temporaryBaselineProductCount ?? session.temporaryBaselineCount,
        suppressGmailNotification: false,
        gmailTestRunId: session.gmailTestRunId,
      }, snapshot, newUrls);
      gmailResult = await getGmailNotificationAutoTestResult(session.gmailTestRunId);
    }
    const gmailFailed = session.checkGmail && gmailResult?.status !== "success";
    finalStatus = gmailFailed ? "warning" : "success";
    finalPatch = {
      refetchCount: urls.length,
      newUrls,
      gmailResult,
      warningReason: gmailFailed ? `Gmail 検知送信が未達です: ${gmailResult?.message || "今回の実行IDの成功結果を確認できません"}` : null,
      decisionReason: gmailFailed
        ? "URL差分は検知しましたが、Gmail 検知送信を確認できませんでした。"
        : "テスト専用 baseline との差分を検知し、必要な確認を完了しました。",
    };
  } catch (error) {
    finalPatch = { failureReason: error?.message || "差分検知テスト実行エラー", decisionReason: error?.message || "差分検知テストを完了できませんでした。" };
  } finally {
    if (finalPatch.refetchCount !== undefined || finalPatch.failureReason) {
      if (tabId != null) {
        try { await chrome.tabs.remove(tabId); } catch (_) { /* already closed */ }
      }
      await chrome.alarms.clear(SCHEDULED_WATCH_TEST_ALARM);
      const completed = { ...session, ...finalPatch, active: false, status: finalStatus, completedAt: new Date().toISOString() };
      completed.verificationItems = buildScheduledWatchDiffTestVerificationItems({ ...completed, completed: true });
      await chrome.storage.local.set({ [SCHEDULED_WATCH_TEST_STATUS_KEY]: completed });
      await chrome.storage.local.remove(SCHEDULED_WATCH_TEST_SESSION_KEY);
    }
  }
}

async function getScheduledWatchTestStatus() {
  const store = await chrome.storage.local.get([SCHEDULED_WATCH_TEST_SESSION_KEY, SCHEDULED_WATCH_TEST_STATUS_KEY]);
  return store[SCHEDULED_WATCH_TEST_SESSION_KEY] || store[SCHEDULED_WATCH_TEST_STATUS_KEY] || { status: "idle" };
}

// ============================================================
// 複数サイト監視: セッション管理
// ============================================================

/**
 * サイト別セッションを取得
 */
async function getMultiSiteSession(siteId) {
  const store = await chrome.storage.local.get([MULTI_SITE_SESSIONS_KEY]);
  const sessions = store[MULTI_SITE_SESSIONS_KEY] || {};
  return sessions[siteId] || null;
}

// セッション保存用のロック（競合状態防止）
let sessionStorageLock = Promise.resolve();

/**
 * サイト別セッションを保存
 * ロック機構により複数サイト同時保存時の競合状態を防止
 */
async function setMultiSiteSession(siteId, session) {
  // 前の操作が完了するまで待機
  sessionStorageLock = sessionStorageLock.then(async () => {
    const store = await chrome.storage.local.get([MULTI_SITE_SESSIONS_KEY]);
    const sessions = store[MULTI_SITE_SESSIONS_KEY] || {};
    sessions[siteId] = session;
    await chrome.storage.local.set({ [MULTI_SITE_SESSIONS_KEY]: sessions });
  });
  await sessionStorageLock;
}

/**
 * サイト別セッションを削除
 * ロック機構により複数サイト同時削除時の競合状態を防止
 */
async function removeMultiSiteSession(siteId) {
  // 前の操作が完了するまで待機
  sessionStorageLock = sessionStorageLock.then(async () => {
    const store = await chrome.storage.local.get([MULTI_SITE_SESSIONS_KEY]);
    const sessions = store[MULTI_SITE_SESSIONS_KEY] || {};
    delete sessions[siteId];
    await chrome.storage.local.set({ [MULTI_SITE_SESSIONS_KEY]: sessions });
  });
  await sessionStorageLock;
}

/**
 * サイト別のTickアラームをスケジュール
 */
async function scheduleMultiSiteTick(siteId, delaySec) {
  const alarmName = getSiteAlarmName(STOCK_WATCH_TICK_ALARM, siteId);
  const delayMs = Math.max(1000, Number(delaySec) * 1000);
  await chrome.alarms.create(alarmName, {
    when: Date.now() + delayMs,
  });
}

/**
 * サイト別監視セッションを終了
 */
async function endMultiSiteSession(siteId, session, options = {}) {
  const { detected = false, reason = "unknown" } = options;

  // Tickアラームをクリア
  const tickAlarmName = getSiteAlarmName(STOCK_WATCH_TICK_ALARM, siteId);
  await chrome.alarms.clear(tickAlarmName);

  // セッションを削除
  await removeMultiSiteSession(siteId);

  const executionOutcome = resolveScheduledWatchExecutionOutcome(
    session?.executionResult,
    reason,
  );
  await updateScheduledWatchExecutionResult(session, {
    ...executionOutcome,
    endedAt: new Date().toISOString(),
    endReason: reason,
  });
  if (session.executionHistoryKey) {
    await completeMonitoringExecutionHistory(session.executionHistoryKey, {
      reason,
      status: executionOutcome.status,
      detail: executionOutcome.decisionReason,
      captureMode: session.fetchModeFallbackToDom ? "reload" : session.fetchMode?.enabled ? "fetch" : "reload",
    });
  }
  await downloadAiSupportFileForMultiSiteSession(session, reason);

  // 終了理由の日本語説明
  const reasonDescriptions = session?.trigger === "immediate" ? {
    window_end: "継続時間終了",
    window_end_after_check: "継続時間終了（チェック後）",
    new_product_detected: "新商品検知",
    manual_stop: "手動停止",
    start_error: "開始エラー",
    unknown: "不明",
  } : {
    window_end: "監視時間帯終了",
    window_end_after_check: "監視時間帯終了（チェック後）",
    new_product_detected: "新商品検知",
    start_error: "開始エラー",
    unknown: "不明",
  };
  const reasonDesc = reasonDescriptions[reason] || reason;
  const scheduleIdx = session?.scheduleIndex ?? 0;
  const isImmediate = session?.trigger === "immediate";
  const logScope = isImmediate ? `[${siteId}][immediate]` : `[${siteId}][schedule:${scheduleIdx}]`;
  const monitoringLabel = isImmediate ? "即時監視" : "監視";

  // 検査タブを閉じる
  let tabClosed = false;
  if (session?.inspectionTabId) {
    try {
      await chrome.tabs.remove(session.inspectionTabId);
      tabClosed = true;
    } catch (error) {
      logger.debug(
        `[${siteId}] タブクローズに失敗（既に閉じられている可能性）:`,
        error.message,
      );
    }
  }

  // 詳細な終了ログ
  bgLogInfo(
    `🛑 ${logScope}【${session?.siteName || siteId}】${monitoringLabel}終了 ${formatJstTimestampReadable()}\n` +
      `  - 理由: ${reasonDesc}\n` +
      `  - 検知: ${detected ? "あり" : "なし"}\n` +
      `  - タブ(ID:${session?.inspectionTabId ?? "なし"}): ${tabClosed ? "閉じました" : "閉じられませんでした"}`,
  );
}

// ============================================================
// 複数サイト監視: 開始処理
// ============================================================

/** サイト別の監視開始ロック */
const multiSiteStartLocks = new Map();

/**
 * サイト別の監視ウィンドウを開始
 * @param {string} siteId - サイトID
 * @param {number} scheduleIndex - スケジュール配列内のインデックス（デフォルト: 0）
 */
async function startScheduledStockWatchForSite(siteId, scheduleIndex = 0, options = {}) {
  // 二重実行防止（スケジュールインデックスも考慮）
  const lockKey = `${siteId}_${scheduleIndex}`;
  if (multiSiteStartLocks.has(lockKey)) {
    logger.warn(
      `⏰ [${siteId}][schedule:${scheduleIndex}] 監視開始処理が既に進行中です`,
    );
    return multiSiteStartLocks.get(lockKey);
  }

  const promise = startScheduledStockWatchForSiteInternal(
    siteId,
    scheduleIndex,
    options,
  ).finally(() => {
    multiSiteStartLocks.delete(lockKey);
  });
  multiSiteStartLocks.set(lockKey, promise);
  return promise;
}

async function startScheduledStockWatchForSiteInternal(
  siteId,
  scheduleIndex = 0,
  options = {},
) {
  let session = null;
  let startedTabId = null;

  try {
    // サイト設定を読み込み
    const sites = await loadScheduledWatchSites();
    const siteConfig = sites.find((s) => s.id === siteId);

    if (!siteConfig) {
      logger.warn(`⏰ [${siteId}] サイト設定が見つかりません`);
      return { success: false, siteId, reason: "site_not_found" };
    }

    const isImmediate = options.trigger === "immediate";
    const durationMinutes = Number(options.durationMinutes);
    if (isImmediate && (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 480)) {
      return { success: false, siteId, reason: "invalid_duration" };
    }

    if (!siteConfig.enabled && options.allowDisabled !== true) {
      logger.info(`⏰ [${siteId}] サイトは無効化されています`);
      return { success: false, siteId, reason: "site_disabled" };
    }

    // スケジュール配列から該当インデックスのスケジュールを取得
    const schedules = getSchedulesFromSite(siteConfig);
    const currentSchedule = schedules[scheduleIndex];
    if (!currentSchedule) {
      logger.warn(
        `⏰ [${siteId}] スケジュールインデックス ${scheduleIndex} が見つかりません`,
      );
      return { success: false, siteId, reason: "schedule_not_found" };
    }

    const targetUrl = siteConfig.url;
    const startTime = currentSchedule.startTime || "11:57";
    const endTime = currentSchedule.endTime || "12:05";
    const intervalSeconds = currentSchedule.intervalSeconds || 60;

    const immediateStartedAt = Date.now();
    const windowEndMs = isImmediate
      ? immediateStartedAt + durationMinutes * 60 * 1000
      : getTodayScheduleTimeMs(endTime);
    if (!isImmediate && Date.now() >= windowEndMs) {
      logger.info(
        `⏰ [${siteId}] 監視終了時刻を過ぎているためスキップしました`,
        {
          scheduleWindowEnd: endTime,
        },
      );
      return { success: false, siteId, reason: "window_ended" };
    }

    // 既存セッションがあるかチェック
    const existingSession = await getMultiSiteSession(siteId);
    if (existingSession?.active) {
      // セッションの監視終了時刻が過去（期限切れ）であれば、古いセッションを削除
      if (
        existingSession.windowEndMs &&
        Date.now() > existingSession.windowEndMs
      ) {
        logger.info(
          `⏰ [${siteId}] 期限切れの古いセッションを検出、クリアして新規開始します`,
          {
            oldSessionWindowEnd: new Date(
              existingSession.windowEndMs,
            ).toISOString(),
            oldSessionStartedAt: existingSession.startedAt,
          },
        );
        await removeMultiSiteSession(siteId);
        // 古いセッション削除後、処理を継続（return しない）
      } else {
        // 有効な実行中セッションがある場合は早期リターン
        logger.warn(`⏰ [${siteId}] 監視ウィンドウは既に実行中です`);
        return {
          success: false,
          siteId,
          reason: "already_running",
          activeTrigger: existingSession.trigger || "scheduled",
        };
      }
    }

    const comparisonKey = targetUrl.replace(/\/$/, "");
    const snapshotResult = await chrome.storage.local.get([
      STOCK_SNAPSHOT_STORAGE_KEY,
    ]);
    const snapshots = snapshotResult[STOCK_SNAPSHOT_STORAGE_KEY] || {};
    const baseline = snapshots[comparisonKey] || { count: 0, urls: [] };

    // fetchMode設定（デフォルト: DOM監視）
    const fetchMode = siteConfig.fetchMode || {
      enabled: false,
      fallbackToDom: true,
    };

    // セッションを作成
    session = {
      id: `${siteId}_${scheduleIndex}_${Date.now()}`,
      siteId,
      siteName: siteConfig.name,
      monitoringScope: "multiple",
      scheduleIndex,
      active: true,
      trigger: isImmediate ? "immediate" : "scheduled",
      phase: "starting",
      comparisonKey,
      targetUrl,
      windowStartMs: isImmediate ? immediateStartedAt : getTodayScheduleTimeMs(startTime),
      windowEndMs,
      baselineUrls: baseline.urls || [],
      baselineCount: baseline.count || 0,
      baselineArtifactsSaved: false,
      reloadIntervalSec: intervalSeconds,
      settings: {
        targetUrl,
        monitorSelector: siteConfig.selectors?.productLinks || "",
        monitoringKind: "list-diff",
        monitoringMode: isImmediate ? "immediate" : "scheduled",
        captureMode: fetchMode.enabled ? "fetch" : "reload",
        interval: intervalSeconds,
        duration: isImmediate
          ? durationMinutes * 60
          : Math.max(0, Math.round((windowEndMs - getTodayScheduleTimeMs(startTime)) / 1000)),
        downloadAiSupportFile: siteConfig.notification?.downloadAiSupportFile === true,
        aiSupportContext: {
          requestId: `${siteId}_${scheduleIndex}`,
          configId: siteId,
          configName: siteConfig.name,
        },
      },
      notifySettings: {
        openDetectedUrl: siteConfig.notification?.openProductUrl ?? true,
        notifyExternalExtension:
          siteConfig.notification?.notifyOtherExtensions ?? false,
        externalExtensionId: siteConfig.notification?.externalExtensionId || null,
        monitorSelector: siteConfig.selectors?.productLinks || "",
        itemCountSelector: siteConfig.selectors?.itemCount || "",
        discordChannelId: siteConfig.notification?.discordChannelId || null,
        notificationSiteId: siteConfig.notification?.siteId || siteId,
      },
      scheduleWindowStart: isImmediate ? "即時開始" : startTime,
      scheduleWindowEnd: isImmediate ? `${durationMinutes}分後` : endTime,
      startedAt: new Date().toISOString(),
      inspectionTabId: null,
      fetchMode,
    };
    if (session.settings.downloadAiSupportFile) {
      session.aiSupportReport = createAiSupportReport(session);
    }
    const executionHistory = await startMonitoringExecutionHistory({
      scope: isImmediate ? "immediate" : "scheduled",
      targetId: siteId,
      targetName: siteConfig.name,
      targetUrl,
      sessionId: `${siteId}_${scheduleIndex}_${Date.now()}`,
      settings: {
        monitoringMode: isImmediate ? "immediate" : "scheduled",
        captureMode: fetchMode.enabled ? "fetch" : "reload",
        reloadIntervalSec: intervalSeconds,
      },
      startedAt: Date.now(),
    });
    session.executionHistoryKey = executionHistory.historyKey;
    await updateScheduledWatchExecutionResult(session, {});

    await setMultiSiteSession(siteId, session);

    // Fetch監視の場合はタブ作成をスキップ
    if (fetchMode.enabled) {
      session.phase = "active";
      await updateScheduledWatchExecutionResult(session, {
        status: "running",
        decisionReason: "Fetch監視モードで監視を開始しました。",
      });
      await setMultiSiteSession(siteId, session);
      await scheduleMultiSiteTick(siteId, 1);

      // Fetch監視開始ログ
      bgLogInfo(
        `${isImmediate ? "🚀" : "⏰"} [${siteId}][${isImmediate ? "immediate" : `schedule:${scheduleIndex}`}] ${isImmediate ? "即時Fetch監視開始" : "Fetch監視開始"} ${formatJstTimestampReadable()}\n` +
          `  - サイト名: ${siteConfig.name}\n` +
          `  - 監視URL: ${targetUrl}\n` +
          `  - ${isImmediate ? "監視継続時間" : "監視時間"}: ${isImmediate ? `${durationMinutes}分` : `${startTime} 〜 ${endTime}`}\n` +
          `  - チェック間隔: ${intervalSeconds}秒\n` +
          `  - ベースライン: ${session.baselineUrls.length}件\n` +
          `  - フォールバック: ${fetchMode.fallbackToDom ? "有効" : "無効"}`,
      );

      logger.info(
        `${isImmediate ? "🚀" : "⏰"} [${siteId}][${isImmediate ? "immediate" : `schedule:${scheduleIndex}`}] ${isImmediate ? "即時Fetch監視を開始しました" : "Fetch監視ウィンドウを開始しました"}`,
        {
          siteId,
          scheduleIndex,
          siteName: siteConfig.name,
          targetUrl,
          scheduleWindowStart: startTime,
          scheduleWindowEnd: endTime,
          intervalSeconds,
          baselineUrlCount: session.baselineUrls.length,
          fetchMode: true,
          fallbackToDom: fetchMode.fallbackToDom,
        },
      );
      return { success: true, siteId, trigger: session.trigger };
    }

    // DOM監視: タブを作成
    const tab = await chrome.tabs.create({ url: targetUrl, active: false });
    startedTabId = tab.id;
    session.inspectionTabId = tab.id;
    await setMultiSiteSession(siteId, session);

    await waitForTabComplete(tab.id);
    await waitForScheduledWatchPageReady(tab.id, targetUrl);

    session.phase = "active";
    await updateScheduledWatchExecutionResult(session, {
      status: "running",
      decisionReason: "指定時刻に監視を開始し、指定セレクタの取得を待機しています。",
    });
    await setMultiSiteSession(siteId, session);
    await scheduleMultiSiteTick(siteId, 1);

    // DOM監視開始ログ（詳細・コンソール表示）
    bgLogInfo(
      `${isImmediate ? "🚀" : "⏰"} [${siteId}][${isImmediate ? "immediate" : `schedule:${scheduleIndex}`}] ${isImmediate ? "即時監視開始" : "監視開始"} ${formatJstTimestampReadable()}\n` +
        `  - サイト名: ${siteConfig.name}\n` +
        `  - 監視URL: ${targetUrl}\n` +
        `  - ${isImmediate ? "監視継続時間" : "監視時間"}: ${isImmediate ? `${durationMinutes}分` : `${startTime} 〜 ${endTime}`}\n` +
        `  - チェック間隔: ${intervalSeconds}秒\n` +
        `  - ベースライン: ${session.baselineUrls.length}件\n` +
        `  - タブID: ${tab.id}`,
    );

    logger.info(
      `${isImmediate ? "🚀" : "⏰"} [${siteId}][${isImmediate ? "immediate" : `schedule:${scheduleIndex}`}] ${isImmediate ? "即時監視を開始しました" : "監視ウィンドウを開始しました"}`,
      {
        siteId,
        scheduleIndex,
        siteName: siteConfig.name,
        targetUrl,
        scheduleWindowStart: startTime,
        scheduleWindowEnd: endTime,
        intervalSeconds,
        baselineUrlCount: session.baselineUrls.length,
        tabId: tab.id,
      },
    );
    return { success: true, siteId, trigger: session.trigger };
  } catch (error) {
    bgLogError(`❌ [${siteId}] 監視ウィンドウ開始エラー:`, error);
    if (startedTabId) {
      try {
        await chrome.tabs.remove(startedTabId);
      } catch (closeError) {
        logger.warn(
          `[${siteId}] 開始失敗時の検査タブクローズに失敗:`,
          closeError.message,
        );
      }
    }
    if (session) {
      await endMultiSiteSession(siteId, session, { reason: "start_error" });
    }
    return { success: false, siteId, reason: "start_error", error: error.message };
  }
}

async function startPopupListWatchNow(targetIds = [], durationMinutes = 3) {
  const requestedIds = [...new Set((Array.isArray(targetIds) ? targetIds : []).filter(Boolean))];
  const duration = Number(durationMinutes);
  if (!requestedIds.length) return { success: false, error: "即時監視する対象を選択してください" };
  if (!Number.isInteger(duration) || duration < 1 || duration > 480) {
    return { success: false, error: "即時監視の継続時間は1〜480分で設定してください" };
  }
  const sites = await loadScheduledWatchSites();
  const results = [];
  for (const targetId of requestedIds) {
    const siteId = `${POPUP_LIST_WATCH_PREFIX}${targetId}`;
    const site = sites.find((item) => item.id === siteId && item.source === "popup-list-watch");
    if (!site) {
      results.push({ targetId, success: false, reason: "target_not_found" });
      continue;
    }
    results.push({ targetId, ...(await startScheduledStockWatchForSite(siteId, 0, {
      trigger: "immediate",
      durationMinutes: duration,
      allowDisabled: true,
    })) });
  }
  const startedCount = results.filter((result) => result.success).length;
  const skippedCount = results.length - startedCount;
  if (startedCount === 0) {
    const reasons = results.map((result) => {
      if (result.reason === "target_not_found") return `${result.targetId}: 設定を確認してください`;
      return `${result.targetId}: ${result.error || result.reason || "開始できませんでした"}`;
    });
    return {
      success: false,
      error: `選択した対象を開始できませんでした（${reasons.join(" / ")}）`,
      durationMinutes: duration,
      startedCount,
      skippedCount,
      results,
    };
  }
  return { success: true, durationMinutes: duration, startedCount, skippedCount, results };
}

async function stopPopupListWatchNow(targetIds = []) {
  const requestedIds = [...new Set((Array.isArray(targetIds) ? targetIds : []).filter(Boolean))];
  if (!requestedIds.length) return { success: false, error: "停止する即時監視の対象を選択してください" };
  const results = [];
  for (const targetId of requestedIds) {
    const siteId = `${POPUP_LIST_WATCH_PREFIX}${targetId}`;
    const session = await getMultiSiteSession(siteId);
    if (!session?.active || session.trigger !== "immediate") {
      results.push({ targetId, success: false, reason: "immediate_not_running" });
      continue;
    }
    await endMultiSiteSession(siteId, session, { reason: "manual_stop" });
    results.push({ targetId, success: true });
  }
  const stoppedCount = results.filter((result) => result.success).length;
  return { success: true, stoppedCount, skippedCount: results.length - stoppedCount, results };
}

// ============================================================
// 複数サイト監視: Tick処理
// ============================================================

/**
 * スナップショット処理の共通ロジック（Fetch/DOM両対応）
 * @param {string} siteId - サイトID
 * @param {Object} session - セッション情報
 * @param {Object} snapshot - 取得したスナップショット
 * @param {string} mode - "fetch" または "dom"
 */
async function handleSnapshotProcessing(siteId, session, snapshot, mode = "dom") {
  const isFetchMode = mode === "fetch";

  if (snapshot) {
    await updateScheduledWatchExecutionResult(session, {
      status: "running",
      snapshotCaptured: true,
      selectorTextCaptured: Boolean(session.executionResult?.selectorTextCaptured || snapshot.textPreview?.trim()),
      matchedCount: Number(snapshot.matchedCount || 0),
      snapshotCount: Number(snapshot.count || 0),
      textPreview: snapshot.textPreview || session.executionResult?.textPreview || "",
      tickCount: Number(session.executionResult?.tickCount || 0) + 1,
      lastSnapshotAt: new Date().toISOString(),
      decisionReason: isFetchMode
        ? "Fetch監視でデータを取得し、監視を継続しています。"
        : "指定セレクタのテキストを取得し、監視を継続しています。",
    });
  }

  if (!snapshot) {
    await setMultiSiteSession(siteId, session);
    await scheduleMultiSiteTick(siteId, session.reloadIntervalSec);
    return;
  }

  // 初回ベースライン設定
  if (
    (session.baselineUrls || []).length === 0 &&
    (snapshot.urls || []).length > 0
  ) {
    session.baselineUrls = snapshot.urls || [];
    session.baselineCount = Number(snapshot.count || 0);

    // baseline証跡保存（Fetchモードではタブがないためスキップ）
    if (!isFetchMode && !session.baselineArtifactsSaved && session.inspectionTabId) {
      try {
        await saveScheduledStockBaselineArtifacts(session, snapshot, session.inspectionTabId);
        session.baselineArtifactsSaved = true;
      } catch (artifactError) {
        logger.warn(
          `[${siteId}] baseline 証跡保存に失敗:`,
          artifactError.message,
        );
      }
    }

    // ベースラインをストレージに永続化
    await persistStockSnapshot(session.comparisonKey, snapshot);

    await setMultiSiteSession(siteId, session);
    logger.info(
      `⏰ [${siteId}] 監視セッション基準を初回スナップショットで設定しました`,
      {
        siteId,
        baselineUrlCount: session.baselineUrls.length,
        baselineCount: session.baselineCount,
        mode,
      },
    );

    // 次のTickをスケジュール（DOM監視時はリロード、Fetch監視時はそのまま）
    if (Date.now() < session.windowEndMs) {
      if (!isFetchMode && session.inspectionTabId) {
        try {
          await chrome.tabs.reload(session.inspectionTabId);
          await waitForTabComplete(session.inspectionTabId);
          await waitForScheduledWatchPageReady(session.inspectionTabId, session.targetUrl);
        } catch (reloadError) {
          logger.warn(
            `[${siteId}] 初回基準設定後のリロードに失敗:`,
            reloadError.message,
          );
        }
      }
      await setMultiSiteSession(siteId, session);
      await scheduleMultiSiteTick(siteId, session.reloadIntervalSec);
    }
    return;
  }

  // 差分検知
  const newUrls = diffStockProductUrls(
    session.baselineUrls,
    snapshot.urls || [],
  );

  if (newUrls.length > 0) {
    let persistSnapshot = snapshot;
    // AEON URL の場合、DOM監視時のみ再取得
    if (!isFetchMode && isAeonProductListUrl(session.targetUrl) && session.inspectionTabId) {
      const captureSettings = {
        monitorSelector: session.notifySettings?.monitorSelector || "",
        itemCountSelector: session.notifySettings?.itemCountSelector || "",
      };
      persistSnapshot = await captureScheduledSnapshot(session.inspectionTabId, captureSettings, {
        mode: "baseline",
        targetUrl: session.targetUrl,
      });
    }
    await handleMultiSiteDetection(
      siteId,
      session,
      snapshot,
      newUrls,
      session.inspectionTabId,
      persistSnapshot,
    );
    await endMultiSiteSession(siteId, session, {
      detected: true,
      reason: "new_product_detected",
    });
    return;
  }

  // 監視終了時刻の再チェック
  if (Date.now() >= session.windowEndMs) {
    await endMultiSiteSession(siteId, session, {
      detected: false,
      reason: "window_end_after_check",
    });
    return;
  }

  // 次のTickへ（Fetch監視時はリロード不要）
  if (!isFetchMode && session.inspectionTabId) {
    try {
      await runPeriodicReload(session.inspectionTabId, "C", (context) =>
        waitForScheduledWatchPageReady(session.inspectionTabId, session.targetUrl, context),
      );
    } catch (reloadError) {
      logger.warn(`[${siteId}] 一覧リロードに失敗:`, reloadError.message);
    }
  }

  await setMultiSiteSession(siteId, session);
  await scheduleMultiSiteTick(siteId, session.reloadIntervalSec);
}

/** サイト別のTick実行ロック */
const multiSiteTickLocks = new Map();

/**
 * サイト別のTick処理
 */
async function runStockWatchTickForSite(siteId) {
  if (multiSiteTickLocks.has(siteId)) {
    logger.debug(`⏰ [${siteId}] tick は実行中のためスキップします`);
    return multiSiteTickLocks.get(siteId);
  }

  const promise = runStockWatchTickForSiteInternal(siteId).finally(() => {
    multiSiteTickLocks.delete(siteId);
  });
  multiSiteTickLocks.set(siteId, promise);
  return promise;
}

async function runStockWatchTickForSiteInternal(siteId) {
  const session = await getMultiSiteSession(siteId);

  if (!session?.active) {
    return;
  }

  // Fetch監視モードの判定（inspectionTabId が null でもフェーズが active なら処理を続行）
  const isFetchMode = session.fetchMode?.enabled && !session.fetchModeFallbackToDom;

  if (session.phase === "starting") {
    logger.debug(`⏰ [${siteId}] 監視開始処理中のため tick を延期します`);
    await scheduleMultiSiteTick(siteId, 2);
    return;
  }

  // DOM監視モードでタブIDがない場合は延期
  if (!isFetchMode && session.inspectionTabId == null) {
    logger.debug(`⏰ [${siteId}] タブ準備中のため tick を延期します`);
    await scheduleMultiSiteTick(siteId, 2);
    return;
  }

  // 監視終了時刻チェック
  if (Date.now() >= session.windowEndMs) {
    const checkStartedAt = Date.now();
    let snapshot = null;
    try {
      const settings = {
        monitorSelector: session.notifySettings?.monitorSelector || "",
        itemCountSelector: session.notifySettings?.itemCountSelector || "",
        selectors: { productLinks: session.notifySettings?.monitorSelector || "" },
      };
      if (isFetchMode) {
        snapshot = await captureScheduledSnapshotViaFetch(session.targetUrl, settings);
      } else if (session.inspectionTabId) {
        snapshot = await captureScheduledSnapshot(
          session.inspectionTabId,
          settings,
        );
      }
      if (snapshot) {
        const executionRecord = await appendMonitoringExecutionCheck(session.executionHistoryKey, {
          startedAt: new Date(checkStartedAt).toISOString(),
          durationMs: Date.now() - checkStartedAt,
          captureMode: isFetchMode ? "fetch" : "reload",
          result: snapshot.fetchError ? "fetch_error" : "success",
          detail: snapshot.fetchError || `${snapshot.count || snapshot.urls?.length || 0}件を取得（終了時確認）`,
        });
        if (isFetchMode) {
          const message = buildFetchExecutionCheckLogMessage({
            systemLabel: "系統C",
            targetLabel: `${siteId}][schedule:${session.scheduleIndex ?? 0}`,
            executionRecord,
          configuredIntervalSeconds: session.reloadIntervalSec,
          extraLines: ["終了時確認"],
        });
          if (message) {
            if (snapshot.fetchError) bgLogWarn(message);
            else bgLogInfo(message);
          }
        }
        await updateScheduledWatchExecutionResult(session, {
          status: "running",
          snapshotCaptured: true,
          selectorTextCaptured: Boolean(session.executionResult?.selectorTextCaptured || snapshot.textPreview?.trim()),
          matchedCount: Number(snapshot.matchedCount || 0),
          snapshotCount: Number(snapshot.count || 0),
          textPreview: snapshot.textPreview || session.executionResult?.textPreview || "",
          tickCount: Number(session.executionResult?.tickCount || 0) + 1,
          lastSnapshotAt: new Date().toISOString(),
          decisionReason: "指定セレクタの取得を確認し、監視終了処理を実行しています。",
        });
      }
    } catch (error) {
      const executionRecord = await appendMonitoringExecutionCheck(session.executionHistoryKey, {
        startedAt: new Date(checkStartedAt).toISOString(),
        durationMs: Date.now() - checkStartedAt,
        captureMode: isFetchMode ? "fetch" : "reload",
        result: "error",
        detail: error.message || "終了時確認に失敗しました",
      });
      if (isFetchMode) {
        const message = buildFetchExecutionCheckLogMessage({
          systemLabel: "系統C",
          targetLabel: `${siteId}][schedule:${session.scheduleIndex ?? 0}`,
          executionRecord,
          configuredIntervalSeconds: session.reloadIntervalSec,
          extraLines: ["終了時確認"],
        });
        if (message) bgLogWarn(message);
      }
      logger.warn(
        `[${siteId}] 終了時スナップショット取得に失敗:`,
        error.message,
      );
    }
    await endMultiSiteSession(siteId, session, {
      detected: false,
      reason: "window_end",
    });
    return;
  }

  // Fetch監視モードの処理
  if (isFetchMode) {
    const checkStartedAt = Date.now();
    const captureSettings = {
      selectors: { productLinks: session.notifySettings?.monitorSelector || "" },
    };
    const captureMode =
      (session.baselineUrls || []).length === 0 ? "baseline" : "monitor";
    let snapshot;

    try {
      snapshot = await captureScheduledSnapshotViaFetch(session.targetUrl, captureSettings);
    } catch (error) {
      bgLogError(`❌ [${siteId}] Fetch監視に失敗しました:`, error);
      snapshot = null;
    }

    // Fetch失敗時のフォールバック処理
    if (!snapshot || snapshot.fetchError) {
      const executionRecord = await appendMonitoringExecutionCheck(session.executionHistoryKey, {
        startedAt: new Date(checkStartedAt).toISOString(),
        durationMs: Date.now() - checkStartedAt,
        captureMode: "fetch",
        result: "fetch_error",
        detail: snapshot?.fetchError || "Fetch取得に失敗しました",
      });
      const message = buildFetchExecutionCheckLogMessage({
        systemLabel: "系統C",
        targetLabel: `${siteId}][schedule:${session.scheduleIndex ?? 0}`,
        executionRecord,
        configuredIntervalSeconds: session.reloadIntervalSec,
      });
      if (message) bgLogWarn(message);
      const shouldFallback = session.fetchMode?.fallbackToDom;
      if (shouldFallback) {
        await appendMonitoringExecutionEvent(session.executionHistoryKey, {
          type: "fallback", result: "fallback", captureMode: "reload",
          detail: "Fetch失敗のためDOM監視へフォールバックしました",
        });
        bgLogWarn(
          `⏰ [${siteId}] Fetch監視失敗、DOM監視へフォールバックします\n` +
            `  - エラー: ${snapshot?.fetchError || "取得失敗"}\n` +
            `  - HTTPステータス: ${snapshot?.fetchStatus || "N/A"}`,
        );

        // DOM監視へ切り替え
        session.fetchModeFallbackToDom = true;
        const tab = await chrome.tabs.create({
          url: session.targetUrl,
          active: false,
        });
        session.inspectionTabId = tab.id;
        await setMultiSiteSession(siteId, session);
        await waitForTabComplete(tab.id);
        await waitForScheduledWatchPageReady(tab.id, session.targetUrl);

        // 次回tickでDOM監視を実行
        await scheduleMultiSiteTick(siteId, session.reloadIntervalSec);
        return;
      } else {
        bgLogError(`❌ [${siteId}] Fetch監視失敗、フォールバック無効のため終了`);
        await endMultiSiteSession(siteId, session, { reason: "fetch_error" });
        return;
      }
    }

    const executionRecord = await appendMonitoringExecutionCheck(session.executionHistoryKey, {
      startedAt: new Date(checkStartedAt).toISOString(),
      durationMs: Date.now() - checkStartedAt,
      captureMode: "fetch",
      result: "success",
      detail: `${snapshot.count || snapshot.urls?.length || 0}件を取得`,
    });

    // Fetch監視成功時のログ
    const scheduleIdx = session.scheduleIndex ?? 0;
    const isImmediate = session.trigger === "immediate";
    const logTargetLabel = isImmediate ? `${siteId}][immediate` : `${siteId}][schedule:${scheduleIdx}`;
    const remainingMs = session.windowEndMs - Date.now();
    const remainingMin = Math.max(0, Math.floor(remainingMs / 60000));
    const remainingSec = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
    const message = buildFetchExecutionCheckLogMessage({
      systemLabel: "系統C",
      targetLabel: logTargetLabel,
      executionRecord,
      configuredIntervalSeconds: session.reloadIntervalSec,
      extraLines: [
        `現在URL数: ${snapshot?.urls?.length ?? "取得失敗"}`,
        `ベースライン: ${session.baselineUrls?.length ?? 0}`,
        `次回チェック: ${session.reloadIntervalSec}秒後`,
        `${isImmediate ? "即時監視の終了予定" : "監視終了予定"}: ${session.scheduleWindowEnd}（残り${remainingMin}分${remainingSec}秒）`,
      ],
    });
    if (message) bgLogInfo(message);

    // 以降は通常のスナップショット処理へ（この後の共通処理で扱う）
    // snapshot変数を使って以降の処理を実行
    await handleSnapshotProcessing(siteId, session, snapshot, "fetch");
    return;
  }

  // DOM監視モード: タブ存在確認
  let tabId = session.inspectionTabId;
  try {
    await chrome.tabs.get(tabId);
  } catch {
    // タブが閉じられていた場合は再作成
    const tab = await chrome.tabs.create({
      url: session.targetUrl,
      active: false,
    });
    tabId = tab.id;
    session.inspectionTabId = tabId;
    await setMultiSiteSession(siteId, session);
    await waitForTabComplete(tabId);
    await waitForScheduledWatchPageReady(tabId, session.targetUrl);
  }

  // DOM監視: スナップショット取得
  const captureSettings = {
    monitorSelector: session.notifySettings?.monitorSelector || "",
    itemCountSelector: session.notifySettings?.itemCountSelector || "",
  };
  const checkStartedAt = Date.now();
  const captureMode =
    (session.baselineUrls || []).length === 0 ? "baseline" : "monitor";
  let snapshot;
  try {
    snapshot = await captureScheduledSnapshot(tabId, captureSettings, {
      mode: captureMode,
      targetUrl: session.targetUrl,
    });
  } catch (error) {
    await appendMonitoringExecutionCheck(session.executionHistoryKey, {
      startedAt: new Date(checkStartedAt).toISOString(),
      durationMs: Date.now() - checkStartedAt,
      captureMode: "reload",
      result: "error",
      detail: error.message || "DOM取得に失敗しました",
    });
    bgLogError(`❌ [${siteId}] 指定セレクタの取得に失敗しました:`, error);
    await endMultiSiteSession(siteId, session, { reason: "capture_error" });
    return;
  }

  await appendMonitoringExecutionCheck(session.executionHistoryKey, {
    startedAt: new Date(checkStartedAt).toISOString(),
    durationMs: Date.now() - checkStartedAt,
    captureMode: "reload",
    result: "success",
    detail: `${snapshot.count || snapshot.urls?.length || 0}件を取得`,
  });

  // DOM監視 Tick実行ログ（詳細）
  const scheduleIdx = session.scheduleIndex ?? 0;
  const isImmediate = session.trigger === "immediate";
  const logScope = isImmediate ? `[${siteId}][immediate]` : `[${siteId}][schedule:${scheduleIdx}]`;
  const remainingMs = session.windowEndMs - Date.now();
  const remainingMin = Math.max(0, Math.floor(remainingMs / 60000));
  const remainingSec = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
  bgLogProgress(
    `${isImmediate ? "🚀" : "⏰"} ${logScope}【${session.siteName}】${isImmediate ? "即時監視 Tick実行" : "Tick実行"} ${formatJstTimestampReadable()}\n` +
      `  - 監視URL: ${session.targetUrl}\n` +
      `  - 現在URL数: ${snapshot?.urls?.length ?? "取得失敗"}\n` +
      `  - ベースライン: ${session.baselineUrls?.length ?? 0}\n` +
      `  - 次回チェック: ${session.reloadIntervalSec}秒後\n` +
      `  - ${isImmediate ? "即時監視の終了予定" : "監視終了予定"}: ${session.scheduleWindowEnd} (残り${remainingMin}分${remainingSec}秒)`,
    {
      event: "scheduled-watch-tick",
      scope: { siteId, trigger: session.trigger || "scheduled", scheduleIndex: scheduleIdx },
    },
  );

  // DOM監視のスナップショット処理を共通ヘルパーで実行
  await handleSnapshotProcessing(siteId, session, snapshot, "dom");
}

/**
 * 複数サイト監視での検知時処理
 */
async function handleMultiSiteDetection(
  siteId,
  session,
  snapshot,
  newUrls,
  tabId,
  persistSnapshot = snapshot,
) {
  const scheduleIdx = session?.scheduleIndex ?? 0;

  // 検知ログ（詳細・コンソール表示）
  const urlList = newUrls
    .slice(0, 10)
    .map((url) => `    - ${url}`)
    .join("\n");
  const moreCount =
    newUrls.length > 10 ? `\n    ... 他${newUrls.length - 10}件` : "";
  bgLogInfo(
    `🎉 [${siteId}][schedule:${scheduleIdx}] 新商品検知! ${formatJstTimestampReadable()}\n` +
      `  - 検知数: ${newUrls.length}\n` +
      `  - ベースライン: ${session.baselineUrls?.length ?? 0} → 現在: ${snapshot?.urls?.length ?? 0}\n` +
      `  - 新規URL:\n${urlList}${moreCount}`,
  );

  logger.info(`🎉 [${siteId}] 新商品を検知しました！`, {
    siteId,
    scheduleIndex: scheduleIdx,
    newUrlCount: newUrls.length,
    newUrls: newUrls.slice(0, 5),
  });

  // ログ保存
  const savedAt = new Date();
  const logEntry = {
    timestamp: savedAt.toISOString(),
    siteId,
    siteName: session.siteName || "",
    targetUrl: session.targetUrl,
    comparisonKey: session.comparisonKey,
    previousCount: session.baselineCount,
    currentCount: snapshot.count || 0,
    newUrls,
    detectedUrls: snapshot.urls || [],
    usedSelector: session.notifySettings?.monitorSelector || "",
  };

  try {
    await saveScheduledStockLog(logEntry);
  } catch (error) {
    logger.warn(`[${siteId}] ログ保存に失敗:`, error.message);
  }

  // スナップショット永続化
  try {
    await persistStockSnapshot(
      session.comparisonKey,
      persistSnapshot || snapshot,
    );
  } catch (error) {
    logger.warn(`[${siteId}] スナップショット永続化に失敗:`, error.message);
  }

  await saveScheduledStockDetectionArtifacts({ ...session, siteId }, tabId, savedAt);

  // 検知URLを新規タブで開く
  if (session.notifySettings?.openDetectedUrl && newUrls.length > 0) {
    for (const url of newUrls.slice(0, 3)) {
      try {
        await chrome.tabs.create({ url, active: false });
      } catch (error) {
        logger.warn(`[${siteId}] 検知URL展開に失敗:`, error.message);
      }
    }
  }

  // 外部拡張通知（discordChannelIdで通知先を分離）
  if (session.notifySettings?.notifyExternalExtension) {
    try {
      // 外部拡張IDは設定から取得（将来的にはJSONに追加も可能）
      const sites = await loadScheduledWatchSites();
      const siteConfig = sites.find((s) => s.id === siteId);

      // 外部拡張IDがある場合のみ通知
      const externalExtensionId =
        siteConfig?.notification?.externalExtensionId ||
        session.notifySettings?.externalExtensionId;
      if (externalExtensionId) {
        const notifySettings = {
          notifyExternalExtension: true,
          externalExtensionId,
        };
        await notifyExternalExtension(notifySettings, newUrls, logEntry, {
          siteId: session.notifySettings?.notificationSiteId || siteId,
          discordChannelId: session.notifySettings?.discordChannelId,
        });
      }
    } catch (error) {
      logger.warn(`[${siteId}] 外部拡張通知に失敗:`, error.message);
    }
  }

  await notifyGmailForNewProductDetection(session, snapshot, newUrls);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function showInventoryDetectionNotification(event = {}) {
  const isKeyword = event.type === "keyword";
  const title = isKeyword ? "在庫を検知" : "在庫差分を検知";
  const message = isKeyword
    ? `${event.detectMode === "disappear" ? "消失" : "出現"}を検知: ${event.keyword || "キーワード"}\n${event.targetUrl || ""}`
    : `新規${Number(event.newUrlCount || 0)}件を検知（${Number(event.previousCount || 0)}件 → ${Number(event.currentCount || 0)}件）`;
  try {
    const notification = await ChromeNotify.show({
      type: "basic",
      iconUrl: "/icons/icon48.png",
      title,
      message,
    });
    if (!notification.success) {
      bgLogWarn(`❌ ${title}通知の表示に失敗しました:`, notification.error);
    }
    return notification;
  } catch (error) {
    const notification = { success: false, error: error?.message || String(error) };
    bgLogWarn(`❌ ${title}通知の表示に失敗しました:`, notification.error);
    return notification;
  }
}

function classifyStockFetchDiagnosis({ fetchAnalysis, domAnalysis, fetchError } = {}) {
  if (fetchAnalysis?.error?.code === "INVALID_SELECTOR" ||
      domAnalysis?.error?.code === "INVALID_SELECTOR") {
    return "INVALID_SELECTOR";
  }
  if (fetchError) {
    return "FETCH_ERROR";
  }

  const fetchMatches = fetchAnalysis?.matchCount > 0 && fetchAnalysis?.hasKeyword === true;
  const domMatches = domAnalysis?.matchCount > 0 && domAnalysis?.hasKeyword === true;
  if (fetchMatches && domMatches) {
    return "FETCH_COMPATIBLE_CANDIDATE";
  }
  if (domMatches) {
    return "DOM_ONLY_CANDIDATE";
  }
  return "NO_MATCH";
}

function isOffscreenTargetMessage(request) {
  return request?.target === "offscreen";
}

let offscreenDocumentCreating = null;

async function ensureOffscreenDocument() {
  if (offscreenDocumentCreating) {
    await offscreenDocumentCreating;
    return;
  }

  try {
    if (chrome.runtime.getContexts) {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: ["OFFSCREEN_DOCUMENT"],
      });
      if (contexts.length > 0) {
        return;
      }
    }
  } catch (contextError) {
    logger.debug("offscreen コンテキスト確認をスキップ:", contextError.message);
  }

  offscreenDocumentCreating = chrome.offscreen.createDocument({
    url: "src/offscreen/offscreen.html",
    reasons: ["BLOBS", "DOM_PARSER"],
    justification: "Save baseline artifacts and analyze stock HTML with DOMParser",
  });
  await offscreenDocumentCreating;
  offscreenDocumentCreating = null;
}

/**
 * 指定セレクタの要素が見える位置までスクロール
 * @param {number} tabId - タブID
 * @param {string} selector - CSSセレクタ
 * @returns {Promise<{success: boolean, found: boolean}>}
 */
async function scrollToElement(tabId, selector, scrollOffset = 0) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel, offset) => {
        const element = document.querySelector(sel);
        if (element) {
          const beforeY = window.scrollY;
          const beforeRect = element.getBoundingClientRect();

          // シンプルに scrollIntoView を使用
          element.scrollIntoView({ behavior: "instant", block: "start" });

          // 追加オフセットがあれば適用（固定ヘッダー対策）
          if (offset > 0) {
            window.scrollBy(0, offset);
          }

          const afterY = window.scrollY;
          const afterRect = element.getBoundingClientRect();

          return {
            success: true,
            found: true,
            beforeY,
            afterY,
            beforeTop: beforeRect.top,
            afterTop: afterRect.top,
            scrolled: afterY !== beforeY,
            offsetApplied: offset,
          };
        }
        return { success: false, found: false };
      },
      args: [selector, scrollOffset],
    });
    return results?.[0]?.result || { success: false, found: false };
  } catch (error) {
    logger.debug("scrollToElement エラー:", error.message);
    return { success: false, found: false, error: error.message };
  }
}

async function captureWatchTabScreenshot(tabId, targetUrl) {
  // 排他制御：前のスクリーンショット取得が完了するまで待機
  while (screenshotLock) {
    await screenshotLock;
  }

  // 新しいロックを設定
  let releaseLock;
  screenshotLock = new Promise((resolve) => {
    releaseLock = resolve;
  });

  try {
    const tabInfo = await chrome.tabs.get(tabId);
    await chrome.tabs.update(tabId, { active: true });
    try {
      await chrome.windows.update(tabInfo.windowId, {
        focused: true,
        drawAttention: false,
      });
    } catch (windowError) {
      logger.debug("ウィンドウフォーカス失敗（続行）:", windowError.message);
    }

    if (targetUrl) {
      await waitForScheduledWatchPageReady(tabId, targetUrl);
    } else {
      await waitForTabComplete(tabId);
      await delay(300);
    }
    await delay(400);

    // screenshotTarget セレクタがあれば、その要素が見える位置までスクロール
    if (targetUrl) {
      const sites = await loadScheduledWatchSites();
      bgLogDebug("[DEBUG] screenshotTarget 処理開始", {
        targetUrl,
        sitesCount: sites.length,
      });

      const site = sites.find((s) => {
        if (!s.enabled || !s.url) return false;
        try {
          const siteHostname = new URL(s.url).hostname;
          const match = targetUrl.includes(siteHostname);
          bgLogDebug("[DEBUG] サイトマッチング", {
            siteId: s.id,
            siteHostname,
            match,
          });
          return match;
        } catch {
          return false;
        }
      });

      bgLogDebug("[DEBUG] マッチしたサイト", {
        siteId: site?.id,
        screenshotTarget: site?.selectors?.screenshotTarget,
      });

      if (site?.selectors?.screenshotTarget) {
        const scrollOffset = site.selectors.scrollOffset;
        // scrollOffset が false または undefined の場合はスクロールをスキップ
        // scrollOffset: 0 は「要素位置までスクロールするが追加オフセットなし」
        // scrollOffset: false または未設定は「スクロールしない」
        if (scrollOffset !== false && scrollOffset !== undefined) {
          const scrollResult = await scrollToElement(
            tabId,
            site.selectors.screenshotTarget,
            scrollOffset,
          );
          bgLogDebug("[DEBUG] scrollToElement 結果", scrollResult, {
            scrollOffset,
          });
          if (scrollResult.found) {
            logger.debug(
              `[${site.id}] screenshotTarget へスクロール: ${site.selectors.screenshotTarget}`,
            );
            await delay(500); // 待機時間を増加

            // スクリーンショット直前のスクロール位置を確認
            const posCheck = await chrome.scripting.executeScript({
              target: { tabId },
              func: () => ({
                scrollY: window.scrollY,
                innerHeight: window.innerHeight,
              }),
            });
            bgLogDebug(
              "[DEBUG] スクリーンショット直前の位置",
              posCheck?.[0]?.result,
            );
          }
        } else {
          bgLogDebug(
            "[DEBUG] scrollOffset が false または未設定のためスクロールをスキップ",
            { scrollOffset },
          );
        }
      }
    }

    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const screenshot = await chrome.tabs.captureVisibleTab(
          tabInfo.windowId,
          { format: "png" },
        );
        if (!screenshot?.startsWith("data:image")) {
          throw new Error("invalid screenshot data");
        }
        return screenshot;
      } catch (error) {
        lastError = error;
        logger.warn(
          `スクリーンショット取得リトライ (${attempt}/3):`,
          error.message,
        );
        await delay(500 * attempt);
      }
    }
    throw lastError;
  } finally {
    // ロックを解放
    screenshotLock = null;
    releaseLock();
  }
}

async function captureTabHtml(tabId) {
  const htmlResult = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.documentElement.outerHTML,
  });
  return htmlResult[0]?.result || "";
}

async function captureBaselineArtifactContext(tabId, targetUrl) {
  const screenshot = await captureWatchTabScreenshot(tabId, targetUrl);
  const html = await captureTabHtml(tabId);
  return { screenshot, html };
}

async function saveScheduledStockBaselineArtifacts(session, snapshot, tabId) {
  const savedAt = new Date();
  const fileOptions = { siteName: session.siteName || "" };
  const artifactContext = session?.baselineArtifactContext || null;

  const pngPath = buildAeonStockDownloadPath(
    "baseline",
    savedAt,
    "png",
    fileOptions,
  );
  const htmlPath = buildAeonStockDownloadPath(
    "baseline",
    savedAt,
    "html",
    fileOptions,
  );
  const txtPath = buildAeonStockDownloadPath(
    "baseline",
    savedAt,
    "txt",
    fileOptions,
  );

  const artifacts = [];
  try {
    const screenshot =
      artifactContext?.screenshot ||
      (await captureWatchTabScreenshot(tabId, session.targetUrl));
    const result = await FileSave.saveScreenshot({ filename: pngPath, dataUrl: screenshot });
    artifacts.push({ kind: "baseline PNG", filename: pngPath, downloadId: result.downloadId, success: true });
    logger.info("📸 baseline PNG 保存完了", { pngPath });
  } catch (error) {
    artifacts.push({ kind: "baseline PNG", filename: pngPath, success: false, error: error.message });
    logger.warn("baseline PNG 保存失敗:", error.message);
  }

  try {
    const html = artifactContext?.html || (await captureTabHtml(tabId));
    const result = await FileSave.saveHtml({ filename: htmlPath, html });
    artifacts.push({ kind: "baseline HTML", filename: htmlPath, downloadId: result.downloadId, success: true });
    logger.info("📄 baseline HTML 保存完了", { htmlPath });
  } catch (error) {
    artifacts.push({ kind: "baseline HTML", filename: htmlPath, success: false, error: error.message });
    logger.warn("baseline HTML 保存失敗:", error.message);
  }

  try {
    const logText = buildBaselineLogText(snapshot, session);
    const result = await FileSave.download({
      filename: txtPath,
      textContent: logText,
      mimeType: "text/plain;charset=utf-8",
    });
    artifacts.push({ kind: "baseline TXT", filename: txtPath, downloadId: result.downloadId, success: true });
    logger.info("📝 baseline txt 保存完了", { txtPath });
  } catch (error) {
    artifacts.push({ kind: "baseline TXT", filename: txtPath, success: false, error: error.message });
    logger.warn("baseline txt 保存失敗:", error.message);
  }

  logger.info("📁 baseline 証跡を保存しました", { pngPath, htmlPath, txtPath });
  return artifacts;
}

async function saveScheduledStockDetectionArtifacts(session, tabId, savedAt = new Date()) {
  const fileOptions = { siteName: session.siteName || "" };
  const artifacts = [];
  const pngPath = buildAeonStockDownloadPath("detected", savedAt, "png", fileOptions);
  const htmlPath = buildAeonStockDownloadPath("detected", savedAt, "html", fileOptions);
  try {
    const screenshot = await captureWatchTabScreenshot(tabId, session.targetUrl);
    const result = await FileSave.saveScreenshot({ filename: pngPath, dataUrl: screenshot });
    artifacts.push({ kind: "detected PNG", filename: pngPath, downloadId: result.downloadId, success: true });
    logger.info(`📸 [${session.siteId || "C"}] detected PNG 保存完了`, { pngPath });
  } catch (error) {
    artifacts.push({ kind: "detected PNG", filename: pngPath, success: false, error: error.message });
    logger.warn(`detected PNG 保存失敗:`, error.message);
  }
  try {
    const htmlResult = await chrome.scripting.executeScript({ target: { tabId }, func: () => document.documentElement.outerHTML });
    const html = htmlResult[0]?.result || "";
    const result = await FileSave.saveHtml({ filename: htmlPath, html });
    artifacts.push({ kind: "detected HTML", filename: htmlPath, downloadId: result.downloadId, success: true });
    logger.info(`📄 [${session.siteId || "C"}] detected HTML 保存完了`, { htmlPath });
  } catch (error) {
    artifacts.push({ kind: "detected HTML", filename: htmlPath, success: false, error: error.message });
    logger.warn(`detected HTML 保存失敗:`, error.message);
  }
  return artifacts;
}

async function saveScheduledStockLog(logEntry) {
  const result = await chrome.storage.local.get([STOCK_LOG_STORAGE_KEY]);
  const logs = result[STOCK_LOG_STORAGE_KEY] || [];
  logs.push(logEntry);
  await chrome.storage.local.set({
    [STOCK_LOG_STORAGE_KEY]: logs.slice(-200),
  });

  const savedAt = new Date(logEntry.timestamp || Date.now());
  const fileOptions = { siteName: logEntry.siteName || "" };
  const filename = buildAeonStockDownloadPath(
    "detected",
    savedAt,
    "txt",
    fileOptions,
  );
  await FileSave.download({
    filename,
    textContent: buildStockLogText(logEntry),
    mimeType: "text/plain;charset=utf-8",
  });
}

async function notifyExternalExtension(settings, urls, logEntry, options = {}) {
  if (!settings.notifyExternalExtension || !settings.externalExtensionId) {
    return { skipped: true };
  }

  // オプションからsiteIdとdiscordChannelIdを取得（複数サイト監視対応）
  const siteId = options.siteId || settings.notificationSiteId || "aeon";
  const discordChannelId =
    options.discordChannelId || settings.discordChannelId || null;

  try {
    const message = {
      type: "PAGE_RECORDER_STOCK_DETECTED",
      source: "PageRecorder",
      siteId,
      urls,
      targetUrl: logEntry.targetUrl,
      title: logEntry.title,
      count: logEntry.currentCount,
    };

    if (options.targetpage) {
      message.targetId = options.targetpage.id;
      message.environment = options.targetpage.environment;
      message.eventId = options.targetpage.eventId;
      message.detectedAt = options.targetpage.detectedAt;
    }

    // discordChannelIdが指定されている場合は追加
    if (discordChannelId) {
      message.discordChannelId = discordChannelId;
    }

    bgLogInfo("📨 他拡張通知を送信します", {
      siteId,
      discordChannelId,
      urls: urls.length,
      externalExtensionId: settings.externalExtensionId,
    });

    const result = await ExternalMessaging.send({
      extensionId: settings.externalExtensionId,
      message,
    });
    if (!result.success || result.response?.success === false) {
      const error = result.error || result.response?.error || "receiver_rejected";
      bgLogWarn("❌ 他拡張通知失敗:", error);
      return result.success ? result.response : result;
    }
    bgLogInfo("✅ 他拡張通知処理成功", {
      siteId,
      discordChannelId,
      urls: urls.length,
      response: result.response,
    });
    return result.response;
  } catch (error) {
    bgLogWarn("❌ 他拡張通知失敗:", error.message);
    return { success: false, error: error.message };
  }
}

function buildTargetpageNotificationOptions(settings = {}, sessionId, detectedAt = new Date().toISOString()) {
  const profile = settings.targetpage;
  if (!profile || typeof profile !== "object") return {};
  if (
    typeof profile.id !== "string" || !profile.id ||
    !["test", "prod"].includes(profile.environment) ||
    typeof profile.siteId !== "string" || !profile.siteId ||
    typeof sessionId !== "string" || !sessionId
  ) {
    return {};
  }
  return {
    siteId: profile.siteId,
    targetpage: {
      id: profile.id,
      environment: profile.environment,
      eventId: `${profile.id}:${sessionId}:${Date.now()}`,
      detectedAt,
    },
  };
}

async function openDetectedUrls(urls) {
  const uniqueUrls = [...new Set((urls || []).filter(Boolean))].slice(0, 5);
  for (const url of uniqueUrls) {
    bgLogInfo("🔗 URLを新しいタブで開きます", { url });
    const createdTab = await chrome.tabs.create({ url, active: false });
    bgLogInfo(`🗂️ タブ ${createdTab?.id ?? "unknown"} を作成`, { url });
  }
}

async function captureScheduledSnapshotCurrentPage(tabId, settings) {
  const result = await chrome.scripting.executeScript({
    target: { tabId },
    func: (monitorSelector, itemCountSelector) => {
      const resolveScheduledProductUrl = (url, baseUrl = "") => {
        if (!url || typeof url !== "string") {
          return "";
        }
        try {
          return new URL(url, baseUrl || undefined).href;
        } catch {
          return "";
        }
      };
      const extractScheduledProductUrls = (elements, baseUrl = "") => {
        const urls = [];
        const seen = new Set();
        const nestedAnchorSelectors = [
          'a[href*="/product/0/P-"]',
          'a[href*="/product/"]',
          "a[href]",
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

          if (String(element.tagName || "").toUpperCase() === "A") {
            pushUrl(
              element.getAttribute
                ? element.getAttribute("href")
                : element.href,
            );
            continue;
          }

          let anchor = null;
          for (const selector of nestedAnchorSelectors) {
            if (typeof element.querySelector !== "function") {
              break;
            }
            anchor = element.querySelector(selector);
            if (anchor) {
              break;
            }
          }

          if (anchor) {
            pushUrl(
              anchor.getAttribute ? anchor.getAttribute("href") : anchor.href,
            );
          }
        }

        return urls;
      };
      const parseCountText = (text) => {
        const match = String(text || "")
          .replace(/,/g, "")
          .match(/\d+/);
        return match ? parseInt(match[0], 10) : NaN;
      };
      const bodyText = (document.body?.innerText || "")
        .replace(/\s+/g, " ")
        .trim();
      const isAeonListPage =
        location.hostname.includes("aeonretail.com") &&
        location.pathname.includes("/Form/Product/ProductList.aspx");

      let elements = [];
      let usedSelector = monitorSelector || "";

      let urls = [];

      if (monitorSelector) {
        elements = Array.from(document.querySelectorAll(monitorSelector));
        usedSelector = monitorSelector;
        urls = extractScheduledProductUrls(elements, location.href);
      } else if (isAeonListPage) {
        const primarySelector =
          'ul.product__item--container > li.product__item .product__item--name a[href*="/product/0/P-"]';
        let anchors = Array.from(document.querySelectorAll(primarySelector));
        usedSelector = primarySelector;

        if (anchors.length === 0) {
          usedSelector = "a[href*='/Form/Product/ProductDetail.aspx']";
          anchors = Array.from(document.querySelectorAll(usedSelector));
        }

        const urlSet = new Set();
        for (const anchor of anchors) {
          const rawHref = anchor.getAttribute("href") || anchor.href;
          if (!rawHref) continue;
          try {
            urlSet.add(new URL(rawHref, location.href).href);
          } catch {
            if (anchor.href) {
              urlSet.add(anchor.href);
            }
          }
        }

        elements = anchors;
        urls = Array.from(urlSet);
      } else {
        usedSelector = "body";
        elements = [document.body];
      }

      // 件数取得: itemCountSelector > テキストパターン > 要素数
      let count = Math.max(elements.length, urls.length);
      if (itemCountSelector) {
        const countEl = document.querySelector(itemCountSelector);
        if (countEl) {
          const num = parseCountText(countEl.textContent);
          if (!isNaN(num)) {
            count = num;
          }
        }
      } else if (isAeonListPage) {
        const match = bodyText.match(/対象アイテム：\s*(\d+)\s*件/);
        if (match) {
          count = parseInt(match[1], 10);
        }
      }

      return {
        href: location.href,
        title: document.title,
        count,
        matchedCount: elements.length,
        usedSelector,
        urls,
        textPreview: elements
          .map((element) =>
            (element?.innerText || element?.textContent || "")
              .replace(/\s+/g, " ")
              .trim(),
          )
          .filter(Boolean)
          .join("\n")
          .slice(0, 2000),
      };
    },
    args: [settings.monitorSelector || "", settings.itemCountSelector || ""],
  });

  return result[0]?.result;
}

async function collectAeonPagedSnapshot(
  tabId,
  settings,
  baseSnapshot,
  targetUrl,
) {
  const urls = [];
  const seen = new Set();
  const addUrls = (items = []) => {
    for (const url of items) {
      const normalized = normalizeStockProductUrl(url);
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      urls.push(url);
    }
  };

  addUrls(baseSnapshot?.urls || []);
  const baselineArtifactContext = baseSnapshot?.baselineArtifactContext || null;

  const pagerInfoResult = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const pageNumbers = Array.from(
        document.querySelectorAll(
          ".product__pager .product__pager--pageitem a",
        ),
      )
        .map((anchor) => Number((anchor.textContent || "").trim()))
        .filter((page) => Number.isInteger(page) && page > 0);

      const currentPage = Number(
        document
          .querySelector(".product__pager .product__pager--currentpage a")
          ?.textContent?.trim() || "1",
      );

      return {
        totalPages: pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1,
        currentPage:
          Number.isInteger(currentPage) && currentPage > 0 ? currentPage : 1,
      };
    },
  });

  const pagerInfo = pagerInfoResult[0]?.result || {
    totalPages: 1,
    currentPage: 1,
  };
  const visitedPages = [pagerInfo.currentPage];

  logger.info("📚 [AEON baseline] ページ巡回開始", {
    targetUrl,
    currentPage: pagerInfo.currentPage,
    totalPages: pagerInfo.totalPages,
    baseUrlCount: (baseSnapshot?.urls || []).length,
    baseCount: Number(baseSnapshot?.count || 0),
  });

  for (let page = 2; page <= pagerInfo.totalPages; page++) {
    const navigatedUrl = buildAeonProductListPageUrl(targetUrl, page);
    await focusAeonBaselineDebugTab(tabId);
    await chrome.tabs.update(tabId, { url: navigatedUrl });
    await waitForTabComplete(tabId);

    await focusAeonBaselineDebugTab(tabId);
    try {
      // AEON 専用セレクタを使用（settings.monitorSelector が空の場合でも動作）
      const aeonProductSelector = "li.product__item";
      await waitForProductListReady(
        tabId,
        aeonProductSelector,
        "aeon-baseline",
        8000,
        {},
        {
          requirePagerWhenCountExceedsProducts: true,
          itemCountSelector: settings.itemCountSelector || "",
        },
      );
    } catch (error) {
      logger.warn("AEON ページ切り替え後のDOM待機に失敗:", error.message, {
        page,
      });
    }

    const pageStateResult = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        href: location.href,
        currentPageText:
          document
            .querySelector(".product__pager .product__pager--currentpage a")
            ?.textContent?.trim() || "",
        pagerItems: document.querySelectorAll(
          ".product__pager .product__pager--pageitem a",
        ).length,
        productCount: document.querySelectorAll("li.product__item").length,
      }),
    });
    const pageState = pageStateResult[0]?.result || null;

    const pageSnapshot = await captureScheduledSnapshotCurrentPage(
      tabId,
      settings,
    );
    const actualPage =
      Number(
        pageState?.currentPageText || pageSnapshot?.currentPageText || 0,
      ) || null;
    logger.info("📄 [AEON baseline] ページ取得結果", {
      requestedPage: page,
      navigatedUrl,
      href: pageState?.href || pageSnapshot?.href || "",
      currentPageText: pageState?.currentPageText || "",
      actualPage,
      pagerItems: pageState?.pagerItems ?? null,
      productCount: pageState?.productCount ?? null,
      pageUrlCount: (pageSnapshot?.urls || []).length,
      pageCount: Number(pageSnapshot?.count || 0),
      sampleUrls: (pageSnapshot?.urls || []).slice(0, 3),
    });

    if (actualPage !== page) {
      logger.warn(
        "⚠️ [AEON baseline] 期待ページと実ページが不一致のため巡回を停止します",
        {
          requestedPage: page,
          navigatedUrl,
          actualPage,
          href: pageState?.href || pageSnapshot?.href || "",
        },
      );
      break;
    }

    addUrls(pageSnapshot?.urls || []);
    visitedPages.push(page);
  }

  return {
    ...baseSnapshot,
    count: Math.max(Number(baseSnapshot?.count || 0), urls.length),
    urls,
    visitedPages,
    aggregatedUrlCount: urls.length,
    baselineArtifactContext,
  };
}

async function captureScheduledSnapshot(tabId, settings, options = {}) {
  const snapshot = await captureScheduledSnapshotCurrentPage(tabId, settings);
  if (!snapshot) {
    return snapshot;
  }

  const mode = options.mode || "monitor";
  const targetUrl = options.targetUrl || snapshot.href || "";
  const shouldCollectAllAeonPages =
    mode === "baseline" &&
    isAeonProductListUrl(targetUrl) &&
    Number(snapshot.count || 0) > (snapshot.urls || []).length;

  if (!shouldCollectAllAeonPages) {
    return snapshot;
  }

  snapshot.baselineArtifactContext = await captureBaselineArtifactContext(
    tabId,
    targetUrl,
  );

  return collectAeonPagedSnapshot(tabId, settings, snapshot, targetUrl);
}

async function persistStockSnapshot(comparisonKey, snapshot, snapshots = null) {
  const snapshotResult = snapshots
    ? { [STOCK_SNAPSHOT_STORAGE_KEY]: snapshots }
    : await chrome.storage.local.get([STOCK_SNAPSHOT_STORAGE_KEY]);
  const store = snapshotResult[STOCK_SNAPSHOT_STORAGE_KEY] || {};
  store[comparisonKey] = {
    count: Number(snapshot.count || 0),
    urls: snapshot.urls || [],
    checkedAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ [STOCK_SNAPSHOT_STORAGE_KEY]: store });
  return store;
}

/**
 * 古いスナップショットをクリーンアップ
 * scheduled-watch-sites.json に登録されていないURLのスナップショットを削除
 */
async function cleanupStaleSnapshots() {
  try {
    const sites = await loadScheduledWatchSites();
    // enabled: true のサイトのURLを取得（末尾スラッシュ削除）
    const enabledUrls = new Set(
      sites.filter((s) => s.enabled).map((s) => s.url.replace(/\/$/, "")),
    );

    const snapshotResult = await chrome.storage.local.get([
      STOCK_SNAPSHOT_STORAGE_KEY,
    ]);
    const snapshots = snapshotResult[STOCK_SNAPSHOT_STORAGE_KEY] || {};

    const keysToDelete = [];
    for (const key of Object.keys(snapshots)) {
      if (!enabledUrls.has(key)) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      for (const key of keysToDelete) {
        delete snapshots[key];
      }
      await chrome.storage.local.set({
        [STOCK_SNAPSHOT_STORAGE_KEY]: snapshots,
      });
      logger.info(
        `🧹 ${keysToDelete.length}個の古いスナップショットをクリーンアップしました`,
        {
          deletedKeys: keysToDelete.map((k) => k.slice(-50)),
        },
      );
    }
  } catch (error) {
    logger.warn("スナップショットクリーンアップでエラー:", error.message);
  }
}

/**
 * 指定サイトのベースラインを取得・保存する
 * baselineTime で設定された時刻に自動実行される
 */
async function fetchBaselineForSite(siteId) {
  const sites = await loadScheduledWatchSites();
  const site = sites.find((s) => s.id === siteId && s.enabled);

  if (!site) {
    logger.warn(`[${siteId}] ベースライン取得: サイトが見つからないか無効`);
    return;
  }

  const targetUrl = site.url;
  const selectors = site.selectors || {};

  bgLogInfo(
    `📊 [${siteId}] ベースライン取得開始 ${formatJstTimestampReadable()}\n` +
      `  - サイト名: ${site.name}\n` +
      `  - 対象URL: ${targetUrl}`,
  );

  let tab = null;
  try {
    // アクティブでタブを作成
    tab = await chrome.tabs.create({ url: targetUrl, active: true });
    // バックグラウンドでタブを作成
    // tab = await chrome.tabs.create({ url: targetUrl, active: false });
    await waitForTabComplete(tab.id);

    // DOM準備待機（既存関数を再利用）
    try {
      await waitForScheduledWatchPageReady(tab.id, targetUrl);
    } catch (readyError) {
      logger.warn(
        `[${siteId}] ベースライン取得: DOM準備待機でタイムアウト`,
        readyError.message,
      );
      // タイムアウトでも続行（部分的な取得を試みる）
    }

    if (isAeonProductListUrl(targetUrl)) {
      try {
        await waitForProductListReady(
          tab.id,
          selectors.productLinks,
          site.id,
          site.domWaitTimeout || 8000,
          site.cloudflareProtection || {},
          {
            requirePagerWhenCountExceedsProducts: true,
            itemCountSelector: selectors.itemCount || "",
          },
        );
      } catch (readyError) {
        logger.warn(
          `[${siteId}] ベースライン取得: AEONページャー待機でタイムアウト`,
          readyError.message,
        );
      }
    }

    // スナップショット取得
    const snapshot = await captureScheduledSnapshot(
      tab.id,
      {
        monitorSelector: selectors.productLinks,
        itemCountSelector: selectors.itemCount,
      },
      {
        mode: "baseline",
        targetUrl,
      },
    );

    if (!snapshot || (snapshot.urls || []).length === 0) {
      try {
        const diagnosticsResult = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const productItems = Array.from(
              document.querySelectorAll("li.product__item"),
            );
            const hrefs = productItems
              .map(
                (element) =>
                  element.querySelector(
                    'a[href*="/product/0/P-"], a[href*="/product/"], a[href]',
                  )?.href || "",
              )
              .filter(Boolean)
              .slice(0, 5);

            return {
              locationHref: location.href,
              title: document.title,
              productItemCount: productItems.length,
              sampleHrefs: hrefs,
            };
          },
        });
        const diagnostics = diagnosticsResult[0]?.result || null;
        logger.warn(
          `[${siteId}] ベースライン取得: URL取得失敗または0件`,
          diagnostics,
        );
      } catch (diagnosticsError) {
        logger.warn(
          `[${siteId}] ベースライン取得: URL取得失敗または0件 (診断ログ取得失敗: ${diagnosticsError.message})`,
        );
      }
      return;
    }

    // ストレージに保存
    const comparisonKey = targetUrl.replace(/\/$/, "");
    await persistStockSnapshot(comparisonKey, snapshot);

    // artifact 保存（PNG/HTML/txt）
    const sessionLike = {
      siteId,
      siteName: site.name,
      targetUrl,
    };
    try {
      await saveScheduledStockBaselineArtifacts(sessionLike, snapshot, tab.id);
      logger.info(`📁 [${siteId}] ベースライン証跡を保存しました`);
    } catch (artifactError) {
      logger.warn(
        `[${siteId}] ベースライン証跡保存に失敗:`,
        artifactError.message,
      );
    }

    const totalCount = Number(snapshot.count || 0);
    const collectedUrlCount = (snapshot.urls || []).length;
    const partialCollection = totalCount > 0 && collectedUrlCount < totalCount;

    bgLogInfo(
      `📊 [${siteId}] ベースライン取得完了 ${formatJstTimestampReadable()}\n` +
        `  - 全体件数: ${totalCount}件\n` +
        `  - 収集URL件数: ${collectedUrlCount}件\n` +
        `  - 保存キー: ${comparisonKey.slice(-50)}\n` +
        `  - 次回取得: 翌日 ${site.baselineTime}`,
    );

    logger.info(`📊 [${siteId}] ベースライン取得完了`, {
      siteId,
      siteName: site.name,
      totalCount,
      urlCount: collectedUrlCount,
      baselineTime: site.baselineTime,
      visitedPages: snapshot.visitedPages || [1],
      aggregatedUrlCount: snapshot.aggregatedUrlCount || collectedUrlCount,
    });

    if (partialCollection) {
      logger.warn(
        `⚠️ [${siteId}] ベースライン取得: 全体件数に対してURL収集が不足しています`,
        {
          totalCount,
          collectedUrlCount,
          comparisonKey,
        },
      );
    }
  } catch (error) {
    bgLogError(`❌ [${siteId}] ベースライン取得エラー:`, error);
    logger.error(`[${siteId}] ベースライン取得エラー`, {
      error: error.message,
    });
  } finally {
    // タブを閉じる
    if (tab?.id) {
      try {
        await chrome.tabs.remove(tab.id);
      } catch (closeError) {
        logger.debug(
          `[${siteId}] ベースライン取得後のタブクローズに失敗`,
          closeError.message,
        );
      }
    }
  }
}

async function tryClaimStockWatchSession(sessionFields) {
  const existing = await chrome.storage.local.get(STOCK_WATCH_SESSION_KEY);
  if (existing[STOCK_WATCH_SESSION_KEY]?.active) {
    return null;
  }

  const session = {
    active: true,
    phase: "starting",
    inspectionTabId: null,
    ...sessionFields,
  };

  await chrome.alarms.clear(STOCK_WATCH_TICK_ALARM);
  await chrome.storage.local.set({ [STOCK_WATCH_SESSION_KEY]: session });
  return session;
}

async function endStockWatchSession(session, options = {}) {
  const { detected = false, snapshot = null, reason = "finished" } = options;

  if (session?.inspectionTabId) {
    try {
      await chrome.tabs.remove(session.inspectionTabId);
    } catch (closeError) {
      logger.warn("検査用タブのクローズに失敗:", closeError.message);
    }
  }

  if (snapshot && session?.comparisonKey) {
    await persistStockSnapshot(session.comparisonKey, snapshot);
  }

  await chrome.alarms.clear(STOCK_WATCH_TICK_ALARM);
  await chrome.storage.local.remove(STOCK_WATCH_SESSION_KEY);

  logger.info("⏰ 監視ウィンドウを終了しました", {
    detected,
    reason,
    comparisonKey: session?.comparisonKey,
    targetUrl: session?.targetUrl,
    scheduleWindowStart: session?.scheduleWindowStart,
    scheduleWindowEnd: session?.scheduleWindowEnd,
  });
}

async function handleStockWatchDetection(
  session,
  snapshot,
  newUrls,
  tabId,
  persistSnapshot = snapshot,
) {
  const notifySettings = session.notifySettings || {};
  const currentCount = Number(snapshot.count || 0);
  const previousCount = Number(session.baselineCount || 0);
  const urlsToUse = newUrls.slice(0, 5);
  const savedAt = new Date();

  const logEntry = {
    timestamp: savedAt.toISOString(),
    siteName: session.siteName || "",
    targetUrl: session.targetUrl,
    comparisonKey: session.comparisonKey,
    previousCount,
    currentCount,
    increaseDetected: true,
    usedSelector: snapshot.usedSelector,
    detectedUrls: snapshot.urls || [],
    newUrls: urlsToUse,
    title: snapshot.title || "",
    textPreview: snapshot.textPreview || "",
  };

  await persistStockSnapshot(
    session.comparisonKey,
    persistSnapshot || snapshot,
  );

  // 検知通知はダウンロードUIより先に表示する。検知証跡（TXT/PNG/HTML）の
  // 連続ダウンロードでバナー表示が見えにくくなることを避ける。
  const notification = await showInventoryDetectionNotification({
    type: "stock_diff",
    previousCount,
    currentCount,
    newUrlCount: urlsToUse.length,
  });
  if (notification.success) {
    // notifications.create() の完了後もOSバナーの描画は非同期で進む。
    // 直後に始まる複数ファイルのダウンロードUIで埋もれないよう、描画時間を確保する。
    await delay(1500);
  }

  await saveScheduledStockLog(logEntry);

  // ファイル保存用オプション
  const fileOptions = { siteName: session.siteName || "" };

  // 検知時スクリーンショット保存
  try {
    const pngPath = buildAeonStockDownloadPath(
      "detected",
      savedAt,
      "png",
      fileOptions,
    );
    const screenshot = await captureWatchTabScreenshot(
      tabId,
      session.targetUrl,
    );
    await FileSave.saveScreenshot({ filename: pngPath, dataUrl: screenshot });
    logger.info("📸 detected PNG 保存完了", { pngPath });
  } catch (error) {
    logger.warn("detected PNG 保存失敗:", error.message);
  }

  // 検知時HTML保存
  try {
    const htmlPath = buildAeonStockDownloadPath(
      "detected",
      savedAt,
      "html",
      fileOptions,
    );
    const htmlResult = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML,
    });
    const html = htmlResult[0]?.result || "";
    await FileSave.saveHtml({ filename: htmlPath, html });
    logger.info("📄 detected HTML 保存完了", { htmlPath });
  } catch (error) {
    logger.warn("detected HTML 保存失敗:", error.message);
  }

  if (urlsToUse.length > 0) {
    if (notifySettings.openDetectedUrl) {
      await openDetectedUrls(urlsToUse);
    }
    await notifyExternalExtension(notifySettings, urlsToUse, logEntry);
  }

  await notifyGmailForNewProductDetection(session, snapshot, newUrls);

  logger.info("📊 監視ウィンドウで新規商品を検知", logEntry);
}

async function runStockWatchTick() {
  if (stockWatchTickInFlight) {
    logger.debug("⏰ stockWatchTick は実行中のためスキップします");
    return stockWatchTickInFlight;
  }

  stockWatchTickInFlight = runStockWatchTickInternal()
    .catch((error) => {
      bgLogError("❌ 定時監視中に失敗しました:", error);
    })
    .finally(() => {
      stockWatchTickInFlight = null;
    });
  return stockWatchTickInFlight;
}

async function runStockWatchTickInternal() {
  const store = await chrome.storage.local.get([
    STOCK_WATCH_SESSION_KEY,
    STOCK_SNAPSHOT_STORAGE_KEY,
  ]);
  const session = store[STOCK_WATCH_SESSION_KEY];

  if (!session?.active) {
    return;
  }

  if (session.phase === "starting" || session.inspectionTabId == null) {
    logger.debug("⏰ 監視開始処理中のため tick を延期します");
    await scheduleStockWatchTick(2);
    return;
  }

  if (Date.now() >= session.windowEndMs) {
    let snapshot = null;
    try {
      const settings = {
        monitorSelector: session.notifySettings?.monitorSelector || "",
        itemCountSelector: session.notifySettings?.itemCountSelector || "",
      };
      snapshot = await captureScheduledSnapshot(
        session.inspectionTabId,
        settings,
      );
    } catch (error) {
      logger.warn("終了時スナップショット取得に失敗:", error.message);
    }
    await endStockWatchSession(session, {
      detected: false,
      snapshot,
      reason: "window_end",
    });
    return;
  }

  let tabId = session.inspectionTabId;
  try {
    await chrome.tabs.get(tabId);
    await closeDuplicateWatchTabs(session.targetUrl, tabId);
  } catch {
    const tab = await ensureScheduledWatchInspectionTab(session.targetUrl);
    tabId = tab.id;
    session.inspectionTabId = tabId;
    await chrome.storage.local.set({ [STOCK_WATCH_SESSION_KEY]: session });
    await waitForTabComplete(tabId);
    await waitForScheduledWatchPageReady(tabId, session.targetUrl);
  }

  const captureSettings = {
    monitorSelector: session.notifySettings?.monitorSelector || "",
    itemCountSelector: session.notifySettings?.itemCountSelector || "",
  };
  const captureMode =
    (session.baselineUrls || []).length === 0 ? "baseline" : "monitor";
  const snapshot = await captureScheduledSnapshot(tabId, captureSettings, {
    mode: captureMode,
    targetUrl: session.targetUrl,
  });

  if (!snapshot) {
    await chrome.storage.local.set({ [STOCK_WATCH_SESSION_KEY]: session });
    await scheduleStockWatchTick(session.reloadIntervalSec);
    return;
  }

  if (
    (session.baselineUrls || []).length === 0 &&
    (snapshot.urls || []).length > 0
  ) {
    session.baselineUrls = snapshot.urls || [];
    session.baselineCount = Number(snapshot.count || 0);

    // baseline URL設定時のみ証跡を保存（既存baselineがある場合はスキップ）
    if (!session.baselineArtifactsSaved) {
      try {
        await saveScheduledStockBaselineArtifacts(session, snapshot, tabId);
        session.baselineArtifactsSaved = true;
      } catch (artifactError) {
        logger.warn("baseline 証跡保存に失敗:", artifactError.message);
      }
    }

    // ベースラインをストレージに永続化
    await persistStockSnapshot(session.comparisonKey, snapshot);

    await chrome.storage.local.set({ [STOCK_WATCH_SESSION_KEY]: session });
    logger.info("⏰ 監視セッション基準を初回スナップショットで設定しました", {
      baselineUrlCount: session.baselineUrls.length,
      baselineCount: session.baselineCount,
    });

    if (Date.now() < session.windowEndMs) {
      try {
        await chrome.tabs.reload(tabId);
        await waitForTabComplete(tabId);
        await waitForScheduledWatchPageReady(tabId, session.targetUrl);
      } catch (reloadError) {
        logger.warn("初回基準設定後のリロードに失敗:", reloadError.message);
      }
      session.inspectionTabId = tabId;
      await chrome.storage.local.set({ [STOCK_WATCH_SESSION_KEY]: session });
      await scheduleStockWatchTick(session.reloadIntervalSec);
    }
    return;
  }

  const newUrls = diffStockProductUrls(
    session.baselineUrls,
    snapshot.urls || [],
  );

  if (newUrls.length > 0) {
    let persistSnapshot = snapshot;
    if (isAeonProductListUrl(session.targetUrl)) {
      persistSnapshot = await captureScheduledSnapshot(tabId, captureSettings, {
        mode: "baseline",
        targetUrl: session.targetUrl,
      });
    }
    await handleStockWatchDetection(
      session,
      snapshot,
      newUrls,
      tabId,
      persistSnapshot,
    );
    await endStockWatchSession(session, {
      detected: true,
      reason: "new_product_detected",
    });
    return;
  }

  if (Date.now() >= session.windowEndMs) {
    await endStockWatchSession(session, {
      detected: false,
      snapshot,
      reason: "window_end_after_check",
    });
    return;
  }

  try {
    await runPeriodicReload(tabId, "B", (context) =>
      waitForScheduledWatchPageReady(tabId, session.targetUrl, context),
    );
  } catch (reloadError) {
    logger.warn("一覧リロードに失敗:", reloadError.message);
  }

  session.inspectionTabId = tabId;
  await chrome.storage.local.set({ [STOCK_WATCH_SESSION_KEY]: session });
  await scheduleStockWatchTick(session.reloadIntervalSec);
}

async function startScheduledStockWatch(options = {}) {
  if (stockWatchStartInFlight) {
    logger.warn("⏰ 監視ウィンドウの開始処理が既に進行中です（合流）");
    return stockWatchStartInFlight;
  }

  stockWatchStartInFlight = startScheduledStockWatchInternal(options).finally(() => {
    stockWatchStartInFlight = null;
  });
  return stockWatchStartInFlight;
}

async function startScheduledStockWatchInternal({
  requireEnabled = true,
  immediateDurationMinutes = null,
  trigger = "scheduled",
} = {}) {
  let session = null;
  let startedTabId = null;

  try {
    const config = await configManager.loadConfig();
    const scheduledWatch = config?.single_scheduled_watch || {};
    const targetUrl = scheduledWatch.url || "";
    const monitorSelector = scheduledWatch.monitorSelector || "";
    const windowSettings = resolveScheduleWindowSettings({
      scheduleWindowStart: scheduledWatch.startTime,
      scheduleWindowEnd: scheduledWatch.endTime,
      scheduleReloadIntervalSec: scheduledWatch.intervalSeconds,
    });

    const durationMinutes = Number(immediateDurationMinutes);
    const isImmediate = trigger === "immediate";
    if (
      (requireEnabled && !scheduledWatch.enabled) ||
      !targetUrl ||
      !monitorSelector ||
      (isImmediate && (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 480))
    ) {
      logger.info("⏰ 監視ウィンドウをスキップしました", {
        scheduleEnabled: scheduledWatch.enabled,
        targetUrl,
        monitorSelector,
        immediateDurationMinutes,
      });
      return {
        success: false,
        error: !targetUrl
          ? "検索結果・一覧ページURLを設定してください"
          : !monitorSelector
            ? "商品取得セレクタを設定してください"
            : isImmediate
              ? "今すぐ監視の継続時間は1〜480分で設定してください"
              : "定時監視を有効にしてください",
      };
    }

    const windowEndMs = isImmediate
      ? Date.now() + durationMinutes * 60 * 1000
      : getTodayScheduleTimeMs(windowSettings.scheduleWindowEnd);
    if (!isImmediate && Date.now() >= windowEndMs) {
      logger.info("⏰ 監視終了時刻を過ぎているためスキップしました", {
        scheduleWindowEnd: windowSettings.scheduleWindowEnd,
      });
      return;
    }

    const comparisonKey = targetUrl.replace(/\/$/, "");
    const snapshotResult = await chrome.storage.local.get([
      STOCK_SNAPSHOT_STORAGE_KEY,
    ]);
    const snapshots = snapshotResult[STOCK_SNAPSHOT_STORAGE_KEY] || {};
    const baseline = snapshots[comparisonKey] || { count: 0, urls: [] };

    session = await tryClaimStockWatchSession({
      comparisonKey,
      targetUrl,
      windowEndMs,
      baselineUrls: baseline.urls || [],
      baselineCount: baseline.count || 0,
      baselineArtifactsSaved: false,
      reloadIntervalSec: windowSettings.scheduleReloadIntervalSec,
      notifySettings: {
        openDetectedUrl: scheduledWatch.openDetectedUrl,
        notifyExternalExtension: scheduledWatch.notifyExternalExtension,
        externalExtensionId: scheduledWatch.externalExtensionId,
        discordChannelId: scheduledWatch.discordChannelId || "",
        monitorSelector: scheduledWatch.monitorSelector || "",
        itemCountSelector: scheduledWatch.itemCountSelector || "",
      },
      scheduleWindowStart: windowSettings.scheduleWindowStart,
      scheduleWindowEnd: isImmediate
        ? new Date(windowEndMs).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false })
        : windowSettings.scheduleWindowEnd,
      startedAt: new Date().toISOString(),
      trigger,
    });

    if (!session) {
      logger.warn("⏰ 監視ウィンドウは既に実行中です");
      return { success: false, error: "B の監視は既に実行中です" };
    }

    const tab = await ensureScheduledWatchInspectionTab(targetUrl);
    startedTabId = tab.id;
    session.inspectionTabId = tab.id;
    await chrome.storage.local.set({ [STOCK_WATCH_SESSION_KEY]: session });

    await waitForTabComplete(tab.id);
    await waitForScheduledWatchPageReady(tab.id, targetUrl);

    session.phase = "active";
    session.inspectionTabId = tab.id;
    await chrome.storage.local.set({ [STOCK_WATCH_SESSION_KEY]: session });
    await scheduleStockWatchTick(1);

    logger.info("⏰ 監視ウィンドウを開始しました", {
      targetUrl,
      comparisonKey,
      scheduleWindowStart: windowSettings.scheduleWindowStart,
      scheduleWindowEnd: windowSettings.scheduleWindowEnd,
      scheduleReloadIntervalSec: windowSettings.scheduleReloadIntervalSec,
      baselineUrlCount: session.baselineUrls.length,
      windowEndMs: new Date(windowEndMs).toISOString(),
      trigger,
    });
    return { success: true, started: true, trigger, windowEndMs };
  } catch (error) {
    bgLogError("❌ 定時監視の開始に失敗しました:", error);
    if (startedTabId) {
      try {
        await chrome.tabs.remove(startedTabId);
      } catch (closeError) {
        logger.warn("開始失敗時の検査タブクローズに失敗:", closeError.message);
      }
    }
    const store = await chrome.storage.local.get(STOCK_WATCH_SESSION_KEY);
    if (store[STOCK_WATCH_SESSION_KEY]) {
      await endStockWatchSession(store[STOCK_WATCH_SESSION_KEY], {
        reason: "start_error",
      });
    }
    return { success: false, error: error?.message || "B の監視開始に失敗しました" };
  }
}

async function startSingleScheduledWatchNow() {
  const config = await configManager.loadConfig();
  const durationMinutes = Number(config?.single_scheduled_watch?.immediateDurationMinutes ?? 3);
  return startScheduledStockWatch({
    requireEnabled: false,
    immediateDurationMinutes: durationMinutes,
    trigger: "immediate",
  });
}

async function stopSingleScheduledWatchNow() {
  const stored = await chrome.storage.local.get(STOCK_WATCH_SESSION_KEY);
  const session = stored[STOCK_WATCH_SESSION_KEY];
  if (!session?.active) {
    return { success: false, error: "停止できるB監視はありません" };
  }
  await endStockWatchSession(session, { reason: "manual_stop" });
  return { success: true, stopped: true };
}

async function runScheduledStockCheck() {
  await startScheduledStockWatch();
}

// 基準ダウンロード実行関数
async function executeBaselineDownload(
  targetTab,
  settings,
  timestamp,
  downloadType = "Baseline",
  detectionResult = null,
) {
  const downloadLabel = downloadType === "Change" ? "変更証跡" : "基準";
  const artifacts = [];
  try {
    logger.warn(`📄 ${downloadLabel}ダウンロード開始:`, { tabId: targetTab.id, timestamp });

    // スクリーンショット取得・保存
    if (settings.downloadScreenshot) {
      try {
        const screenshot = await captureEvidenceScreenshot(targetTab.id);
        const screenshotFilename = generateFilename(
          "Screenshot",
          downloadType,
          settings,
          timestamp,
          targetTab,
          detectionResult,
        );
        const { downloadId } = await FileSave.saveScreenshot({
          dataUrl: screenshot,
          filename: `${screenshotFilename}.png`,
        });
        artifacts.push({ type: "スクリーンショット", status: "成功", filename: `${screenshotFilename}.png`, downloadId });

        logger.warn(`📸 ${downloadLabel}スクリーンショット保存完了`);
      } catch (error) {
        artifacts.push({ type: "スクリーンショット", status: "失敗", error: error.message });
        logger.warn(`❌ ${downloadLabel}スクリーンショット取得エラー:`, error.message);
      }
    }

    // HTMLソース取得・保存
    if (settings.downloadSource) {
      try {
        const htmlResult = await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          function: () => document.documentElement.outerHTML,
        });

        const html = htmlResult[0]?.result || "";
        const htmlFilename = generateFilename(
          "PageSource",
          downloadType,
          settings,
          timestamp,
          targetTab,
          detectionResult,
        );

        const { downloadId } = await FileSave.saveHtml({
          html,
          filename: `${htmlFilename}.html`,
        });
        artifacts.push({ type: "HTMLソース", status: "成功", filename: `${htmlFilename}.html`, downloadId });
        logger.warn(`📄 ${downloadLabel}HTMLソース保存完了`);
      } catch (error) {
        artifacts.push({ type: "HTMLソース", status: "失敗", error: error.message });
        logger.warn(`❌ ${downloadLabel}HTMLダウンロードエラー:`, error.message);
      }
    }

    // FooterなしHTMLダウンロード（オプション）
    if (settings.downloadSourceWithoutFooter) {
      try {
        const htmlResult = await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          function: () => {
            // footerタグを除去
            const clonedDoc = document.cloneNode(true);
            const footers = clonedDoc.querySelectorAll("footer");
            footers.forEach((footer) => footer.remove());
            return clonedDoc.documentElement.outerHTML;
          },
        });

        const html = htmlResult[0]?.result || "";
        const htmlNoFooterFilename = generateFilename(
          "PageSourceWithoutFooter",
          downloadType,
          settings,
          timestamp,
          targetTab,
          detectionResult,
        );

        const { downloadId } = await FileSave.saveHtml({
          html,
          filename: `${htmlNoFooterFilename}.html`,
        });
        artifacts.push({ type: "FooterなしHTMLソース", status: "成功", filename: `${htmlNoFooterFilename}.html`, downloadId });
        logger.warn(`📄 ${downloadLabel}FooterなしHTMLソース保存完了`);
      } catch (error) {
        artifacts.push({ type: "FooterなしHTMLソース", status: "失敗", error: error.message });
        logger.warn(`❌ ${downloadLabel}FooterなしHTMLダウンロードエラー:`, error.message);
      }
    }

    logger.warn(`✅ ${downloadLabel}ダウンロード完了`);
    return { artifacts };
  } catch (error) {
    logger.error(`❌ ${downloadLabel}ダウンロード処理エラー:`, error);
    throw error;
  }
}

// 最小限ワークブック作成関数
function createMinimalWorkbook(data) {
  try {
    bgLogInfo("🔄 最小限ワークブック作成開始");

    // データをテキストとしてデコード
    let text;
    if (data instanceof ArrayBuffer) {
      text = new TextDecoder("utf-8").decode(data);
    } else if (data instanceof Uint8Array) {
      text = new TextDecoder("utf-8").decode(data);
    } else {
      throw new Error("サポートされていないデータ形式");
    }

    // CSVをパース
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length === 0) {
      throw new Error("空のファイルです");
    }

    // ヘッダー行を取得
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));

    // データ行を処理
    const jsonData = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const values = parseCSVLine(line);
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        jsonData.push(row);
      }
    }

    bgLogInfo("✅ 最小限ワークブック作成完了:", {
      rows: jsonData.length,
      headers: headers.length,
    });

    // ワークブック形式で返す
    return {
      SheetNames: ["Sheet1"],
      Sheets: {
        Sheet1: {
          "!ref": `A1:${String.fromCharCode(65 + headers.length - 1)}${jsonData.length + 1}`,
          // ヘッダー行
          ...headers.reduce((acc, header, colIndex) => {
            const col = String.fromCharCode(65 + colIndex);
            acc[col + "1"] = { v: header, t: "s" };
            return acc;
          }, {}),
          // データ行
          ...jsonData.reduce((acc, row, rowIndex) => {
            headers.forEach((header, colIndex) => {
              const col = String.fromCharCode(65 + colIndex);
              const cellRef = col + (rowIndex + 2);
              acc[cellRef] = { v: row[header] || "", t: "s" };
            });
            return acc;
          }, {}),
        },
      },
    };
  } catch (error) {
    bgLogError("❌ 最小限ワークブック作成エラー:", error);
    throw new Error(`ワークブック作成に失敗しました: ${error.message}`);
  }
}

// -----------------------------------------------------------------------------
// 監視設定I/Oの単一化
// - 監視設定の read/write/migrate は MonitoringConfigManager に集約する
// - background.js 側の legacy I/O（chrome.storage.local 直アクセス）は廃止
// -----------------------------------------------------------------------------

let monitoringConfigManager = null;
let monitoringConfigManagerInitPromise = null;

async function ensureMonitoringConfigManager() {
  if (monitoringConfigManager) return monitoringConfigManager;
  if (monitoringConfigManagerInitPromise)
    return monitoringConfigManagerInitPromise;

  monitoringConfigManagerInitPromise = (async () => {
    monitoringConfigManager = new MonitoringConfigManager();
    await monitoringConfigManager.initialize();
    return monitoringConfigManager;
  })();

  return monitoringConfigManagerInitPromise;
}

// 互換のために残すインメモリキャッシュ（I/Oはしない）
let currentConfig = null;

async function loadConfig() {
  const mcm = await ensureMonitoringConfigManager();
  currentConfig = await mcm.loadConfig();
  return currentConfig;
}

async function saveConfig(nextConfig) {
  const mcm = await ensureMonitoringConfigManager();

  // 互換: partial update が渡されるケースを吸収
  let configToSave = nextConfig;
  if (!configToSave || typeof configToSave !== "object") {
    configToSave = currentConfig || (await mcm.loadConfig());
  } else if (
    configToSave.mode === undefined ||
    configToSave.single_config === undefined ||
    configToSave.multiple_configs === undefined ||
    configToSave.multiple_common_settings === undefined
  ) {
    const base = currentConfig || (await mcm.loadConfig());
    configToSave = { ...base, ...configToSave };
  }

  const ok = await mcm.saveConfig(configToSave);
  if (ok) currentConfig = configToSave;
  return ok;
}

// Chrome Storage内の全データを調査するデバッグ機能（監視設定は単一キー前提）
async function debugStorageContents() {
  try {
    logger.debug("🔍 === Chrome Storage 監視設定調査開始 ===");

    const mcm = await ensureMonitoringConfigManager();
    const config = await mcm.loadConfig();
    const status = await mcm.getStatus();

    logger.debug("📊 monitoring_config (単一ソース) 概要:", {
      mode: config?.mode,
      multipleConfigsLength: config?.multiple_configs?.length || 0,
      hasSingleConfig: !!config?.single_config,
      lastUpdated: config?.last_updated,
    });

    return {
      ok: true,
      configSummary: {
        mode: config?.mode,
        multiple_configs_length: config?.multiple_configs?.length || 0,
      },
      statusSummary: {
        success: status?.success,
        mode: status?.mode,
        targets_count: status?.targets_count,
      },
    };
  } catch (error) {
    bgLogError("❌ Chrome Storage調査エラー:", error);
    return { ok: false, error: error.message };
  }
}

// 監視対象の追加
async function addMonitoringTarget(target) {
  try {
    bgLogInfo("🔄 監視対象追加開始:", target);

    const mcm = await ensureMonitoringConfigManager();
    const targetId = await mcm.addMonitoringTarget(target);
    if (!targetId)
      throw new Error("monitoringConfigManagerでの追加に失敗しました");

    bgLogInfo("✅ 監視対象追加完了 (monitoringConfigManager):", targetId);
    return {
      success: true,
      targetId: targetId,
      message: "監視対象が正常に追加されました",
    };
  } catch (error) {
    bgLogError("❌ 監視対象追加失敗:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// 監視対象の削除
async function removeMonitoringTarget(targetId) {
  try {
    bgLogInfo("🔄 監視対象削除開始:", targetId);
    const mcm = await ensureMonitoringConfigManager();
    const result = await mcm.removeMonitoringTarget(targetId);
    return result;
  } catch (error) {
    bgLogError("❌ 監視対象削除失敗:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// 設定マネージャー
// 監視状態管理用のグローバル変数
// ログレベル設定
const LogLevel = {
  NONE: 0, // ログなし
  ERROR: 1, // エラーのみ
  WARNING: 2, // 警告とエラー
  INFO: 3, // 情報、警告、エラー
  DEBUG: 4, // 全てのログ（デバッグ含む）
};

const DEFAULT_LOG_LEVEL = LogLevel.INFO;

// 現在のログレベルは起動時に storage から復元する
// ログレベル変更: chrome.runtime.sendMessage({action: 'setLogLevel', level: 3}) でINFOレベルに変更可能
let currentLogLevel = null;
// 起動時に復元した実効ログレベルを、Service Worker ごとに1回だけ表示する。
let hasLoggedRestoredLogLevel = false;

// ログ重複防止のためのキャッシュ
let lastLogCache = new Map();
let logCacheTimeout = 5000; // 5秒間は同一ログを抑制

function isValidLogLevel(level) {
  return (
    Number.isInteger(level) && level >= LogLevel.NONE && level <= LogLevel.DEBUG
  );
}

function getEffectiveLogLevel() {
  return isValidLogLevel(currentLogLevel) ? currentLogLevel : DEFAULT_LOG_LEVEL;
}

function getLogLevelName(level) {
  return Object.keys(LogLevel)[level] || "UNKNOWN";
}

async function loadPersistedLogLevel() {
  try {
    const stored = await chrome.storage.local.get(LOG_LEVEL_STORAGE_KEY);
    const storedLevel = stored?.[LOG_LEVEL_STORAGE_KEY];
    return isValidLogLevel(storedLevel) ? storedLevel : DEFAULT_LOG_LEVEL;
  } catch (error) {
    writeBgConsole(
      "warn",
      "⚠️ ログレベル復元に失敗したため既定値を使用します:",
      error.message,
    );
    return DEFAULT_LOG_LEVEL;
  }
}

async function persistLogLevel(level) {
  try {
    await chrome.storage.local.set({ [LOG_LEVEL_STORAGE_KEY]: level });
  } catch (error) {
    writeBgConsole("warn", "⚠️ ログレベル保存に失敗しました:", error.message);
  }
}

async function restoreLogLevelFromStorage() {
  const level = await loadPersistedLogLevel();
  currentLogLevel = level;
  if (!hasLoggedRestoredLogLevel) {
    hasLoggedRestoredLogLevel = true;
    // ERROR 設定時も復元値を確認できるよう、レベル判定を通さない起動診断ログとして出力する。
    writeBgConsole(
      "log",
      `🔧 Service Workerログレベル復元: ${getLogLevelName(level)} (${level})`,
    );
  }
  return level;
}

const LogCategory = Object.freeze({
  RESULT: "result",
  OPERATION: "operation",
  PROGRESS: "progress",
  DIAGNOSTIC: "diagnostic",
});

function normalizeLogScope(scope) {
  if (!scope || typeof scope !== "object" || Array.isArray(scope)) {
    return "";
  }

  return Object.entries(scope)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");
}

function buildLogSuppressionKey(entry) {
  const category = entry?.category;
  if (category !== "progress" && category !== "diagnostic") {
    return "";
  }

  const event = typeof entry?.event === "string" ? entry.event.trim() : "";
  const scope = normalizeLogScope(entry?.scope);
  if (!event || !scope) {
    return "";
  }

  return `${entry.level}|${category}|${event}|${scope}`;
}

// 明示的に分類された周期進捗・調査詳細だけを重複抑止する。
function shouldSuppressLog(entry, now = Date.now()) {
  // ERROR・WARN、終端・結果、操作・設定は抑止対象外。
  if (!entry || entry.level <= LogLevel.WARNING) {
    return false;
  }

  const logKey = buildLogSuppressionKey(entry);
  if (!logKey) {
    return false;
  }

  // 前回の同一ログをチェック
  if (lastLogCache.has(logKey)) {
    const lastTime = lastLogCache.get(logKey);
    if (now - lastTime < logCacheTimeout) {
      return true; // 抑制
    }
  }

  // ログを記録
  lastLogCache.set(logKey, now);

  // 古いキャッシュをクリーンアップ
  for (const [key, time] of lastLogCache.entries()) {
    if (now - time > logCacheTimeout) {
      lastLogCache.delete(key);
    }
  }

  return false; // 表示
}

// background.js の SW ログは bgLog* 経由で出し、先頭へ HH:mm:ss.SSS: を付ける。
// popup.js / content-script.js は今回の対象外。
function bgLogError(message, ...args) {
  if (getEffectiveLogLevel() >= LogLevel.ERROR) {
    writeBgConsole("error", message, ...args);
  }
}

function bgLogWarn(message, ...args) {
  if (getEffectiveLogLevel() >= LogLevel.WARNING) {
    writeBgConsole("warn", message, ...args);
  }
}

function bgLogInfo(message, ...args) {
  if (getEffectiveLogLevel() >= LogLevel.INFO) {
    writeBgConsole("log", message, ...args);
  }
}

function bgLogDebug(message, ...args) {
  if (getEffectiveLogLevel() >= LogLevel.DEBUG) {
    writeBgConsole("debug", message, ...args);
  }
}

function bgLogProgress(message, { event, scope, details } = {}) {
  if (
    getEffectiveLogLevel() >= LogLevel.INFO &&
    !shouldSuppressLog({
      level: LogLevel.INFO,
      category: LogCategory.PROGRESS,
      event,
      scope,
    })
  ) {
    if (details === undefined) {
      writeBgConsole("log", message);
    } else {
      writeBgConsole("log", message, details);
    }
  }
}

function bgLogDiagnostic(message, { event, scope, details } = {}) {
  if (
    getEffectiveLogLevel() >= LogLevel.DEBUG &&
    !shouldSuppressLog({
      level: LogLevel.DEBUG,
      category: LogCategory.DIAGNOSTIC,
      event,
      scope,
    })
  ) {
    if (details === undefined) {
      writeBgConsole("debug", message);
    } else {
      writeBgConsole("debug", message, details);
    }
  }
}

// ログ出力関数
const logger = {
  error: bgLogError,
  warn: bgLogWarn,
  info: bgLogInfo,
  debug: bgLogDebug,
  setLevel: async (level) => {
    currentLogLevel = level;
    await persistLogLevel(level);
    writeBgConsole("log", `🔧 ログレベル変更: ${getLogLevelName(level)} (${level})`);
  },
  getLevel: () => getEffectiveLogLevel(),
};
const highFrequencySessionResultLocks = new Set();
const SINGLE_MONITORING_SESSIONS_KEY = "singleMonitoringSessions";
const SINGLE_MONITORING_SESSION_LEASE_MS = 60000;

async function getSingleMonitoringSessions() {
  const stored = await chrome.storage.local.get(SINGLE_MONITORING_SESSIONS_KEY);
  return stored[SINGLE_MONITORING_SESSIONS_KEY] || {};
}

async function saveSingleMonitoringSessions(sessions) {
  await chrome.storage.local.set({ [SINGLE_MONITORING_SESSIONS_KEY]: sessions });
}

async function findSingleMonitoringSessionByTab(tabId) {
  const sessions = await getSingleMonitoringSessions();
  return Object.values(sessions).find((session) => session.active && session.tabId === tabId) || null;
}

function buildHighFrequencySessionExecutionKey(sessionId, generation) {
  return `${sessionId || "unknown"}:${generation ?? "unknown"}`;
}

async function deactivateSingleMonitoringSession(sessionId, reason, reportOverride = null) {
  const sessions = await getSingleMonitoringSessions();
  const session = sessions[sessionId];
  if (!session) return null;
  // 実行資源の解放より先に永続状態を無効化する。
  const finalSession = {
    ...session,
    active: false,
    stoppedAt: Date.now(),
    stopReason: reason,
    executionLease: null,
  };
  if (session.settings?.downloadAiSupportFile) {
    finalSession.aiSupportReport = createAiSupportTerminalReport(
      session,
      reason,
      reportOverride,
    );
  }
  sessions[sessionId] = finalSession;
  await saveSingleMonitoringSessions(sessions);
  bgLogInfo("🛑 系統Aセッション停止完了", {
    sessionId,
    tabId: session.tabId,
    monitoringMode: session.monitoringMode,
    stopReason: reason,
    active: false,
  });
  if (session.executionHistoryKey) {
    try {
      await completeMonitoringExecutionHistory(session.executionHistoryKey, {
        reason,
        status: reason === "detected" || reason === "expired" ? "success" : "needs_review",
        detail: getAiSupportOutcome(reason),
      });
    } catch (error) {
      bgLogWarn("⚠️ 系統A実行履歴の完了記録に失敗しました", {
        sessionId,
        error: error.message,
      });
    }
  }
  if (session.settings?.downloadAiSupportFile) {
    await downloadAiSupportFileForSession(finalSession, reason);
  }
  if (session.monitoringMode === "high_frequency") {
    try { await chrome.tabs.sendMessage(session.tabId, { action: "stopHighFrequencySession" }); } catch (_) { /* タブ消失・再読込済み */ }
  }
  if (session.alarmName) await chrome.alarms.clear(session.alarmName);
  if (session.testOnly === "two_tier_acceptance" && reason !== "detected") {
    await recordTwoTierAcceptanceSessionResult(session, reason);
  }
  if (session.testOnly === "test_tab_scenario") {
    await recordTestTabScenarioSessionResult(session, reason);
  }
  return sessions[sessionId];
}

async function evaluateSingleMonitoringSession(session, result) {
  const settings = session.settings || {};
  let tab;
  try {
    tab = await chrome.tabs.get(session.tabId);
  } catch (_) {
    await deactivateSingleMonitoringSession(session.id, "tab_missing");
    return { continueMonitoring: false, reason: "tab_missing" };
  }
  if (Date.now() >= session.endsAt) {
    await deactivateSingleMonitoringSession(session.id, "expired");
    return { continueMonitoring: false, reason: "expired" };
  }
  if (result?.fetchError) {
    const executionRecord = await appendMonitoringExecutionCheck(session.executionHistoryKey, {
      startedAt: new Date(Number(result?.checkStartedAt) || Date.now()).toISOString(),
      durationMs: 0,
      captureMode: "fetch",
      result: "fetch_error",
      detail: result.fetchError,
    });
    const message = buildFetchExecutionCheckLogMessage({
      systemLabel: "系統A",
      targetLabel: session.aiSupportContext?.configName || settings.targetUrl || session.id,
      executionRecord,
      configuredIntervalSeconds: settings.interval,
    });
    if (message) bgLogWarn(message);
    await appendMonitoringExecutionEvent(session.executionHistoryKey, {
      type: "fallback", result: "fallback", captureMode: "reload",
      detail: `Fetch失敗のためリロード方式へ切り替え: ${result.fetchError}`,
    });
    const sessions = await getSingleMonitoringSessions();
    if (sessions[session.id]?.active) {
      sessions[session.id] = {
        ...sessions[session.id],
        settings: { ...sessions[session.id].settings, captureMode: "reload" },
        fetchFallbackReason: result.fetchError,
      };
      await saveSingleMonitoringSessions(sessions);
    }
    bgLogWarn("系統AのFetch取得に失敗したためリロード監視へ切り替えます", {
      sessionId: session.id,
      tabId: session.tabId,
      error: result.fetchError,
    });
    return {
      continueMonitoring: true,
      captureMode: "reload",
      reloadAfterMs: calculateHighFrequencyReloadDelayMs(settings.interval || 5, Date.now()),
    };
  }
  if (result?.error) {
    if (session.executionHistoryKey) {
      const executionRecord = await appendMonitoringExecutionCheck(session.executionHistoryKey, {
        startedAt: new Date(Number(result?.checkStartedAt) || Date.now()).toISOString(),
        durationMs: 0,
        captureMode: settings.captureMode === "fetch" ? "fetch" : "reload",
        result: "error",
        detail: result.error,
      });
      if (settings.captureMode === "fetch") {
        const message = buildFetchExecutionCheckLogMessage({
          systemLabel: "系統A",
          targetLabel: session.aiSupportContext?.configName || settings.targetUrl || session.id,
          executionRecord,
          configuredIntervalSeconds: settings.interval,
        });
        if (message) bgLogWarn(message);
      }
    }
    await deactivateSingleMonitoringSession(session.id, "selector_error");
    bgLogError("系統Aセッションをセレクタエラーで停止しました", { sessionId: session.id, error: result.error });
    return { continueMonitoring: false, reason: "selector_error" };
  }
  const checkStartedAt = Number(result?.checkStartedAt) || Date.now();
  await recordTwoTierAcceptanceCheck(session, checkStartedAt);
  if (session.testOnly === "two_tier_acceptance" && result?.testDomMutation?.applied) {
    bgLogInfo("🔄 [二層監視テスト] テストDOMを変化状態へ更新", {
      sessionId: session.id,
      tabId: session.tabId,
      selector: result.testDomMutation.selector || settings.monitorSelector,
      appendedKeyword: result.testDomMutation.keyword || settings.monitorKeyword,
      checkStartedAt: new Date(checkStartedAt).toISOString(),
    });
  }
  if (session.testOnly === "test_tab_scenario" && result?.testDomMutation?.applied) {
    bgLogInfo(`🔄 [${resolveTestTabSessionName(session)}] 基準取得後に在庫状態の文言を自動で変更しました`, {
      sessionId: session.id,
      tabId: session.tabId,
      change: settings.twoTierTestBehavior,
      keyword: result.testDomMutation.keyword || settings.monitorKeyword,
      changedCount: result.testDomMutation.count,
    });
  }
  const normalized = normalizeSingleKeywordDetectionResult({
    detectMode: settings.detectMode || "appear", keyword: settings.monitorKeyword || "",
    hasKeyword: result?.hasKeyword === true, text: result?.text || "", fullText: result?.fullText || result?.text || "",
    selector: settings.monitorSelector || "body", element: result?.element || null, timestamp: new Date().toISOString()
  });
  const transition = evaluateSingleKeywordStateTransition({
    keywordStateInitialized: session.keywordStateInitialized,
    previousKeywordPresent: session.previousKeywordPresent,
    currentKeywordPresent: normalized.hasKeyword,
    detectMode: settings.detectMode || "appear",
    initialKeywordDetection: settings.initialKeywordDetection === true,
  });
  const sessionDecision = normalized.decision === "pending" || normalized.decision === "error"
    ? normalized.decision
    : transition.decision;
  const sessions = await getSingleMonitoringSessions();
  if (sessions[session.id]?.active && transition.decision !== "pending") {
    sessions[session.id] = {
      ...sessions[session.id],
      keywordStateInitialized: transition.keywordStateInitialized,
      previousKeywordPresent: transition.previousKeywordPresent,
    };
    await saveSingleMonitoringSessions(sessions);
  }
  const executionRecord = await appendMonitoringExecutionCheck(session.executionHistoryKey, {
    startedAt: new Date(checkStartedAt).toISOString(),
    durationMs: Math.max(0, Date.now() - checkStartedAt),
    captureMode: settings.captureMode === "fetch" ? "fetch" : "reload",
    result: result?.fetchError ? "fetch_error" : sessionDecision === "detected" ? "detected" : "success",
    detail: result?.fetchError || (sessionDecision === "detected" ? "キーワードを検知しました" : transition.isInitialState ? "初回状態を基準として保存しました" : "検知なし"),
  });
  if (settings.captureMode === "fetch") {
    const message = buildFetchExecutionCheckLogMessage({
      systemLabel: "系統A",
      targetLabel: session.aiSupportContext?.configName || settings.targetUrl || session.id,
      executionRecord,
      configuredIntervalSeconds: settings.interval,
    });
    if (message) bgLogInfo(message);
  }
  if (!session.initialCheckCompleted && sessionDecision !== "detected") {
    const baselineDownload = await executeBaselineDownload(tab, settings, new Date().toISOString());
    await appendAiSupportReportStage(session.id, {
      name: "基準取得",
      status: baselineDownload?.artifacts?.some((artifact) => artifact.status === "失敗") ? "一部失敗" : "成功",
      detail: "初回判定で検知なし",
      artifacts: baselineDownload?.artifacts || [],
      targetUrl: tab.url || settings.targetUrl || "",
    });
    const latestSessions = await getSingleMonitoringSessions();
    if (latestSessions[session.id]?.active) {
      latestSessions[session.id] = { ...latestSessions[session.id], initialCheckCompleted: true };
      await saveSingleMonitoringSessions(latestSessions);
    }
    await recordTwoTierAcceptanceInitialNotDetected(session);
  }
  if (sessionDecision === "detected") {
    if (session.testOnly === "two_tier_acceptance") {
      bgLogInfo("🎯 [二層監視テスト] 変化検知を確認", {
        sessionId: session.id,
        tabId: session.tabId,
        monitorKeyword: settings.monitorKeyword,
        checkStartedAt: new Date(checkStartedAt).toISOString(),
      });
    }
    if (settings.captureMode === "fetch") {
      const sessions = await getSingleMonitoringSessions();
      if (sessions[session.id]?.active) {
        sessions[session.id] = { ...sessions[session.id], evidenceCaptureInProgress: true };
        await saveSingleMonitoringSessions(sessions);
      }
      await chrome.tabs.reload(tab.id);
      await waitForPageReady(tab.id);
    }
    const changeDownload = await executeBaselineDownload(tab, settings, new Date().toISOString(), "Change");
    const aiSupportReport = buildAiSupportReportWithStage(session, {
      name: "キーワード判定",
      status: "検知",
      detail: `キーワード「${settings.monitorKeyword || ""}」を検知`,
      artifacts: changeDownload?.artifacts || [],
      targetUrl: tab.url || settings.targetUrl || "",
    });

    // 通知APIや他拡張の応答待ちで、検知済みセッションを残さない。
    await deactivateSingleMonitoringSession(session.id, "detected", aiSupportReport);

    await showInventoryDetectionNotification({
      type: "keyword",
      targetUrl: tab.url || settings.targetUrl,
      detectMode: settings.detectMode || "appear",
      keyword: settings.monitorKeyword || "",
    });

    if (!settings.suppressGmailNotification) {
      const notification = await waitForDetectionNotification(
        notifyGmailForKeywordDetection(settings, tab.url || settings.targetUrl, ""),
      );
      if (notification.timedOut) {
        bgLogWarn("⚠️ Gmail 通知がタイムアウトしました", { sessionId: session.id, timeoutMs: 15000 });
      } else if (notification.error) {
        bgLogWarn("⚠️ Gmail 通知処理で予期しないエラーが発生しました", {
          sessionId: session.id,
          error: notification.error.message,
        });
      }
    }
    if (settings.notifyExternalExtension) {
      const detectedAt = new Date().toISOString();
      const notification = await waitForDetectionNotification(
        notifyExternalExtension(settings, [tab.url || settings.targetUrl], {
          event: "single_keyword_detected", sessionId: session.id, detectedAt
        }, buildTargetpageNotificationOptions(settings, session.id, detectedAt)),
      );
      if (notification.timedOut) {
        bgLogWarn("⚠️ 他拡張通知がタイムアウトしました", { sessionId: session.id, timeoutMs: 15000 });
      } else if (notification.error) {
        bgLogWarn("⚠️ 他拡張通知処理で予期しないエラーが発生しました", {
          sessionId: session.id,
          error: notification.error.message,
        });
      }
    }
    if (session.testOnly === "two_tier_acceptance") {
      await recordTwoTierAcceptanceSessionResult(session, "detected");
    }
    return { continueMonitoring: false, reason: "detected" };
  }
  return {
    continueMonitoring: true,
    reloadAfterMs: calculateHighFrequencyReloadDelayMs(
      settings.interval || 5,
      checkStartedAt,
    ),
  };
}

async function runLongRunningSingleMonitoringSession(sessionId, runSource = "alarm") {
  const sessions = await getSingleMonitoringSessions();
  const session = sessions[sessionId];
  if (!session?.active || session.monitoringMode !== "long_running") return;
  if (Date.now() >= session.endsAt) {
    await deactivateSingleMonitoringSession(sessionId, "expired");
    return;
  }
  const leased = claimSingleMonitoringSessionLease(session, Date.now(), SINGLE_MONITORING_SESSION_LEASE_MS);
  if (!leased) return;
  sessions[sessionId] = leased;
  await saveSingleMonitoringSessions(sessions);
  try {
    const tab = await chrome.tabs.get(session.tabId);
    const useFetch = session.settings?.captureMode === "fetch";
    if (!useFetch) {
      await chrome.tabs.reload(tab.id);
      await waitForPageReady(tab.id);
    }
    if (session.testOnly === "two_tier_acceptance" && session.initialCheckCompleted) {
      const [{ result: testDomMutation }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (selector, keyword) => {
          const element = document.querySelector(selector);
          if (element && !element.dataset.pageRecorderTwoTierTestChanged) {
            element.dataset.pageRecorderTwoTierTestChanged = "true";
            element.textContent = `${element.textContent || ""} ${keyword}`;
            return { applied: true, selector, keyword };
          }
          return { applied: false, selector, keyword };
        },
        args: [session.settings.monitorSelector, session.settings.monitorKeyword],
      });
      if (testDomMutation?.applied) {
        bgLogInfo("🔄 [二層監視テスト] テストDOMを変化状態へ更新", {
          sessionId: session.id,
          tabId: session.tabId,
          selector: testDomMutation.selector || session.settings.monitorSelector,
          appendedKeyword: testDomMutation.keyword || session.settings.monitorKeyword,
          checkStartedAt: new Date().toISOString(),
        });
      }
    }
    let result;
    const checkStartedAt = Date.now();
    if (useFetch) {
      result = await chrome.tabs.sendMessage(tab.id, {
        action: "getFetchMonitorState",
        selector: session.settings.monitorSelector || "body",
        keyword: session.settings.monitorKeyword || "",
      });
    } else {
      [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (selector, keyword) => {
          try {
            const elements = document.querySelectorAll(selector || "body");
            if (!elements.length) return { error: `セレクタ\"${selector}\"に一致する要素が見つかりません` };
            const texts = Array.from(elements).map((element) => (element.textContent || element.innerText || "").replace(/\s+/g, " ").trim());
            const text = texts.find((value) => value.includes(keyword)) || texts[0] || "";
            return { hasKeyword: texts.some((value) => value.includes(keyword)), text, fullText: text };
          } catch (error) { return { error: `セレクタ構文エラー: ${error.message}` }; }
        }, args: [session.settings.monitorSelector || "body", session.settings.monitorKeyword || ""]
      });
    }
    result = { ...(result || {}), checkStartedAt };
    const outcome = await evaluateSingleMonitoringSession(session, result);
    // 開始直後の基準取得はアラーム発火ではない。受け入れ確認では、
    // chrome.alarms 由来の実行だけを「長期アラーム発火」として記録する。
    if (session.testOnly === "two_tier_acceptance" && isTwoTierAcceptanceAlarmRun(runSource)) {
      await recordTwoTierAcceptanceAlarm(session, outcome);
    }
  } catch (error) {
    bgLogWarn("長期監視セッションの実行に失敗しました", { sessionId, error: error.message });
    if (/No tab|tab/i.test(error.message)) await deactivateSingleMonitoringSession(sessionId, "tab_missing");
  } finally {
    const latest = await getSingleMonitoringSessions();
    if (latest[sessionId]?.active) {
      latest[sessionId] = releaseSingleMonitoringSessionLease(latest[sessionId]);
      await saveSingleMonitoringSessions(latest);
    }
  }
}

async function restoreLongRunningSingleMonitoringSessions() {
  const sessions = await getSingleMonitoringSessions();
  const alarms = await chrome.alarms.getAll();
  const alarmNames = new Set(alarms.map((alarm) => alarm.name));
  for (const session of Object.values(sessions)) {
    if (!session.active || session.monitoringMode !== "long_running") continue;
    if (Date.now() >= session.endsAt) { await deactivateSingleMonitoringSession(session.id, "expired"); continue; }
    try { await chrome.tabs.get(session.tabId); } catch (_) { await deactivateSingleMonitoringSession(session.id, "tab_missing"); continue; }
    if (!alarmNames.has(session.alarmName)) {
      await chrome.alarms.create(
        session.alarmName,
        createLongRunningSingleMonitoringAlarmOptions(session.settings),
      );
    }
    await recordTwoTierAcceptanceServiceWorkerRestoration(session);
  }
}

const TWO_TIER_ACCEPTANCE_STATUS_KEY = "twoTierAcceptanceTestStatus";
const TWO_TIER_ACCEPTANCE_TEST_URL = "https://shop.nissan.co.jp/product/detail/6710";
const TWO_TIER_ACCEPTANCE_SELECTOR = "#form1 dl.clearfix:not(.kakaku):not(.parallel) dd";
const TWO_TIER_ACCEPTANCE_KEYWORD = "在庫あり";

async function setTwoTierAcceptanceStatus(status) {
  await chrome.storage.local.set({ [TWO_TIER_ACCEPTANCE_STATUS_KEY]: status });
  return status;
}

function buildTwoTierAcceptanceVerification(overrides = {}) {
  const checks = {
    sessionCreated: false,
    targetTabs: false,
    initialNotDetected: false,
    cadenceScheduled: false,
    detectedAndStopped: false,
    continuedAndExpired: false,
    tabClosedStopped: false,
    staleReportIgnored: false,
    longRunningAlarmCreated: false,
    longRunningAlarmFired: false,
    serviceWorkerRestartRestored: false,
    bcAlarmsUnchanged: false,
    settingsRestored: false,
    ...overrides,
  };
  return checks;
}

async function getTwoTierAcceptanceStatus() {
  const stored = await chrome.storage.local.get(TWO_TIER_ACCEPTANCE_STATUS_KEY);
  if (stored[TWO_TIER_ACCEPTANCE_STATUS_KEY]) return stored[TWO_TIER_ACCEPTANCE_STATUS_KEY];
  // 旧版がService Workerの生存期間だけ保持していたテスト状態を、初回読込時に移行する。
  const legacy = await chrome.storage.session.get(TWO_TIER_ACCEPTANCE_STATUS_KEY);
  if (!legacy[TWO_TIER_ACCEPTANCE_STATUS_KEY]) return { status: "idle", active: false };
  await chrome.storage.local.set({ [TWO_TIER_ACCEPTANCE_STATUS_KEY]: legacy[TWO_TIER_ACCEPTANCE_STATUS_KEY] });
  return legacy[TWO_TIER_ACCEPTANCE_STATUS_KEY];
}

async function recordTwoTierAcceptanceServiceWorkerRestoration(session) {
  if (session.testOnly !== "two_tier_acceptance") return;
  const status = await getTwoTierAcceptanceStatus();
  if (!status.active || status.runId !== session.testRunId || status.scenarioId !== "long_running_single") return;
  const restoredAt = new Date().toISOString();
  const next = markTwoTierAcceptanceServiceWorkerRestored(status, session.id, restoredAt);
  await setTwoTierAcceptanceStatus(next);
  bgLogInfo("🔄 [二層監視テスト] Service Worker再起動後に長期セッションを復元", {
    runId: next.runId,
    sessionId: session.id,
    tabId: session.tabId,
    restoredAt,
  });
}

async function completeTwoTierAcceptanceTest(status, reason) {
  const sessions = await getSingleMonitoringSessions();
  await Promise.all((status.sessionIds || []).map(async (sessionId) => {
    if (sessions[sessionId]?.active) await deactivateSingleMonitoringSession(sessionId, reason);
  }));
  // テスト開始前の設定を必ず復元する（成功・失敗・手動停止の全経路）。
  if (status.backup && typeof status.backup === "object") {
    try {
      const restore = {};
      if (Object.prototype.hasOwnProperty.call(status.backup, "monitoring_config")) {
        restore.monitoring_config = status.backup.monitoring_config;
      }
      if (Object.prototype.hasOwnProperty.call(status.backup, GMAIL_NOTIFICATION_SETTINGS_KEY)) {
        restore[GMAIL_NOTIFICATION_SETTINGS_KEY] = status.backup[GMAIL_NOTIFICATION_SETTINGS_KEY];
      }
      if (Object.keys(restore).length) await chrome.storage.local.set(restore);
    } catch (error) {
      await setTwoTierAcceptanceStatus({ ...status, active: false, status: "failed", stopReason: "settings_restore_failed", settingsRestored: false, restoreError: error.message });
      return;
    }
  }
  const verification = {
    ...buildTwoTierAcceptanceVerification(status.verification),
    settingsRestored: true,
    longRunningAlarmFired: status.alarmFired || false,
  };
  if (Array.isArray(status.bcAlarmNamesBefore) && Array.isArray(status.bcAlarmNamesAfter)) {
    verification.bcAlarmsUnchanged = status.bcAlarmNamesBefore.join("\n") === status.bcAlarmNamesAfter.join("\n");
  }
  const allChecksPassed = reason === "acceptance_complete" &&
    areTwoTierAcceptanceChecksPassed(status.scenarioId, verification);
  const finalStatus = {
    ...status, active: false, status: allChecksPassed ? "passed" : "failed",
    stopReason: reason, completedAt: new Date().toISOString(), settingsRestored: true,
    verification, allChecksPassed,
  };
  await setTwoTierAcceptanceStatus(finalStatus);
  bgLogInfo("✅ 二層監視テスト判定完了", {
    runId: finalStatus.runId,
    scenarioId: finalStatus.scenarioId,
    status: finalStatus.status,
    stopReason: finalStatus.stopReason,
    allChecksPassed: finalStatus.allChecksPassed,
  });
}

async function recordTwoTierAcceptanceCheck(session, checkStartedAt = Date.now()) {
  if (session.testOnly !== "two_tier_acceptance") return;
  const status = await getTwoTierAcceptanceStatus();
  if (!status.active || status.runId !== session.testRunId) return;
  const checkCounts = { ...(status.checkCounts || {}) };
  checkCounts[session.id] = Number(checkCounts[session.id] || 0) + 1;
  const startedAt = Number.isFinite(Number(checkStartedAt)) ? Number(checkStartedAt) : Date.now();
  const reloadDelayMs = calculateHighFrequencyReloadDelayMs(
    session.settings?.interval || 0,
    startedAt,
  );
  const checkTimings = { ...(status.checkTimings || {}) };
  checkTimings[session.id] = [
    ...(checkTimings[session.id] || []),
    { checkStartedAt: startedAt, reloadDueAt: Date.now() + reloadDelayMs },
  ].slice(-20);
  await setTwoTierAcceptanceStatus({
    ...status,
    checkCounts,
    checkTimings,
    verification: {
      ...buildTwoTierAcceptanceVerification(status.verification),
      // 少なくとも2回のDOM確認を行い、初回だけの見かけ上の予約を合格にしない。
      cadenceScheduled: hasTwoTierAcceptanceMinimumChecks({ ...status, checkCounts }),
    },
  });
  bgLogInfo("🔄 二層監視テスト確認", {
    sessionId: session.id,
    tabId: session.tabId,
    checkCount: checkCounts[session.id],
    intervalSeconds: Number(session.settings?.interval || 0),
    checkStartedAt: new Date(startedAt).toISOString(),
    reloadDelayMs,
    reloadDueAt: new Date(Date.now() + reloadDelayMs).toISOString(),
  });
}

async function recordTwoTierAcceptanceInitialNotDetected(session) {
  if (session.testOnly !== "two_tier_acceptance") return;
  const status = await getTwoTierAcceptanceStatus();
  if (!status.active || status.runId !== session.testRunId) return;
  const initialNotDetectedSessionIds = Array.from(new Set([
    ...(status.initialNotDetectedSessionIds || []),
    session.id,
  ]));
  await setTwoTierAcceptanceStatus({
    ...status,
    initialNotDetectedSessionIds,
    verification: {
      ...buildTwoTierAcceptanceVerification(status.verification),
      initialNotDetected: hasTwoTierAcceptanceInitialChecks({
        ...status,
        initialNotDetectedSessionIds,
      }),
    },
  });
}

async function recordTwoTierAcceptanceSessionResult(session, reason) {
  const status = await getTwoTierAcceptanceStatus();
  if (!status.active || status.runId !== session.testRunId) return;
  const detectedSessionIds = Array.from(new Set([
    ...(status.detectedSessionIds || []),
    ...(reason === "detected" ? [session.id] : []),
  ]));
  const expiredSessionIds = Array.from(new Set([
    ...(status.expiredSessionIds || []),
    ...(reason === "expired" ? [session.id] : []),
  ]));
  const next = {
    ...status,
    detectedSessionIds,
    expiredSessionIds,
    verification: {
      ...buildTwoTierAcceptanceVerification(status.verification),
      detectedAndStopped: reason === "detected" ? true : status.verification?.detectedAndStopped || false,
      continuedAndExpired: hasTwoTierAcceptanceExpectedOutcomes({
        ...status,
        detectedSessionIds,
        expiredSessionIds,
      }) && (status.expectedExpirationSessionIds || []).length > 0,
      tabClosedStopped: reason === "tab_removed" || status.verification?.tabClosedStopped || false,
      sessionCreated: true,
      targetTabs: (status.startedSessionCount || 0) === status.targetTabCount,
    },
  };
  const alarmRequirementMet = next.scenarioId !== "long_running_single" || next.alarmFired === true;
  if (hasTwoTierAcceptanceExpectedOutcomes(next) && alarmRequirementMet) {
    await completeTwoTierAcceptanceTest(next, "acceptance_complete");
    return;
  }
  if (reason !== "detected" && reason !== "expired" && reason !== "acceptance_complete") {
    await completeTwoTierAcceptanceTest(next, reason);
    return;
  }
  await setTwoTierAcceptanceStatus(next);
}

async function recordTwoTierAcceptanceAlarm(session, outcome) {
  const status = await getTwoTierAcceptanceStatus();
  if (!status.active || status.runId !== session.testRunId) return;
  const next = {
    ...status,
    alarmFired: true,
    lastAlarmOutcome: outcome?.reason || "continued",
    verification: {
      ...buildTwoTierAcceptanceVerification(status.verification),
      longRunningAlarmCreated: true,
      longRunningAlarmFired: true,
    },
  };
  // 長期シナリオは1回の専用アラーム発火を確認した時点で終了する。
  if (status.scenarioId === "long_running_single") {
    await completeTwoTierAcceptanceTest(next, "acceptance_complete");
    return;
  }
  await setTwoTierAcceptanceStatus(next);
}

async function startTwoTierAcceptanceTest(scenarioId) {
  const scenario = getTwoTierAcceptanceScenario(scenarioId);
  if (!scenario) throw new Error("未知の二層監視テストシナリオです");
  const runId = `twoTier_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const backup = await chrome.storage.local.get(["monitoring_config", GMAIL_NOTIFICATION_SETTINGS_KEY]);
  const alarmsBefore = await chrome.alarms.getAll();
  const status = await setTwoTierAcceptanceStatus({
    runId, scenarioId, active: true, status: "running", startedAt: new Date().toISOString(),
    sessionIds: [], targetTabCount: scenario.count, expectedDetections: scenario.expectedDetections,
    detectedSessionIds: [], expiredSessionIds: [], initialNotDetectedSessionIds: [], checkCounts: {}, checkTimings: {},
    expectedDetectionSessionIds: [], expectedExpirationSessionIds: [], alarmFired: false, settingsBackupTaken: true, settingsRestored: false,
    notificationsDisabled: true, backup,
    bcAlarmNamesBefore: alarmsBefore.filter((alarm) => !isSingleMonitoringSessionAlarmName(alarm.name)).map((alarm) => alarm.name).sort(),
    verification: buildTwoTierAcceptanceVerification(),
  });
  const configs = Array.from({ length: scenario.count }, (_, index) => ({
    id: `two-tier-${scenarioId}-${index + 1}`,
    name: `二層監視テスト ${index + 1}`,
    url: index ? `${TWO_TIER_ACCEPTANCE_TEST_URL}?two-tier=${index + 1}` : TWO_TIER_ACCEPTANCE_TEST_URL,
    selector: TWO_TIER_ACCEPTANCE_SELECTOR, keyword: TWO_TIER_ACCEPTANCE_KEYWORD, enabled: true,
    twoTierTestBehavior: scenario.sessionBehaviors[index],
    settings: { monitoringMode: scenario.mode, interval: scenario.mode === "long_running" ? 30 : 5,
      duration: scenario.mode === "long_running" ? 1800 : 60, initialKeywordDetection: false,
      downloadSource: true, downloadScreenshot: true },
  }));
  const results = await runMultipleMonitoringStartConfigs({ configs, commonSettings: configs[0].settings }, {
    requestId: `testMultiple_${runId}`, useTwoTierSessions: true, testOnly: "two_tier_acceptance", testRunId: runId,
  });
  const sessionIds = results.filter((result) => result.success).map((result) => result.sessionId);
  const alarmsAfter = await chrome.alarms.getAll();
  const sessionIdByConfigId = new Map(results.filter((result) => result.success)
    .map((result) => [result.configId, result.sessionId]));
  const expectedDetectionSessionIds = configs
    .filter((config) => config.twoTierTestBehavior === "detect_after_initial")
    .map((config) => sessionIdByConfigId.get(config.id))
    .filter(Boolean);
  const expectedExpirationSessionIds = configs
    .filter((config) => config.twoTierTestBehavior === "remain_unmatched")
    .map((config) => sessionIdByConfigId.get(config.id))
    .filter(Boolean);
  const latestStatus = await getTwoTierAcceptanceStatus();
  const startedStatus = { ...latestStatus, sessionIds, startedSessionCount: sessionIds.length,
    expectedDetectionSessionIds, expectedExpirationSessionIds,
    status: sessionIds.length === scenario.count ? "running" : "failed", active: sessionIds.length === scenario.count,
    stopReason: sessionIds.length === scenario.count ? null : "start_failed",
    bcAlarmNamesAfter: alarmsAfter.filter((alarm) => !isSingleMonitoringSessionAlarmName(alarm.name)).map((alarm) => alarm.name).sort(),
    verification: {
      ...buildTwoTierAcceptanceVerification(latestStatus.verification),
      sessionCreated: sessionIds.length > 0,
      targetTabs: sessionIds.length === scenario.count,
      initialNotDetected: hasTwoTierAcceptanceInitialChecks({
        ...latestStatus,
        sessionIds,
      }),
      longRunningAlarmCreated: scenario.mode === "long_running"
        ? sessionIds.length === scenario.count && alarmsAfter.some((alarm) => isSingleMonitoringSessionAlarmName(alarm.name))
        : true,
    },
  };
  return setTwoTierAcceptanceStatus(startedStatus);
}

// テストタブの A: single / A: multiple シナリオ。本番と同じ二層セッションで開始し、
// 終了理由を期待結果と照合して自動で判定する。受け入れテストとは状態を分けて管理する。
const TEST_TAB_SCENARIO_STATUS_KEY = "testTabScenarioStatus";
const TEST_TAB_GMAIL_RESULT_WAIT_MS = 15000;

async function getTestTabScenarioStatus() {
  const stored = await chrome.storage.local.get(TEST_TAB_SCENARIO_STATUS_KEY);
  return stored[TEST_TAB_SCENARIO_STATUS_KEY] || { status: "idle", active: false };
}

async function setTestTabScenarioStatus(status) {
  await chrome.storage.local.set({ [TEST_TAB_SCENARIO_STATUS_KEY]: status });
  return status;
}

function resolveTestTabSessionName(session) {
  return session?.settings?.aiSupportContext?.configName || session?.settings?.targetUrl || session?.id || "テストタブ";
}

async function restoreTestTabScenarioBackup(backup) {
  if (!backup || typeof backup !== "object") return;
  const restore = {};
  if (Object.prototype.hasOwnProperty.call(backup, "monitoring_config")) {
    restore.monitoring_config = backup.monitoring_config;
  }
  if (Object.prototype.hasOwnProperty.call(backup, GMAIL_NOTIFICATION_SETTINGS_KEY)) {
    restore[GMAIL_NOTIFICATION_SETTINGS_KEY] = backup[GMAIL_NOTIFICATION_SETTINGS_KEY];
  }
  if (Object.keys(restore).length) await chrome.storage.local.set(restore);
}

// 設定ごとの送信成功は recordMultipleGmailTestOutcome が記録する。期待件数がそろうか失敗が記録されるまで待つ。
async function waitForTestTabGmailResult(gmailTestRunId) {
  const deadline = Date.now() + TEST_TAB_GMAIL_RESULT_WAIT_MS;
  let current = null;
  while (Date.now() < deadline) {
    const stored = await chrome.storage.session.get(MULTIPLE_GMAIL_TEST_STATUS_STORAGE_KEY);
    current = stored[MULTIPLE_GMAIL_TEST_STATUS_STORAGE_KEY];
    if (current?.gmailTestRunId === gmailTestRunId) {
      const counts = {
        successCount: (current.successConfigIds || []).length,
        expectedCount: Number(current.expectedCount) || 0,
      };
      if (current.status === "passed") return { status: "success", ...counts };
      if (current.status === "failed" || current.status === "needs_review") {
        return { status: current.status, ...counts, message: current.failureReason || "Gmail 検知送信に失敗しました" };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return {
    status: "not_found",
    successCount: current?.gmailTestRunId === gmailTestRunId ? (current.successConfigIds || []).length : 0,
    expectedCount: current?.gmailTestRunId === gmailTestRunId ? Number(current.expectedCount) || 0 : 0,
  };
}

async function completeTestTabScenario(status, outcome) {
  // 残りのセッションを止める前に非アクティブにして、終了記録の再入を防ぐ。
  await setTestTabScenarioStatus({ ...status, active: false, status: "completing" });
  const sessions = await getSingleMonitoringSessions();
  await Promise.all((status.sessions || []).map(async (item) => {
    if (sessions[item.id]?.active) await deactivateSingleMonitoringSession(item.id, "test_tab_completed");
  }));
  const failures = [...(outcome.failures || [])];
  if (outcome.status === "passed" && status.requiresGmail) {
    const gmailResult = await waitForTestTabGmailResult(status.gmailTestRunId);
    if (gmailResult.status !== "success") {
      failures.push({
        sessionId: null,
        expected: "gmail_success",
        actual: gmailResult.status,
        message: gmailResult.message ||
          `今回の実行IDに対応する Gmail 送信成功を確認できませんでした（成功 ${gmailResult.successCount}/${gmailResult.expectedCount} 件）`,
      });
    }
  }
  let settingsRestored = true;
  let restoreError = null;
  try {
    await restoreTestTabScenarioBackup(status.backup);
  } catch (error) {
    settingsRestored = false;
    restoreError = error.message;
    failures.push({ sessionId: null, expected: "settings_restored", actual: "failed", message: `本番設定の復元に失敗しました: ${error.message}` });
  }
  const finalStatus = {
    ...status,
    active: false,
    status: failures.length ? "failed" : "passed",
    failures,
    manualWindow: null,
    settingsRestored,
    restoreError,
    completedAt: new Date().toISOString(),
  };
  await setTestTabScenarioStatus(finalStatus);
  const log = finalStatus.status === "passed" ? bgLogInfo : bgLogWarn;
  log(`${finalStatus.status === "passed" ? "✅" : "❌"} [テストタブ] ${finalStatus.scenarioId}（${finalStatus.siteName}）の判定: ${finalStatus.status === "passed" ? "成功" : "失敗"}`, {
    runId: finalStatus.runId,
    failures: finalStatus.failures,
  });
  return finalStatus;
}

// 状態の読み書きを順番に処理し、同時に終わったセッションの結果が上書きで消えないようにする。
let testTabStatusQueue = Promise.resolve();
function withTestTabStatusLock(task) {
  const run = testTabStatusQueue.then(task, task);
  testTabStatusQueue = run.catch(() => {});
  return run;
}

async function recordTestTabScenarioSessionResult(session, reason) {
  const decision = await withTestTabStatusLock(async () => {
    const status = await getTestTabScenarioStatus();
    if (!status.active || status.runId !== session.testRunId) return null;
    if (status.status === "starting" || !(status.sessions || []).some((item) => item.id === session.id)) {
      // 全セッションの開始が終わる前の終了（開始直後の検知など）は、開始処理の最後に反映する。
      await setTestTabScenarioStatus({ ...status, earlyReasons: { ...(status.earlyReasons || {}), [session.id]: reason } });
      return null;
    }
    const sessions = (status.sessions || []).map((item) => (
      item.id === session.id && !item.reason ? { ...item, reason } : item
    ));
    const next = { ...status, sessions };
    const outcome = evaluateTestTabScenarioOutcome({ sessions, reproductionMode: status.reproductionMode });
    if (outcome.status === "running") {
      await setTestTabScenarioStatus(next);
      return null;
    }
    // 完了処理は残りセッションを止めて再入するため、ロックの外で行う。
    await setTestTabScenarioStatus({ ...next, active: false, status: "completing" });
    return { next, outcome };
  });
  if (decision) await completeTestTabScenario(decision.next, decision.outcome);
}

async function recordTestTabManualWindow(session, phase, remainingSeconds) {
  await withTestTabStatusLock(async () => {
    const status = await getTestTabScenarioStatus();
    if (!status.active || status.runId !== session.testRunId) return;
    const manualWindow = { ...(status.manualWindow || {}) };
    manualWindow[session.id] = { phase, remainingSeconds, updatedAt: new Date().toISOString() };
    await setTestTabScenarioStatus({ ...status, manualWindow });
  });
}

function buildTestTabSingleSessionSettings(config, run, runId, gmailTestRunId) {
  return {
    monitorType: "url",
    targetUrl: config.url,
    monitorSelector: config.selector,
    monitorKeyword: config.keyword,
    ...config.settings,
    stopCondition: "time",
    downloadSourceWithoutFooter: false,
    notifyExternalExtension: false,
    openDetectedUrl: false,
    twoTierTestBehavior: config.twoTierTestBehavior,
    aiSupportContext: { requestId: runId, configId: config.id, configName: config.name },
    suppressGmailNotification: !run.requiresGmail,
    gmailTestRunId,
    gmailTestConfigId: gmailTestRunId ? config.id : "",
  };
}

async function startTestTabScenario({ scenarioId, site, reproductionMode } = {}) {
  const current = await getTestTabScenarioStatus();
  if (current.active) throw new Error("実行中のテストタブシナリオがあります。停止してから開始してください");
  const run = buildTestTabScenarioRun({ scenarioId, site, reproductionMode });
  if (!run.ok) {
    return setTestTabScenarioStatus({
      status: "unavailable", active: false, scenarioId, siteId: site?.id || "", siteName: site?.name || "",
      reason: run.reason, message: run.message, checkedAt: new Date().toISOString(),
    });
  }
  if (run.requiresGmail) {
    // Gmail の設定・認証が不足する場合は、監視を開始せずに理由を表示する。
    const gmailPreflight = await getGmailNotificationAutoTestPreflight();
    if (!gmailPreflight.ready) {
      return setTestTabScenarioStatus({
        status: "unavailable", active: false, scenarioId, siteId: site?.id || "", siteName: site?.name || "",
        reason: "gmail_not_ready", message: gmailPreflight.reason, checkedAt: new Date().toISOString(),
      });
    }
  }
  const runId = `testTab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const gmailTestRunId = run.requiresGmail ? `gmail-${runId}` : "";
  if (gmailTestRunId) {
    // 設定ごとの送信成功を数えるため、送信記録の受け皿を先に作る。
    await chrome.storage.session.set({
      [MULTIPLE_GMAIL_TEST_STATUS_STORAGE_KEY]: {
        gmailTestRunId, expectedCount: run.configs.length, successConfigIds: [],
        status: "running", active: true, startedAt: new Date().toISOString(),
      },
    });
  }
  const backup = await chrome.storage.local.get(["monitoring_config", GMAIL_NOTIFICATION_SETTINGS_KEY]);
  const manualConfig = run.configs.find((config) => config.manualAction);
  await setTestTabScenarioStatus({
    runId, scenarioId, siteId: site.id, siteName: site.name || site.id,
    scope: run.scope, reproductionMode: run.reproductionMode, requiresGmail: run.requiresGmail, gmailTestRunId,
    active: true, status: "starting", startedAt: new Date().toISOString(), backup, sessions: [], manualWindow: null,
    manualCode: manualConfig
      ? buildTestTabManualReproductionCode({ selector: manualConfig.selector, keyword: manualConfig.keyword, action: manualConfig.manualAction })
      : "",
  });
  bgLogInfo(`🔄 [テストタブ] ${scenarioId}（${site.name || site.id}）を本番と同じ経路で開始します`, {
    runId, reproductionMode: run.reproductionMode, configCount: run.configs.length,
  });

  let results;
  if (run.scope === "single") {
    const config = run.configs[0];
    const response = await startSingleMonitoring(
      buildTestTabSingleSessionSettings(config, run, runId, gmailTestRunId),
      null,
      { persistConfig: false, monitoringScope: "single", testOnly: "test_tab_scenario", testRunId: runId },
    );
    results = [{ ...response, configId: config.id }];
  } else {
    const configs = run.configs.map((config) => ({
      id: config.id, name: config.name, url: config.url, selector: config.selector, keyword: config.keyword,
      enabled: true, twoTierTestBehavior: config.twoTierTestBehavior, settings: config.settings,
    }));
    results = await runMultipleMonitoringStartConfigs({ configs, commonSettings: configs[0].settings }, {
      requestId: `testMultiple_${runId}`, useTwoTierSessions: true, testOnly: "test_tab_scenario", testRunId: runId,
      gmailTestRunId,
    });
  }

  const decision = await withTestTabStatusLock(async () => {
    const latest = await getTestTabScenarioStatus();
    // 開始中に終了したセッション（開始直後の検知など）の理由を残しつつ、開始結果を記録する。
    const sessions = run.configs.map((config) => {
      const result = results.find((item) => item.configId === config.id);
      const earlyReason = result?.sessionId ? latest.earlyReasons?.[result.sessionId] : null;
      return {
        id: result?.success ? result.sessionId : null,
        configId: config.id,
        name: config.name,
        url: config.url,
        expected: config.expected,
        start: config.start,
        reason: result?.success ? (earlyReason || null) : "start_failed",
        startError: result?.success ? null : (result?.error || result?.message || "監視を開始できませんでした"),
      };
    });
    const next = { ...latest, status: "running", sessions, earlyReasons: {} };
    const outcome = evaluateTestTabScenarioOutcome({ sessions, reproductionMode: run.reproductionMode });
    if (outcome.status !== "running") {
      await setTestTabScenarioStatus({ ...next, active: false, status: "completing" });
      return { next, outcome };
    }
    await setTestTabScenarioStatus(next);
    return null;
  });
  if (decision) return completeTestTabScenario(decision.next, decision.outcome);
  return getTestTabScenarioStatus();
}

async function stopTestTabScenario() {
  const status = await getTestTabScenarioStatus();
  if (!status.active) return status;
  return completeTestTabScenario(status, {
    status: "failed",
    failures: [{ sessionId: null, expected: null, actual: "manual_stop", message: "手動で停止しました" }],
  });
}

// A 系 single の「開始直後に検知」だけを通常監視から切り離して確認する。
// ブラウザ起動中だけ残る session storage と Service Worker メモリに状態を保持する。
const INITIAL_DETECTED_AUTO_TEST_SCENARIO_ID = "initial_detected";
const INITIAL_DETECTED_AUTO_TEST_STATUS_STORAGE_KEY =
  "initialDetectedAutoTestStatus";
const INITIAL_DETECTED_AUTO_TEST_NOTIFICATION_ID =
  "initial-detected-auto-test-result";
let initialDetectedAutoTestStatus = null;
let initialDetectedAutoTestInFlight = null;
const SINGLE_INTEGRATION_AUTO_TEST_SCENARIOS = {
  chrome_notification_check: { action: "chrome_notification" },
};

function createInitialDetectedAutoTestStatus(overrides = {}) {
  return {
    scenarioId: INITIAL_DETECTED_AUTO_TEST_SCENARIO_ID,
    status: "running",
    active: true,
    checks: {
      domReproduced: false,
      detected: false,
      sharedNotificationShown: false,
      htmlSaved: false,
      screenshotSaved: false,
      sessionEnded: false,
    },
    failureReason: null,
    notification: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  };
}

function buildInitialDetectedAutoTestEvidence(status) {
  const checks = status?.checks || {};
  const progress = status?.runProgress || {};
  const item = (label, passed, successReason, pendingReason) => ({
    label,
    passed: passed === true,
    reason: passed === true ? successReason : pendingReason,
  });
  const cleanupItems = [
    item("監視停止", checks.monitoringStopped, "監視停止と実行ロック解除を確認", "監視停止または実行ロック解除が未完了"),
    item("設定復元", checks.configRestored, "実行前の single 設定を復元", "実行前の single 設定を復元できていない"),
    item("テストタブ終了", checks.tabClosed, "テストタブを閉じました", "テストタブを閉じられていない"),
  ];
  let verificationItems;

  switch (status?.scenarioId) {
    case "initial_detected":
      verificationItems = [
        item("DOM再現", checks.domReproduced, "対象DOMを一時変更", "対象DOMを再現できていない"),
        item("期待検知", checks.detected, "開始直後の一致を検知", "開始直後の一致を検知できていない"),
        item("共有Chrome通知", checks.sharedNotificationShown, "共有Chrome通知を作成", "共有Chrome通知を作成できていない"),
        item("HTML保存", checks.htmlSaved, "HTMLダウンロード完了を確認", "HTML保存が未完了"),
        item("スクリーンショット保存", checks.screenshotSaved, "画像ダウンロード完了を確認", "スクリーンショット保存が未完了"),
        item("テストタブ終了", checks.sessionEnded, "テストタブを閉じました", "テストタブを閉じられていない"),
      ];
      break;
    case "keyword_missing_check":
      verificationItems = [
        item("空キーワード拒否", checks.validationRejected, "開始前バリデーションで拒否", "空キーワードを拒否できていない"),
        item("通常監視未開始", checks.monitoringNotStarted, "通常監視を起動していません", "通常監視が開始された可能性がある"),
      ];
      break;
    case "element_not_found_check":
    case "pending_error_check": {
      const expectedErrorReason = SINGLE_INTEGRATION_AUTO_TEST_SCENARIOS[status?.scenarioId]?.expectedErrorReason;
      verificationItems = [
        item("期待エラー種別", checks.errorTypeMatched,
          `decision: error / ${expectedErrorReason} を確認`,
          `decision: error / ${expectedErrorReason} を確認できていない`),
        item("安全な停止", checks.errorStopCompleted,
          "監視停止と実行ロック解除を確認", "エラー後の停止または実行ロック解除が未完了"),
        ...cleanupItems.slice(1),
      ];
      break;
    }
    case "initial_not_detected":
      verificationItems = [
        item("初回未検知・基準保存", checks.initialBaselineSaved, "初回未検知後の基準保存を確認", "基準保存を確認できていない"),
        item("最終状態保存", checks.finalStateSaved, "時間満了時の最終状態保存を確認", "時間満了時の最終状態保存を確認できていない"),
        item("自然停止", checks.naturalMonitoringEnded, "時間満了後の通常監視終了を確認", "通常監視が自然停止していない"),
        ...cleanupItems.slice(1),
      ];
      break;
    case "gmail_notification_check":
      verificationItems = [
        item("通常監視開始", checks.monitoringStarted, "テスト用通常監視を開始", "通常監視を開始できていない"),
        item("DOM再現", progress.reproduced, "リロード後に在庫ありDOMを再現", "DOM再現を確認できていない"),
        item("期待検知", progress.detected, "在庫ありの出現を検知", "期待検知を確認できていない"),
        item("保存完了", progress.saveCompleted, "保存処理完了を確認", "保存処理が未完了"),
        item("Gmail 検知送信", checks.gmailNotificationSent, "今回の実行IDで Gmail API 送信成功を確認", checks.gmailNotificationReason || "Gmail 検知送信を確認中"),
        item("通常監視終了", progress.monitoringEnded, "通常監視終了を確認", "通常監視終了を確認できていない"),
        ...cleanupItems,
      ];
      break;
    case "chrome_notification_check":
      verificationItems = [
        item("共有Chrome通知", checks.sharedNotificationShown, "共有Chrome通知を作成", "共有Chrome通知を作成できていない"),
        item("通常監視未開始", checks.noMonitoringStarted, "通常監視を開始していません", "通常監視が開始された可能性があります"),
        item("Gmail未送信", checks.noGmailNotification, "Gmail送信を実行していません", "Gmail送信が実行された可能性があります"),
        item("外部拡張未送信", checks.noExternalNotification, "外部拡張通知を実行していません", "外部拡張通知が実行された可能性があります"),
      ];
      break;
    default:
      verificationItems = [
        item("通常監視開始", checks.monitoringStarted, "テスト用通常監視を開始", "通常監視を開始できていない"),
        item("自動再現", progress.reproduced, "リロード後にDOMを再現", "DOM再現を確認できていない"),
        item("期待検知", progress.detected, "期待条件を検知", "期待条件を検知できていない"),
        item("保存完了", progress.saveCompleted, "保存処理完了を確認", "保存処理が未完了"),
        item("通常監視終了", progress.monitoringEnded, "通常監視終了を確認", "通常監視終了を確認できていない"),
        ...cleanupItems,
      ];
  }

  const unmetItems = verificationItems.filter((entry) => !entry.passed);
  const resultLabel = status?.status === "passed" ? "合格" : status?.status === "running" ? "実行中" : "未達";
  const decisionReason = status?.status === "passed"
    ? (status.checkSummary || `${verificationItems.length}項目の確認が完了しました。`)
    : status?.failureReason || (unmetItems.length > 0
      ? `${resultLabel}: ${unmetItems[0].label}`
      : status?.checkSummary || "判定根拠を確認中です。");
  return { decisionReason, verificationItems };
}

async function setInitialDetectedAutoTestStatus(status) {
  if (typeof buildInitialDetectedAutoTestEvidence === "function") {
    Object.assign(status, buildInitialDetectedAutoTestEvidence(status));
  }
  initialDetectedAutoTestStatus = status;
  try {
    await chrome.storage.session.set({
      [INITIAL_DETECTED_AUTO_TEST_STATUS_STORAGE_KEY]: status,
    });
  } catch (error) {
    logger.warn("自動判定状態の session 保存に失敗しました", error?.message);
  }
  return status;
}

async function getStoredInitialDetectedAutoTestStatus() {
  if (initialDetectedAutoTestStatus) return initialDetectedAutoTestStatus;

  try {
    const stored = await chrome.storage.session.get(
      INITIAL_DETECTED_AUTO_TEST_STATUS_STORAGE_KEY,
    );
    return stored[INITIAL_DETECTED_AUTO_TEST_STATUS_STORAGE_KEY] || {
      scenarioId: INITIAL_DETECTED_AUTO_TEST_SCENARIO_ID,
      status: "idle",
      active: false,
    };
  } catch (error) {
    logger.warn("自動判定状態の session 読み込みに失敗しました", error?.message);
    return {
      scenarioId: INITIAL_DETECTED_AUTO_TEST_SCENARIO_ID,
      status: "idle",
      active: false,
    };
  }
}

function buildInitialDetectedAutoTestNotification(status) {
  const resultLabels = {
    passed: "合格",
    failed: "不合格",
    needs_review: "要確認",
  };
  const result = resultLabels[status?.status] || "要確認";
  const reason =
    status?.status === "failed" || status?.status === "needs_review"
      ? `（${status.failureReason || "理由を確認してください"}）`
      : "";
  const title = status?.scenarioId === "keyword_missing_check"
    ? "空キーワード開始前バリデーションの自動判定が完了しました"
    : "開始直後に検知の自動判定が完了しました";

  return {
    notificationId: INITIAL_DETECTED_AUTO_TEST_NOTIFICATION_ID,
    options: {
      type: "basic",
      iconUrl: "/icons/icon48.png",
      title,
      message: `結果: ${result}${reason}`,
      silent: false,
      requireInteraction: true,
    },
  };
}

async function notifyInitialDetectedAutoTestCompleted(status) {
  const { notificationId, options } = buildInitialDetectedAutoTestNotification(status);
  let notification;
  try {
    const permissionLevel = await chrome.notifications.getPermissionLevel();
    if (permissionLevel !== "granted") {
      notification = { status: "permission_denied" };
      logger.warn("自動判定完了通知は許可されていません", permissionLevel);
    } else {
      await chrome.notifications.clear(notificationId);
      await chrome.notifications.create(notificationId, options);
      const notifications = await chrome.notifications.getAll();
      notification = {
        status: Object.prototype.hasOwnProperty.call(notifications, notificationId)
          ? "created"
          : "not_found_after_create",
      };
      if (notification.status === "not_found_after_create") {
        logger.warn("自動判定完了通知を作成後に確認できませんでした");
      }
    }
  } catch (error) {
    logger.warn("自動判定完了通知の表示に失敗しました", error?.message);
    notification = { status: "error" };
  }

  status.notification = notification;
  await setInitialDetectedAutoTestStatus(status);
  return notification;
}

function createSingleIntegrationAutoTestStatus(scenarioId) {
  return createInitialDetectedAutoTestStatus({
    scenarioId,
    checks: {
      monitoringStarted: false,
      expectedOutcome: false,
      monitoringStopped: false,
      configRestored: false,
      tabClosed: false,
      ...(scenarioId === "gmail_notification_check" ? { gmailNotificationSent: false } : {}),
    },
    runProgress: {
      reproduced: false,
      detected: false,
      saveCompleted: false,
      monitoringEnded: false,
    },
    checkSummary: "通常監視の開始・期待結果・cleanup を確認中です。",
  });
}

async function getGmailNotificationAutoTestPreflight() {
  const settings = await loadGmailNotificationSettings();
  if (!settings.enabled) {
    return { ready: false, reason: "Gmail 通知を有効にしてください。テストメール送信で認証も確認してください。" };
  }
  if (!isValidGmailRecipientEmail(settings.recipientEmail)) {
    return { ready: false, reason: "Gmail の送信先メールアドレスを設定してください。" };
  }
  const stored = await chrome.storage.local.get(GMAIL_NOTIFICATION_TEST_VERIFICATION_KEY);
  const verification = stored[GMAIL_NOTIFICATION_TEST_VERIFICATION_KEY];
  if (
    verification?.enabled !== true ||
    verification?.recipientEmail !== settings.recipientEmail
  ) {
    return { ready: false, reason: "テストメール送信を成功させて Gmail の認証と設定を確認してください。" };
  }
  return { ready: true };
}

async function getGmailNotificationAutoTestResult(testRunId) {
  const stored = await chrome.storage.local.get(GMAIL_NOTIFICATION_LAST_RESULT_KEY);
  const result = stored[GMAIL_NOTIFICATION_LAST_RESULT_KEY];
  return result?.source === "detection" && result?.testRunId === testRunId ? result : null;
}

async function completeKeywordMissingAutoTest() {
  const runId = `single-keyword_missing_check-${Date.now()}`;
  const status = createInitialDetectedAutoTestStatus({
    scenarioId: "keyword_missing_check",
    status: "passed",
    active: false,
    checks: {
      validationRejected: true,
      monitoringNotStarted: true,
    },
    runId,
    checkSummary:
      "空キーワードを開始前に拒否し、通常監視を開始しないことを確認しました。",
    completedAt: new Date().toISOString(),
  });

  // popup の開始前バリデーションが成功した後だけ呼ばれる検証専用の完了処理。
  // 通常監視、タブ作成、設定保存には触れない。
  await setInitialDetectedAutoTestStatus(status);
  writeSingleIntegrationAutoTestLog(
    `✅ [${runId}] 空キーワード開始前バリデーション確認`,
    { runId, scenarioId: status.scenarioId },
  );
  await notifyInitialDetectedAutoTestCompleted(status);
  return status;
}

function writeSingleIntegrationAutoTestLog(message, details) {
  // 自動判定の証跡は、利用者が WARNING 表示を選んでいても照合可能にする。
  // Service Worker 共通ログ基盤を通すため、通常ログ設定や console 直書きは変更しない。
  writeBgConsole("log", message, details);
}

// 監視を使うシナリオはテストタブの本番経路（startTestTabScenario）で実行する。
// ここに残るのは、通常監視を開始しない共有Chrome通知の確認だけ。
async function runSingleIntegrationAutoTest(scenarioId) {
  const scenario = SINGLE_INTEGRATION_AUTO_TEST_SCENARIOS[scenarioId];
  if (!scenario) throw new Error("このシナリオはテストタブの本番経路で実行します");

  const status = createSingleIntegrationAutoTestStatus(scenarioId);
  await setInitialDetectedAutoTestStatus(status);
  const notification = await showInventoryDetectionNotification({
    type: "keyword",
    targetUrl: "テスト専用（通常監視は開始しません）",
    detectMode: "appear",
    keyword: "共有Chrome通知テスト",
  });
  status.checks = {
    sharedNotificationShown: notification.success === true,
    noMonitoringStarted: true,
    noExternalNotification: true,
    noGmailNotification: true,
  };
  status.status = notification.success ? "passed" : "failed";
  status.active = false;
  status.completedAt = new Date().toISOString();
  status.checkSummary = notification.success
    ? "共有Chrome通知を表示しました。通常監視、保存、Gmail、外部拡張通知は実行していません。"
    : "共有Chrome通知を表示できませんでした。Service Workerログを確認してください。";
  status.failureReason = notification.success ? null : notification.error || "共有Chrome通知の表示に失敗しました";
  await setInitialDetectedAutoTestStatus(status);
  return status;
}

async function startSingleIntegrationAutoTest(scenarioId) {
  if (initialDetectedAutoTestInFlight) return initialDetectedAutoTestStatus;
  await setInitialDetectedAutoTestStatus(createSingleIntegrationAutoTestStatus(scenarioId));
  initialDetectedAutoTestInFlight = runSingleIntegrationAutoTest(scenarioId).finally(() => {
    initialDetectedAutoTestInFlight = null;
  });
  return initialDetectedAutoTestStatus;
}
function resolveWaitForPageReadyOptions(maxWaitTimeOrOptions = 8000) {
  if (
    maxWaitTimeOrOptions &&
    typeof maxWaitTimeOrOptions === "object" &&
    !Array.isArray(maxWaitTimeOrOptions)
  ) {
    return {
      maxWaitTime:
        typeof maxWaitTimeOrOptions.maxWaitTime === "number"
          ? maxWaitTimeOrOptions.maxWaitTime
          : 8000,
      targetSelector:
        typeof maxWaitTimeOrOptions.targetSelector === "string" &&
        maxWaitTimeOrOptions.targetSelector.trim() !== ""
          ? maxWaitTimeOrOptions.targetSelector.trim()
          : "",
      periodicReloadContext: maxWaitTimeOrOptions.periodicReloadContext || null,
      isPeriodicReload: maxWaitTimeOrOptions.isPeriodicReload === true,
    };
  }

  return {
    maxWaitTime:
      typeof maxWaitTimeOrOptions === "number" ? maxWaitTimeOrOptions : 8000,
    targetSelector: "",
    periodicReloadContext: null,
    isPeriodicReload: false,
  };
}

async function waitForPageReady(tabId, maxWaitTimeOrOptions = 8000) {
  const { maxWaitTime, targetSelector, periodicReloadContext, isPeriodicReload } = resolveWaitForPageReadyOptions(
    maxWaitTimeOrOptions,
  );
  const periodicPrefix =
    periodicReloadContext || isPeriodicReload ? "[周期リロード] " : "";
  // 【Phase 3修正】同一タブの重複DOM待機処理を防止
  const lockKey = `tab_${tabId}`;
  if (pageReadyLocks.has(lockKey)) {
    const existingPromise = pageReadyLocks.get(lockKey);
    logger.debug(`⏳ 既存のDOM待機処理に合流 (Tab: ${tabId})`);
    return await existingPromise;
  }

  const startTime = Date.now();
  let attempts = 0;
  const maxAttempts = Math.ceil(maxWaitTime / 500); // 0.5秒間隔で最大16回チェック

  // DOM待機処理のPromiseを生成し、ロックに登録
  const waitPromise = (async () => {
    try {
      logger.debug(
        `⏳ ${periodicPrefix}ページ準備待機開始 (Tab: ${tabId}, 最大待機: ${maxWaitTime}ms, lockKey: ${lockKey}, targetSelector: ${targetSelector || "none"})`,
      );

      while (attempts < maxAttempts) {
        try {
          // タブの状態確認
          const tab = await chrome.tabs.get(tabId);
          if (tab.status !== "complete") {
            logger.debug(
              `⏳ タブ読み込み中... (status: ${tab.status}, attempt: ${attempts + 1})`,
            );
            await new Promise((resolve) => setTimeout(resolve, 500));
            attempts++;
            continue;
          }

          // DOM準備状態の確認
          const readyResult = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            args: [targetSelector],
            function: (expectedSelector) => {
              const isReady = document.readyState === "complete";
              const hasContent =
                document.body && document.body.children.length > 0;
              const hasTargetSelector =
                typeof expectedSelector === "string" && expectedSelector.trim() !== ""
                  ? document.querySelector(expectedSelector) !== null
                  : null;

              return {
                readyState: document.readyState,
                isReady: isReady,
                hasContent: hasContent,
                hasTargetSelector: hasTargetSelector,
                targetSelector: expectedSelector || "",
                bodyChildrenCount: document.body
                  ? document.body.children.length
                  : 0,
                timestamp: new Date().toISOString(),
              };
            },
          });

          const domState = readyResult[0]?.result;
          logger.debug(
            `🔍 ${periodicPrefix}DOM状態確認 (attempt: ${attempts + 1}):`,
            domState,
          );

          // DOM準備完了の判定
          if (domState?.isReady && domState?.hasContent) {
            const elapsedTime = Date.now() - startTime;
            logger.info(
              `✅ ${periodicPrefix}DOM準備完了 (${elapsedTime}ms, attempts: ${attempts + 1})`,
            );
            return true;
          }

          // まだ準備中の場合は待機
          logger.debug(
            `⏳ DOM準備中... (readyState: ${domState?.readyState}, hasContent: ${domState?.hasContent}, hasTarget: ${domState?.hasTargetSelector})`,
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        } catch (error) {
          logger.warn(
            `⚠️ DOM準備確認エラー (attempt: ${attempts + 1}):`,
            error.message,
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        }
      }

      // タイムアウト時の処理
      const elapsedTime = Date.now() - startTime;
      logger.warn(
        `⚠️ DOM準備待機タイムアウト (${elapsedTime}ms, attempts: ${attempts})`,
      );
      return false;
    } catch (error) {
      logger.error(`❌ DOM待機処理エラー (Tab: ${tabId}):`, error);
      return false;
    } finally {
      // ロック解除
      pageReadyLocks.delete(lockKey);
      logger.debug(
        `🔓 ${periodicPrefix}DOM待機ロック解除 (Tab: ${tabId})`,
      );
    }
  })();

  // Promise をロックに登録
  pageReadyLocks.set(lockKey, waitPromise);
  return await waitPromise;
}

/**
 * キーワード変化検知処理
 * Content Scriptと通信してキーワードの存在状態を確認する
 */
let configManager = {
  async loadConfig() {
    try {
      logger.debug("configManager.loadConfig実行開始");
      const result = await loadConfig();
      logger.debug("configManager.loadConfig完了:", result);
      return result;
    } catch (error) {
      bgLogError("❌ configManager.loadConfigエラー:", error);
      // エラー時はデフォルト設定を返す
      return {
        mode: "single",
        single_config: { url: "", settings: {} },
        multiple_configs: [],
        last_updated: new Date().toISOString(),
      };
    }
  },

  async saveConfig(config) {
    try {
      // partial update を許容しつつ、I/OはMCMへ集約
      const base = currentConfig || (await loadConfig());
      const merged =
        config && typeof config === "object" ? { ...base, ...config } : base;
      return await saveConfig(merged);
    } catch (error) {
      bgLogError("❌ configManager.saveConfigエラー:", error);
      return false;
    }
  },

  async changeMode(mode) {
    try {
      const mcm = await ensureMonitoringConfigManager();
      const ok = await mcm.changeMode(mode);
      // キャッシュ更新
      currentConfig = await mcm.loadConfig();
      return { success: !!ok, mode: mode };
    } catch (error) {
      bgLogError("❌ モード変更失敗:", error);
      return { success: false, error: error.message };
    }
  },

  async addMonitoringTarget(target) {
    return await addMonitoringTarget(target);
  },

  async removeMonitoringTarget(targetId) {
    try {
      bgLogInfo("🔄 configManager.removeMonitoringTarget実行開始:", targetId);
      const mcm = await ensureMonitoringConfigManager();
      const result = await mcm.removeMonitoringTarget(targetId);
      // キャッシュ更新（互換）
      currentConfig = await mcm.loadConfig();
      return result;
    } catch (error) {
      bgLogError("❌ configManager.removeMonitoringTarget失敗:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  async updateMonitoringTarget(targetId, updates) {
    try {
      bgLogInfo(
        "🔄 configManager.updateMonitoringTarget実行開始:",
        targetId,
        updates,
      );
      const mcm = await ensureMonitoringConfigManager();
      const ok = await mcm.updateMonitoringTarget(targetId, updates);
      currentConfig = await mcm.loadConfig();
      return { success: !!ok };
    } catch (error) {
      bgLogError("❌ configManager.updateMonitoringTarget失敗:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  async getStatus() {
    try {
      const mcm = await ensureMonitoringConfigManager();
      const monitoringStatus = await mcm.getStatus();

      // 応答データの構築（軽量化）
      const responseData = {
        success: true,
        mode: monitoringStatus.mode || currentConfig?.mode || "single",
        targets_count: monitoringStatus.targets_count || 0,
        last_updated:
          monitoringStatus.last_updated || currentConfig?.last_updated,
        multiple_configs: monitoringStatus.multiple_configs || [],
        multiple_common_settings:
          monitoringStatus.multiple_common_settings ||
          currentConfig?.multiple_common_settings ||
          {},
        single_config_backup: monitoringStatus.single_config_backup || null,
        multiple_configs_backup: monitoringStatus.multiple_configs_backup || null,
        multiple_test_scenario_state:
          monitoringStatus.multiple_test_scenario_state || null,
        single_config: monitoringStatus.single_config || {},
        single_scheduled_watch: monitoringStatus.single_scheduled_watch || {},
        single_keyword_schedule: monitoringStatus.single_keyword_schedule || {
          enabled: false,
          startTime: "11:57",
        },
      };

      // 応答データ確認（軽量版）
      logger.debug("✅ getStatus応答データ準備完了:", {
        success: responseData.success,
        mode: responseData.mode,
        configsCount: responseData.multiple_configs?.length || 0,
      });

      // メッセージングサイズ制限チェック（段階的軽量化）
      const totalSize = JSON.stringify(responseData).length;
      const configsSize = JSON.stringify(
        responseData.multiple_configs || [],
      ).length;

      logger.debug("📏 詳細データサイズ分析:", {
        totalSize: totalSize + " bytes",
        configsSize: configsSize + " bytes",
        configsCount: responseData.multiple_configs?.length || 0,
      });

      // Chrome Runtime制限（実際は4-8KB）を考慮した段階的軽量化
      if (totalSize > 5000) {
        logger.debug(
          "⚠️ データサイズ制限(5KB)により軽量化実行:",
          totalSize,
          "bytes",
        );

        // 段階1: 不要フィールドの最小化
        const lightResponseData = {
          success: responseData.success,
          mode: responseData.mode,
          targets_count: responseData.targets_count,
          last_updated: responseData.last_updated,
          multiple_common_settings: responseData.multiple_common_settings,
          // 単一URL A の予約状態判定には保存済みURLが必要なため、
          // 軽量化してもURLだけは保持する。
          single_config: { url: responseData.single_config?.url || "" },
          single_scheduled_watch: responseData.single_scheduled_watch,
          single_keyword_schedule: responseData.single_keyword_schedule,
          multiple_configs_summary: {
            count: responseData.multiple_configs?.length || 0,
            sample: responseData.multiple_configs?.slice(0, 5) || [],
            truncated: (responseData.multiple_configs?.length || 0) > 5,
          },
          size_optimized: true,
        };

        const lightSize = JSON.stringify(lightResponseData).length;

        // 軽量化後もまだ大きい場合は超軽量モードに切り替え
        if (lightSize > 3000) {
          logger.debug(
            "⚠️ 軽量化後もサイズ過大、超軽量モードに切り替え:",
            lightSize,
            "bytes",
          );
          const ultraLightData = {
            success: true,
            mode: responseData.mode,
            targets_count: responseData.targets_count,
            multiple_common_settings: responseData.multiple_common_settings,
            single_config: { url: responseData.single_config?.url || "" },
            single_scheduled_watch: responseData.single_scheduled_watch,
            single_keyword_schedule: responseData.single_keyword_schedule,
            multiple_configs_count: responseData.multiple_configs?.length || 0,
            ultra_optimized: true,
          };

          logger.debug("✅ 超軽量化完了:", {
            originalSize: totalSize + " bytes",
            ultraLightSize: JSON.stringify(ultraLightData).length + " bytes",
            configsCount: ultraLightData.multiple_configs_count,
          });

          return ultraLightData;
        }

        logger.debug("✅ 軽量化完了:", {
          originalSize: totalSize + " bytes",
          lightSize: lightSize + " bytes",
          reduction:
            Math.round(((totalSize - lightSize) / totalSize) * 100) + "%",
          configsSample: lightResponseData.multiple_configs_summary.count,
        });

        return lightResponseData;
      }

      // 簡潔な要約ログ（重複ログの代替）
      logger.debug("✅ 監視設定取得完了", {
        mode: responseData.mode,
        configs: responseData.multiple_configs?.length || 0,
        size: `${totalSize} bytes`,
      });

      return responseData;
    } catch (error) {
      bgLogError("❌ getStatusエラー:", error);
      return {
        success: false,
        mode: currentConfig?.mode || "single",
        targets_count: 0,
        last_updated: currentConfig?.last_updated,
        error: error.message,
        // エラー時でも空の配列を返す
        multiple_configs: [],
        multiple_common_settings: {},
        single_config: {},
        single_scheduled_watch: {},
        single_keyword_schedule: { enabled: false, startTime: "11:57" },
      };
    }
  },

  async initialize() {
    await loadConfig();
    return true;
  },

  async importFromExcel(file) {
    try {
      bgLogInfo("🔄 Excel Import処理開始 (configManager)");
      const mcm = await ensureMonitoringConfigManager();
      const result = await mcm.importFromExcel(file);
      bgLogInfo("✅ Excel Import完了 (configManager):", result);
      return result;
    } catch (error) {
      bgLogError("❌ Excel Import失敗 (configManager):", error);
      throw error;
    }
  },

  async exportToExcel() {
    try {
      bgLogInfo("🔄 Excel Export処理開始 (configManager)");
      const mcm = await ensureMonitoringConfigManager();
      const result = await mcm.exportToExcel();
      bgLogInfo("✅ Excel Export完了 (configManager):", result);
      return result;
    } catch (error) {
      bgLogError("❌ Excel Export失敗 (configManager):", error);
      throw error;
    }
  },

  validateConfig(config) {
    return { isValid: true, config: config || currentConfig };
  },
};

async function handleLoadConfigMessage(sendResponse) {
  try {
    const config = await configManager.loadConfig();
    sendResponse({ success: true, config });
  } catch (error) {
    bgLogError("❌ loadConfigエラー:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSaveConfigMessage(request, sendResponse) {
  try {
    const success = await configManager.saveConfig(request.config);
    if (success) {
      await syncScheduledStockCheck(request.config);
    }
    sendResponse({ success });
  } catch (error) {
    bgLogError("❌ saveConfigエラー:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleChangeModeMessage(request, sendResponse) {
  try {
    bgLogInfo("🔄 changeMode要求受信:", request.mode);
    const result = await configManager.changeMode(request.mode);
    if (result?.success) {
      await syncScheduledStockCheck();
    }
    bgLogInfo("✅ changeMode完了:", result);
    sendResponse(result);
  } catch (error) {
    bgLogError("❌ changeModeエラー:", error);
    sendResponse({ success: false, error: error.message });
  }
}

function getMonitoringSessionScope(session) {
  if (session?.monitoringScope === "multiple") return "multiple";
  if (session?.monitoringScope === "single") return "single";
  // 旧データは、multiple 経路が渡す monitorType: "tab" から安全に分類する。
  return session?.settings?.monitorType === "tab" ? "multiple" : "single";
}

function getMonitoringSessionOrigin(session) {
  return session?.monitoringOrigin === "scheduled" ? "scheduled" : "immediate";
}

// getStatus の軽量化では multiple_configs が省略されることがある。
// 予約可否は省略済み応答ではなく、常に正本設定の対象配列で判定する。
function resolveMultipleMonitoringConfigForStatus(status = {}, canonicalConfig = {}) {
  return {
    multipleConfigs: Array.isArray(canonicalConfig?.multiple_configs)
      ? canonicalConfig.multiple_configs
      : Array.isArray(status?.multiple_configs)
        ? status.multiple_configs
        : [],
    commonSettings: canonicalConfig?.multiple_common_settings && typeof canonicalConfig.multiple_common_settings === "object"
      ? canonicalConfig.multiple_common_settings
      : status?.multiple_common_settings || {},
  };
}

async function stopMultipleMonitoringByOrigin(origin) {
  const sessions = await getSingleMonitoringSessions();
  const targets = Object.values(sessions).filter((session) => (
    session?.active &&
    getMonitoringSessionScope(session) === "multiple" &&
    getMonitoringSessionOrigin(session) === origin
  ));
  await Promise.all(targets.map((session) => deactivateSingleMonitoringSession(session.id, "manual_stop")));
  return { success: true, stoppedCount: targets.length, monitoringOrigin: origin };
}

async function handleGetStatusMessage(sendResponse) {
  try {
    const status = await configManager.getStatus();
    const canonicalConfig = await configManager.loadConfig();
    const persistedSessions = await getSingleMonitoringSessions();
    const persistedSession = Object.values(persistedSessions).find((session) => (
      session.active && getMonitoringSessionScope(session) === "single"
    )) || null;
    const tabId = persistedSession?.tabId || null;
    const currentState = persistedSession;
    const isRunning = !!persistedSession;
    const scheduledSettings = status.single_scheduled_watch || {};
    const scheduledTargetUrl = scheduledSettings.url || "";
    const scheduledMonitorSelector = scheduledSettings.monitorSelector || "";
    const singleScheduledWatchEnabled = scheduledSettings.enabled === true;
    const scheduledStore = await chrome.storage.local.get(STOCK_WATCH_SESSION_KEY);
    const scheduledSession = scheduledStore[STOCK_WATCH_SESSION_KEY] || null;
    const scheduledAlarm = await chrome.alarms.get(DAILY_STOCK_CHECK_ALARM);
    const scheduledWatch = {
      enabled: singleScheduledWatchEnabled && Boolean(scheduledTargetUrl) && Boolean(scheduledMonitorSelector),
      scheduleEnabled: singleScheduledWatchEnabled,
      isRunning: scheduledSession?.active === true,
      startTime: scheduledSettings.startTime || "",
      endTime: scheduledSettings.endTime || "",
      intervalSeconds: scheduledSettings.intervalSeconds || 0,
      nextRunAt: scheduledAlarm?.scheduledTime || null,
      trigger: scheduledSession?.trigger || null,
      windowEndAt: scheduledSession?.windowEndMs || null,
      reason: !singleScheduledWatchEnabled
        ? "定時監視を有効にしてください"
        : !scheduledTargetUrl
          ? "検索結果・一覧ページURLを設定してください"
          : !scheduledMonitorSelector
            ? "商品取得セレクタを設定してください"
            : null,
    };
    const singleKeywordScheduleSettings = status.single_keyword_schedule || {};
    const singleKeywordTargetUrl = status.single_config?.url || "";
    const singleKeywordScheduleEnabled = singleKeywordScheduleSettings.enabled === true;
    const singleKeywordAlarm = await chrome.alarms.get(DAILY_SINGLE_KEYWORD_MONITORING_ALARM);
    const singleKeywordScheduleReason = !singleKeywordScheduleEnabled
      ? "定時監視を有効にしてください"
      : status.mode !== "single"
        ? "単一URL監視モードで設定してください"
        : !singleKeywordTargetUrl
          ? "商品ページURLを指定してください"
          : null;
    const singleKeywordScheduledWatch = {
      enabled: singleKeywordScheduleReason === null,
      scheduleEnabled: singleKeywordScheduleEnabled,
      isRunning,
      startTime: singleKeywordScheduleSettings.startTime || "",
      nextRunAt: singleKeywordAlarm?.scheduledTime || null,
      reason: singleKeywordScheduleReason,
    };
    const { multipleConfigs, commonSettings: multipleSettings } = resolveMultipleMonitoringConfigForStatus(
      status,
      canonicalConfig,
    );
    const enabledMultipleConfigs = multipleConfigs.filter((item) => item?.enabled);
    const multipleScheduledAlarm = await chrome.alarms.get(DAILY_MULTIPLE_MONITORING_ALARM);
    const activeMultipleSessions = Object.values(persistedSessions).filter((session) => (
      session.active && getMonitoringSessionScope(session) === "multiple"
    ));
    const activeImmediateMultipleSessions = activeMultipleSessions.filter((session) => (
      getMonitoringSessionOrigin(session) === "immediate"
    ));
    const activeScheduledMultipleSessions = activeMultipleSessions.filter((session) => (
      getMonitoringSessionOrigin(session) === "scheduled"
    ));
    const multipleScheduleEnabled = multipleSettings.scheduleEnabled === true;
    const multipleScheduleReason = !multipleScheduleEnabled
      ? "定時監視を有効にしてください"
      : status.mode !== "multiple"
        ? "複数URL監視モードで設定してください"
        : enabledMultipleConfigs.length === 0
          ? "有効な監視対象が0件のため予約できません"
          : null;
    const multipleScheduledWatch = {
      enabled: multipleScheduleReason === null,
      scheduleEnabled: multipleScheduleEnabled,
      isRunning: activeImmediateMultipleSessions.length > 0,
      immediateRunningCount: activeImmediateMultipleSessions.length,
      scheduledRunningCount: activeScheduledMultipleSessions.length,
      startTime: multipleSettings.scheduleTime || "",
      targetCount: enabledMultipleConfigs.length,
      nextRunAt: multipleScheduledAlarm?.scheduledTime || null,
      reason: multipleScheduleReason,
    };

    const singleModeStatus = {
      isRunning,
      tabId,
      iteration: 0,
      totalIterations: 0,
      settings: currentState?.settings || {},
      monitoringMode: currentState?.monitoringMode || currentState?.settings?.monitoringMode || "high_frequency",
      keywordScheduledWatch: singleKeywordScheduledWatch,
      scheduledWatch,
    };
    const multipleModeStatus = {
      activeMonitors: activeMultipleSessions.map((session) => ({
        id: session.settings?.aiSupportContext?.configId || session.id,
        status: "running",
      })),
      scheduledWatch: multipleScheduledWatch,
    };

    sendResponse({
      success: true,
      status: {
        ...status,
        singleModeStatus,
        multipleModeStatus,
      },
    });
  } catch (error) {
    bgLogError("❌ getStatusエラー:", error);
    sendResponse({ success: false, error: error.message });
  }
}

function handleGetLogLevelMessage(sendResponse) {
  const currentLevel = logger.getLevel();
  sendResponse({
    success: true,
    currentLevel,
    logLevel: currentLevel,
    logLevelName: getLogLevelName(currentLevel),
  });
}

async function handleSetLogLevelMessage(request, sendResponse) {
  try {
    const level = Number(request.level);
    if (isValidLogLevel(level)) {
      await logger.setLevel(level);
      sendResponse({
        success: true,
        status: "success",
        currentLevel: level,
        logLevel: level,
        logLevelName: getLogLevelName(level),
        message: `ログレベルを${getLogLevelName(level)}に設定しました`,
      });
    } else {
      sendResponse({
        success: false,
        error: "無効なログレベルです (0-4の範囲で指定してください)",
      });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

function createStockFetchDiagnosisRunId(now = new Date()) {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now).reduce((parts, part) => {
    parts[part.type] = part.value;
    return parts;
  }, {});
  const compactTimestamp = `${dateParts.year}${dateParts.month}${dateParts.day}${dateParts.hour}${dateParts.minute}${dateParts.second}`;
  return `stock-fetch-${compactTimestamp}-${Math.random().toString(36).slice(2, 8)}`;
}

async function analyzeStockFetchHtmlWithOffscreen(payload) {
  await ensureOffscreenDocument();
  const response = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "OFFSCREEN_ANALYZE_STOCK_HTML",
    payload,
  });
  if (!response?.success) {
    throw new Error(response?.error || "HTML比較に失敗しました");
  }
  return response.analysis;
}

function buildStockFetchDiagnosisReadme({ runId, diagnosisCode }) {
  return `# 在庫取得方式診断\n\n` +
    `- run ID: ${runId}\n` +
    `- 暫定判定: ${diagnosisCode}\n\n` +
    `この結果は単一の観測状態における暫定評価です。Fetch方式を採用する前に、同じ商品・SKU・ログイン状態で在庫ありと在庫なしをそれぞれ取得して比較してください。\n\n` +
    `CodexまたはClaudeへHTML・HARを渡す前に、Cookie、認証トークン、個人情報、注文情報を削除してください。\n`;
}

function buildStockApiInvestigationMemo(diagnosis = {}) {
  return `# 在庫API調査メモ\n\n` +
    `- run ID: ${diagnosis.runId || "未取得"}\n` +
    `- 対象URL: ${diagnosis.finalUrl || diagnosis.targetUrl || "未取得"}\n` +
    `- 観測状態: ${diagnosis.observedState || "不明"}\n` +
    `- 暫定判定: ${diagnosis.diagnosisCode || "未判定"}\n` +
    `- セレクタ: ${diagnosis.selector || "未指定"}\n` +
    `- キーワード: ${diagnosis.keyword || "未指定"}\n\n` +
    `## DevToolsでの確認手順\n\n` +
    `1. 対象ページを開き、DevToolsのNetworkを開く。\n` +
    `2. Preserve logを有効にし、Fetch/XHRで通信を絞り込む。\n` +
    `3. 商品・SKU・バリエーションを同じ条件にして、在庫表示を再現する。\n` +
    `4. 在庫状態で変化するレスポンス、商品ID、SKU、在庫数や販売可否の項目を確認する。\n` +
    `5. 必要時のみHARを保存し、AIへ渡す前にCookie・トークン・個人情報を削除する。\n`;
}

function diagnosisMatchesExpectedState(analysis, state) {
  if (!analysis || analysis.error || analysis.matchCount <= 0) return false;
  return state === "in_stock" ? analysis.hasKeyword === true : analysis.hasKeyword === false;
}

function classifyBulkStockFetchDiagnosis(samples = []) {
  if (!Array.isArray(samples) || samples.length === 0) return "SAMPLES_NOT_REGISTERED";
  const domExpected = samples.every((sample) => diagnosisMatchesExpectedState(sample.analysis?.dom, sample.state));
  const fetchExpected = samples.every((sample) =>
    !sample.fetchError && diagnosisMatchesExpectedState(sample.analysis?.fetch, sample.state)
  );
  if (fetchExpected && domExpected) return "FETCH_SUPPORTED";
  if (domExpected) return "DOM_ONLY";
  return "NEEDS_REVIEW";
}

function buildBulkStockFetchDiagnosisReadme({ runId, siteName, diagnosisCode }) {
  return `# ECサイト一括 在庫取得方式診断\n\n` +
    `- run ID: ${runId}\n- ECサイト: ${siteName || "未指定"}\n- 最終判定: ${diagnosisCode}\n\n` +
    `in_stock はキーワード一致、out_of_stock は同じセレクタ内のキーワード不一致を期待値として比較しています。` +
    `HTMLをCodexまたはClaudeへ渡す前に、Cookie、認証トークン、個人情報、注文情報を削除してください。\n`;
}

function buildBulkStockFetchDiagnosisCommentary(summary = {}) {
  const stateLabel = (state) => state === "in_stock" ? "在庫あり" : "在庫なし";
  const diagnosisGuidance = {
    FETCH_SUPPORTED: "登録済みの全サンプルで、Fetch HTMLとDOMが在庫あり・なしの期待どおりでした。現在のセレクタとキーワードはFetch方式の候補です。商品、SKU、バリエーション、ログイン状態を増やしても同じ結果になるか確認したうえで、Fetch監視の実装を別タスクとして検討してください。",
    DOM_ONLY: "DOMでは在庫あり・なしを区別できますが、Fetch HTMLでは区別できません。現行のDOM監視を維持し、DevTools NetworkのFetch/XHRから在庫API候補を調査してください。",
    NEEDS_REVIEW: "取得失敗、セレクタ不一致、またはキーワード不一致のサンプルがあります。下表の不一致行と同じrun内のcomparison.json・HTMLを確認し、商品状態、SKU、バリエーション、ログイン状態、監視条件を見直してください。",
    SAMPLES_NOT_REGISTERED: "状態別サンプルが未登録のため判定できません。手動確認済みの在庫あり・なしURLをsite_captureへ追加し、診断用サンプルを同期してから再実行してください。",
  };
  const lines = [
    "# 在庫Fetch一括診断 解説",
    "",
    `- run ID: ${summary.runId || "未取得"}`,
    `- 判定日時: ${summary.diagnosedAt || "未取得"}`,
    `- ECサイト: ${summary.siteName || summary.siteId || "未取得"}`,
    `- 最終判定: ${summary.diagnosisCode || "未判定"}`,
    `- 監視条件: ${summary.selector || "未指定"} / ${summary.keyword || "未指定"}`,
    "",
    "## 判定の解説",
    "",
    diagnosisGuidance[summary.diagnosisCode] || "判定の解説を生成できませんでした。summary.jsonを確認してください。",
    "",
    "## 状態別の成功数",
    "",
    "| 状態 | Fetch | DOM |",
    "| --- | --- | --- |",
  ];
  for (const state of ["in_stock", "out_of_stock"]) {
    const result = summary.states?.[state] || {};
    lines.push(`| ${stateLabel(state)} | ${result.fetchExpected || 0}/${result.total || 0} | ${result.domExpected || 0}/${result.total || 0} |`);
  }
  lines.push("", "## URL別の結果", "", "| 状態 | 商品 | URL | Fetch | DOM |", "| --- | --- | --- | --- | --- |");
  for (const sample of summary.samples || []) {
    const fetch = sample.analysis?.fetch || {};
    const dom = sample.analysis?.dom || {};
    const fetchResult = sample.fetchError ? `取得失敗: ${sample.fetchError.message || "不明"}` : `HTTP ${sample.fetch?.status ?? "-"}、要素 ${fetch.matchCount ?? 0}、キーワード ${fetch.keywordMatchCount ?? 0}`;
    const domResult = `要素 ${dom.matchCount ?? 0}、キーワード ${dom.keywordMatchCount ?? 0}`;
    lines.push(`| ${stateLabel(sample.state)} | ${String(sample.title || "-").replace(/\|/g, "\\|")} | ${sample.finalUrl || sample.targetUrl || "-"} | ${fetchResult} | ${domResult} |`);
  }
  lines.push("", "## 注意", "", "このファイルはsummary.jsonを人が確認しやすい形にした解説です。HTML本文は含みません。保存済みHTMLを外部の分析ツールへ渡す前に、Cookie、認証トークン、個人情報、注文情報を削除してください。", "");
  return lines.join("\n");
}

function buildBulkStockFetchSummaryFieldCommentary(summary = {}) {
  const stateLabel = (state) => state === "in_stock" ? "在庫あり" : "在庫なし";
  const lines = [
    "# summary.json 項目解説",
    "",
    "このファイルは同じrun内の`summary.json`を、人が値の意味を確認しやすいよう項目ごとにコメントしたものです。`summary.json`自体は機械処理用のJSONとして変更していません。",
    "",
    "## 全体情報",
    "",
    `- \`runId\`: \`${summary.runId || "未取得"}\` — 今回の診断runを識別するID。`,
    `- \`diagnosedAt\`: \`${summary.diagnosedAt || "未取得"}\` — 一括診断の完了日時（ISO 8601 / UTC）。popupでは日本時間で表示。`,
    `- \`siteId\`: \`${summary.siteId || "未取得"}\` — ECサイト定義のID。`,
    `- \`siteName\`: ${summary.siteName || "未取得"} — popupに表示するECサイト名。`,
    `- \`selector\`: \`${summary.selector || "未指定"}\` — 在庫状態を調べたCSSセレクタ。`,
    `- \`keyword\`: \`${summary.keyword || "未指定"}\` — 在庫ありを示すキーワード。`,
    `- \`diagnosisCode\`: \`${summary.diagnosisCode || "未判定"}\` — 全サンプルを統合した最終判定。`,
    "",
    "## states: 状態別の集計",
    "",
    "| JSON項目 | 値 | コメント |",
    "| --- | --- | --- |",
  ];
  for (const state of ["in_stock", "out_of_stock"]) {
    const result = summary.states?.[state] || {};
    const prefix = `states.${state}`;
    lines.push(
      `| \`${prefix}.total\` | ${result.total || 0} | ${stateLabel(state)}として登録されたサンプル総数。 |`,
      `| \`${prefix}.fetchExpected\` | ${result.fetchExpected || 0} | Fetch HTMLが期待値を満たした件数。 |`,
      `| \`${prefix}.domExpected\` | ${result.domExpected || 0} | 表示後DOMが期待値を満たした件数。 |`,
    );
  }
  lines.push("", "## samples: URL別の詳細", "");
  (summary.samples || []).forEach((sample, index) => {
    const fetch = sample.analysis?.fetch || {};
    const dom = sample.analysis?.dom || {};
    const expected = sample.state === "in_stock" ? "キーワードがあること" : "キーワードがないこと";
    lines.push(
      `### samples[${index}] — ${sample.title || "名称未取得"}`,
      "",
      `- \`state\` / \`observedState\`: \`${sample.state || sample.observedState || "未取得"}\` — このURLで期待する状態（${stateLabel(sample.state)}）。`,
      `- \`targetUrl\`: ${sample.targetUrl || "未取得"} — 診断開始時に開くURL。`,
      `- \`finalUrl\`: ${sample.finalUrl || "未取得"} — リダイレクト後に実際に比較したURL。`,
      `- \`fetch.status\`: \`${sample.fetch?.status ?? "未取得"}\` — Service Worker FetchのHTTP応答コード。`,
      `- \`analysis.fetch.matchCount\`: \`${fetch.matchCount ?? 0}\` — Fetch HTMLでセレクタに一致した要素数。`,
      `- \`analysis.fetch.keywordMatchCount\`: \`${fetch.keywordMatchCount ?? 0}\` — Fetch HTMLの一致要素内でキーワードが見つかった数。`,
      `- \`analysis.fetch.hasKeyword\`: \`${fetch.hasKeyword ?? false}\` — Fetch HTMLが期待値（${expected}）を判定する基礎値。`,
      `- \`analysis.dom.matchCount\`: \`${dom.matchCount ?? 0}\` — 表示後DOMでセレクタに一致した要素数。`,
      `- \`analysis.dom.keywordMatchCount\`: \`${dom.keywordMatchCount ?? 0}\` — 表示後DOMの一致要素内でキーワードが見つかった数。`,
      `- \`analysis.dom.hasKeyword\`: \`${dom.hasKeyword ?? false}\` — DOMが期待値（${expected}）を判定する基礎値。`,
      `- \`fetchError\`: ${sample.fetchError ? `\`${sample.fetchError.message || "取得失敗"}\`` : "`null`（Fetch取得成功）"}。`,
      `- \`diagnosisCode\`: \`${sample.diagnosisCode || "未判定"}\` — このURL単体の診断コード。在庫なしではキーワード不一致が期待値のため、\`NO_MATCH\`でも一括判定では成功として扱う。`,
      ""
    );
  });
  lines.push("## 注意", "", "HTML本文はこのファイルに含みません。保存済みHTMLを外部の分析ツールへ渡す前に、Cookie、認証トークン、個人情報、注文情報を削除してください。", "");
  return lines.join("\n");
}

async function collectStockFetchDiagnosisForUrl({ targetUrl, selector, keyword, observedState }) {
  let temporaryTabId = null;
  let fetchError = null;
  try {
    const normalizedUrl = new URL(targetUrl).toString();
    const temporaryTab = await chrome.tabs.create({ url: normalizedUrl, active: false });
    temporaryTabId = temporaryTab.id;
    await waitForPageReady(temporaryTabId);
    const targetTab = await chrome.tabs.get(temporaryTabId);
    if (/^(chrome|chrome-extension|devtools):\/\//.test(targetTab?.url || "")) {
      throw new Error("Chrome内部ページは診断できません");
    }
    const [{ result: outerHtml }] = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id }, func: () => document.documentElement.outerHTML,
    });
    const finalUrl = targetTab.url;
    let fetchHtml = "";
    let fetchMeta = { url: finalUrl, status: null, contentType: "" };
    try {
      const response = await fetch(finalUrl, { credentials: "include" });
      fetchHtml = await response.text();
      fetchMeta = { url: response.url || finalUrl, status: response.status, ok: response.ok, contentType: response.headers.get("content-type") || "" };
      if (!response.ok) fetchError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      fetchError = error;
      fetchMeta = { ...fetchMeta, error: error.message };
    }
    const analysis = await analyzeStockFetchHtmlWithOffscreen({ fetchHtml, outerHtml, selector, keyword });
    return {
      targetUrl: normalizedUrl, finalUrl, observedState, selector, keyword, fetch: fetchMeta, fetchHtml, outerHtml,
      analysis, fetchError: fetchError ? { message: fetchError.message } : null,
      diagnosisCode: classifyStockFetchDiagnosis({ fetchAnalysis: analysis.fetch, domAnalysis: analysis.dom, fetchError }),
    };
  } catch (error) {
    return { targetUrl, observedState, selector, keyword, fetch: { status: null, error: error.message }, fetchHtml: "", outerHtml: "", analysis: {}, fetchError: { message: error.message }, diagnosisCode: "FETCH_ERROR" };
  } finally {
    if (temporaryTabId != null) {
      try { await chrome.tabs.remove(temporaryTabId); } catch (error) { bgLogWarn("診断用一時タブを閉じられませんでした:", error.message); }
    }
  }
}

async function handleBulkDiagnoseStockFetchMessage(request, sendResponse) {
  const runId = createStockFetchDiagnosisRunId();
  const selector = String(request.selector || "").trim();
  const keyword = String(request.keyword || "").trim();
  const samples = Array.isArray(request.samples) ? request.samples.filter((sample) =>
    ["in_stock", "out_of_stock"].includes(sample?.state) && typeof sample?.url === "string"
  ) : [];
  try {
    if (!selector || !keyword) throw new Error("診断には監視対象セレクタと監視キーワードが必要です");
    if (samples.length === 0) {
      sendResponse({ success: true, summary: { runId, siteId: request.siteId, diagnosisCode: "SAMPLES_NOT_REGISTERED", samples: [] } });
      return;
    }
    const results = [];
    for (const sample of samples) {
      const result = await collectStockFetchDiagnosisForUrl({ targetUrl: sample.url, selector, keyword, observedState: sample.state });
      results.push({ ...result, state: sample.state, title: sample.title || "" });
    }
    const diagnosisCode = classifyBulkStockFetchDiagnosis(results);
    const states = ["in_stock", "out_of_stock"].reduce((summary, state) => {
      const stateResults = results.filter((result) => result.state === state);
      summary[state] = { total: stateResults.length, fetchExpected: stateResults.filter((result) => !result.fetchError && diagnosisMatchesExpectedState(result.analysis?.fetch, state)).length, domExpected: stateResults.filter((result) => diagnosisMatchesExpectedState(result.analysis?.dom, state)).length };
      return summary;
    }, {});
    const summary = { runId, diagnosedAt: new Date().toISOString(), siteId: request.siteId, siteName: request.siteName, selector, keyword, diagnosisCode, states, samples: results.map(({ fetchHtml, outerHtml, ...result }) => result) };
    const base = `PageRecorder/stock-fetch-diagnosis/${runId}`;
    const downloads = results.flatMap((result, index) => {
      const sampleBase = `${base}/${result.state}/${String(index + 1).padStart(2, "0")}`;
      const saved = { ...result }; delete saved.fetchHtml; delete saved.outerHtml;
      return [
        FileSave.saveHtml({ html: result.fetchHtml, filename: `${sampleBase}/fetch.html` }),
        FileSave.saveHtml({ html: result.outerHtml, filename: `${sampleBase}/outerHTML.html` }),
        FileSave.download({ textContent: JSON.stringify(saved, null, 2), mimeType: "application/json;charset=utf-8", filename: `${sampleBase}/comparison.json` }),
      ];
    });
    downloads.push(
      FileSave.download({ textContent: JSON.stringify(summary, null, 2), mimeType: "application/json;charset=utf-8", filename: `${base}/summary.json` }),
      FileSave.download({ textContent: buildBulkStockFetchDiagnosisCommentary(summary), mimeType: "text/markdown;charset=utf-8", filename: `${base}/判定結果の解説.md` }),
      FileSave.download({ textContent: buildBulkStockFetchSummaryFieldCommentary(summary), mimeType: "text/markdown;charset=utf-8", filename: `${base}/summary.jsonの項目解説.md` }),
      FileSave.download({ textContent: buildBulkStockFetchDiagnosisReadme({ runId, siteName: request.siteName, diagnosisCode }), mimeType: "text/markdown;charset=utf-8", filename: `${base}/README.md` })
    );
    await Promise.all(downloads);
    await chrome.storage.local.set({ stockFetchBulkDiagnosisResult: summary });
    sendResponse({ success: true, summary });
  } catch (error) {
    bgLogError("一括在庫取得方式診断に失敗:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleDiagnoseStockFetchMessage(request, sendResponse) {
  let temporaryTabId = null;
  let targetTab = null;
  let fetchError = null;
  const runId = createStockFetchDiagnosisRunId();
  const selector = String(request.selector || "").trim();
  const keyword = String(request.keyword || "").trim();
  const observedState = request.observedState || "unknown";

  try {
    if (!selector || !keyword) {
      throw new Error("診断には監視対象セレクタと監視キーワードが必要です");
    }

    if (request.monitorType === "url") {
      const targetUrl = new URL(request.targetUrl).toString();
      const temporaryTab = await chrome.tabs.create({ url: targetUrl, active: false });
      temporaryTabId = temporaryTab.id;
      await waitForPageReady(temporaryTabId);
      targetTab = await chrome.tabs.get(temporaryTabId);
    } else {
      targetTab = await chrome.tabs.get(request.tabId);
    }

    if (/^(chrome|chrome-extension|devtools):\/\//.test(targetTab?.url || "")) {
      throw new Error("Chrome内部ページは診断できません。通常のWebページを選択してください");
    }

    const [{ result: outerHtml }] = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      func: () => document.documentElement.outerHTML,
    });

    const targetUrl = targetTab.url;
    let fetchHtml = "";
    let fetchMeta = { url: targetUrl, status: null, contentType: "" };
    try {
      const response = await fetch(targetUrl, { credentials: "include" });
      fetchHtml = await response.text();
      fetchMeta = {
        url: response.url || targetUrl,
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type") || "",
      };
      if (!response.ok) {
        fetchError = new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      fetchError = error;
      fetchMeta = { ...fetchMeta, error: error.message };
    }

    const analysis = await analyzeStockFetchHtmlWithOffscreen({
      fetchHtml,
      outerHtml,
      selector,
      keyword,
    });
    const diagnosisCode = classifyStockFetchDiagnosis({
      fetchAnalysis: analysis.fetch,
      domAnalysis: analysis.dom,
      fetchError,
    });
    const diagnosis = {
      runId,
      diagnosedAt: new Date().toISOString(),
      targetUrl: request.targetUrl || targetUrl,
      finalUrl: targetUrl,
      observedState,
      selector,
      keyword,
      diagnosisCode,
      fetch: fetchMeta,
      analysis,
    };
    const downloadBase = `PageRecorder/stock-fetch-diagnosis/${runId}`;
    await Promise.all([
      FileSave.saveHtml({
        html: fetchHtml,
        filename: `${downloadBase}/fetch.html`,
      }),
      FileSave.saveHtml({
        html: outerHtml,
        filename: `${downloadBase}/outerHTML.html`,
      }),
      FileSave.download({
        textContent: JSON.stringify(diagnosis, null, 2),
        mimeType: "application/json;charset=utf-8",
        filename: `${downloadBase}/comparison.json`,
      }),
      FileSave.download({
        textContent: buildStockFetchDiagnosisReadme({ runId, diagnosisCode }),
        mimeType: "text/markdown;charset=utf-8",
        filename: `${downloadBase}/README.md`,
      }),
    ]);

    const responseDiagnosis = {
      ...diagnosis,
      needsApiInvestigation: ["DOM_ONLY_CANDIDATE", "NO_MATCH", "FETCH_ERROR"].includes(diagnosisCode),
    };
    await chrome.storage.local.set({ stockFetchDiagnosisResult: responseDiagnosis });
    sendResponse({ success: true, diagnosis: responseDiagnosis });
  } catch (error) {
    bgLogError("在庫取得方式診断に失敗:", error);
    sendResponse({ success: false, error: error.message });
  } finally {
    if (temporaryTabId != null) {
      try {
        await chrome.tabs.remove(temporaryTabId);
      } catch (closeError) {
        bgLogWarn("診断用一時タブを閉じられませんでした:", closeError.message);
      }
    }
  }
}

async function handleDownloadStockApiInvestigationMemoMessage(request, sendResponse) {
  try {
    const diagnosis = request.diagnosis || {};
    const runId = diagnosis.runId || createStockFetchDiagnosisRunId();
    const filename = `PageRecorder/stock-fetch-diagnosis/${runId}/api-investigation.md`;
    await FileSave.download({
      textContent: buildStockApiInvestigationMemo(diagnosis),
      mimeType: "text/markdown;charset=utf-8",
      filename,
    });
    sendResponse({ success: true, filename });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleQuickCaptureMessage(request, sendResponse) {
  let temporaryTabId = null;
  let previousActiveTabId = null;
  try {
    bgLogInfo("⚡ 即座取得処理開始:", {
      tabId: request.tabId,
      settingsKeys: request.settings ? Object.keys(request.settings) : [],
    });
    let targetTab;
    if (request.settings?.monitorType === "url") {
      let targetUrl;
      try {
        targetUrl = new URL(request.settings.targetUrl).toString();
      } catch (_) {
        throw new Error("有効な指定URLを入力してください");
      }
      const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      previousActiveTabId = activeTabs[0]?.id ?? null;
      const temporaryTab = await chrome.tabs.create({ url: targetUrl, active: true });
      temporaryTabId = temporaryTab.id;
      await waitForPageReady(temporaryTabId);
      targetTab = await chrome.tabs.get(temporaryTabId);
    } else {
      targetTab = await chrome.tabs.get(request.tabId);
    }
    if (/^(chrome|chrome-extension|devtools):\/\//.test(targetTab.url || "")) {
      throw new Error("Chrome内部ページは即座取得できません。通常のWebページを選択してください");
    }
    const timestamp = new Date().toISOString();
    bgLogInfo("✅ タブ情報取得完了:", {
      id: targetTab.id,
      url: targetTab.url,
      windowId: targetTab.windowId,
    });
    bgLogInfo("📸 スクリーンショット取得開始...");
    const screenshotDataUrl = await chrome.tabs.captureVisibleTab(
      targetTab.windowId,
      { format: "png" },
    );
    bgLogInfo("✅ スクリーンショット取得完了");
    bgLogInfo("📄 HTMLソース取得開始...");
    const [{ result: htmlContent }] = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      func: () => document.documentElement.outerHTML,
    });
    bgLogInfo("✅ HTMLソース取得完了");
    const screenshotFilename = await generateFilename(
      "Screenshot", "Quick", request.settings, timestamp, targetTab,
    );
    const htmlFilename = await generateFilename(
      "PageSource", "Quick", request.settings, timestamp, targetTab,
    );
    bgLogInfo("✅ ファイル名生成完了:", {
      screenshot: `${screenshotFilename}.png`,
      html: `${htmlFilename}.html`,
    });
    await FileSave.saveScreenshot({
      dataUrl: screenshotDataUrl,
      filename: `${screenshotFilename}.png`,
    });
    bgLogInfo("✅ スクリーンショット保存完了");
    await FileSave.saveHtml({
      html: htmlContent,
      filename: `${htmlFilename}.html`,
    });
    bgLogInfo("✅ HTMLソース保存完了");
    bgLogInfo("🎉 即座取得処理完了");
    sendResponse({
      status: "success",
      message: "即座取得完了",
      files: {
        screenshot: `${screenshotFilename}.png`,
        html: `${htmlFilename}.html`,
      },
    });
  } catch (error) {
    bgLogError("❌ 即座取得エラー:", error);
    sendResponse({ status: "error", error: error.message });
  } finally {
    if (temporaryTabId != null) {
      try {
        if (previousActiveTabId != null) {
          await chrome.tabs.update(previousActiveTabId, { active: true });
        }
        await chrome.tabs.remove(temporaryTabId);
      } catch (cleanupError) {
        bgLogInfo("⚠️ 即座取得用タブの後始末に失敗:", cleanupError.message);
      }
    }
  }
}

async function handleStartAllMonitoringMessage(request, sendResponse) {
  logger.debug("🔵 [DEBUG] startAllMonitoringケースに入りました");
  try {
    const requestMeta = resolveStartAllMonitoringRequestMeta(request);
    bgLogInfo("🔄 複数監視開始処理開始:", {
      requestId: requestMeta.requestId,
      receivedAt: requestMeta.receivedAt,
      configCount: requestMeta.configCount,
      configIds: requestMeta.configIds,
      configs: request.configs,
      commonSettings: requestMeta.commonSettings,
    });

    // 設定の検証
    if (
      !request.configs ||
      !Array.isArray(request.configs) ||
      request.configs.length === 0
    ) {
      throw new Error("複数監視設定が提供されていないか、空です");
    }

    bgLogInfo(
      "✅ 複数監視設定検証完了:",
      request.configs.length,
      "件の監視対象",
    );

    const currentPersistedConfig = await configManager.loadConfig();
    const savedConfigCountBefore = Array.isArray(
      currentPersistedConfig?.multiple_configs,
    )
      ? currentPersistedConfig.multiple_configs.length
      : 0;
    const persistedConfig = buildPersistedConfigForStartAllMonitoring(
      currentPersistedConfig,
      request,
      requestMeta.receivedAt,
    );
    const savedConfigCountAfter = Array.isArray(
      persistedConfig.multiple_configs,
    )
      ? persistedConfig.multiple_configs.length
      : 0;

    bgLogInfo("💾 startAllMonitoring 永続設定保持:", {
      requestId: requestMeta.requestId,
      requestedStartCount: requestMeta.configCount,
      savedConfigCountBefore,
      savedConfigCountAfter,
      savedConfigIds:
        persistedConfig.multiple_configs?.map(
          (config, index) => config?.id || `index_${index}`,
        ) || [],
    });

    const persisted = await configManager.saveConfig(persistedConfig);
    if (!persisted) {
      throw new Error("複数監視設定の保存に失敗しました");
    }

    const startResults = await runMultipleMonitoringStartConfigs(
      request,
      requestMeta,
    );

    const summary = summarizeStartAllMonitoringResults(startResults);

    bgLogInfo("🎯 複数監視開始結果:", {
      requestId: requestMeta.requestId,
      receivedAt: requestMeta.receivedAt,
      configCount: requestMeta.configCount,
      configIds: requestMeta.configIds,
      total: summary.total,
      success: summary.successCount,
      failure: summary.failureCount,
      results: startResults,
    });

    sendResponse({
      success: summary.successCount > 0,
      message: `複数監視を開始しました（成功: ${summary.successCount}件、失敗: ${summary.failureCount}件）`,
      results: startResults,
      successCount: summary.successCount,
      failureCount: summary.failureCount,
      requestId: requestMeta.requestId,
    });
  } catch (error) {
    bgLogError("❌ startAllMonitoring処理エラー:", error);
    sendResponse({
      success: false,
      error: error.message,
      message: "複数監視の開始に失敗しました",
    });
  }
}

async function handleExportMonitoringSettingsMessage(sendResponse) {
  try {
    bgLogInfo("🔄 Excel Export処理開始");
    const result = await configManager.exportToExcel("csv");
    if (!result.success) {
      bgLogError("Excel Export処理失敗:", result.error);
      sendResponse({ success: false, error: result.error });
      return;
    }
    bgLogInfo("✅ Excel Export処理成功:", {
      filename: result.filename,
      format: result.format,
    });
    const arrayBuffer = await result.blob.arrayBuffer();
    const base64Data = btoa(
      String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)),
    );
    logger.debug("🔍 ダウンロード開始前の詳細確認:", {
      filename: result.filename,
      blobSize: result.blob.size,
      arrayBufferSize: arrayBuffer.byteLength,
      base64DataLength: base64Data.length,
      base64DataPreview: base64Data.substring(0, 100) + "...",
    });
    try {
      const { downloadId } = await FileSave.download({
        url: `data:text/csv;charset=utf-8;base64,${base64Data}`,
        filename: result.filename,
        saveAs: false,
      });
      bgLogInfo("✅ Chrome Downloads API方式でダウンロード完了:", downloadId);
      chrome.downloads.onChanged.addListener(function (downloadDelta) {
        if (downloadDelta.id === downloadId) {
          logger.debug("🔍 ダウンロード状態変更:", downloadDelta);
        }
      });
      sendResponse({
        success: true,
        download_id: downloadId,
        filename: result.filename,
        download_method: "chrome_downloads_api",
        format: result.format,
        message: result.message || `Excelファイルを出力しました`,
        note: "ファイルは自動的にダウンロードフォルダに保存されました",
      });
    } catch (downloadError) {
      bgLogError("❌ Chrome Downloads API方式でダウンロードエラー:", downloadError);
      try {
        bgLogInfo("🔄 saveAs: trueでのフォールバックを試行中...");
        const { downloadId: fallbackDownloadId } = await FileSave.download({
          url: `data:text/csv;charset=utf-8;base64,${base64Data}`,
          filename: result.filename,
          saveAs: true,
        });
        bgLogInfo("✅ フォールバック方式でダウンロード完了:", fallbackDownloadId);
        sendResponse({
          success: true,
          download_id: fallbackDownloadId,
          filename: result.filename,
          download_method: "chrome_downloads_api_fallback",
          format: result.format,
          message: result.message || `Excelファイルを出力しました（保存場所選択）`,
          note: "保存場所を選択してください",
        });
      } catch (fallbackError) {
        bgLogError("❌ フォールバック方式でもダウンロードエラー:", fallbackError);
        sendResponse({
          success: false,
          error: `ダウンロードに失敗しました: ${fallbackError.message}`,
          suggestion: "Chromeのダウンロード設定を確認してください",
        });
      }
    }
  } catch (error) {
    bgLogError("Excel Export処理エラー:", error);
    sendResponse({
      success: false,
      error: `Excel出力処理でエラーが発生しました: ${error.message}`,
    });
  }
}

async function handleImportMonitoringSettingsMessage(request, sendResponse) {
  try {
    bgLogInfo("🔄 Excel Import処理開始");
    const { file_data, filename, options = {} } = request;
    if (!file_data || !filename) {
      sendResponse({
        success: false,
        error: "ファイルデータまたはファイル名が指定されていません",
      });
      return;
    }
    bgLogInfo("🔄 ファイルデータ受信:", {
      filename,
      fileDataLength: file_data.length,
      fileDataType: typeof file_data,
      isArray: Array.isArray(file_data),
      sampleData: file_data.slice(0, 10),
    });
    const uint8Array = new Uint8Array(file_data);
    bgLogInfo("✅ Uint8Array変換完了:", {
      uint8ArrayLength: uint8Array.length,
      sampleData: Array.from(uint8Array.slice(0, 10)),
    });
    const file = new File([uint8Array], filename);
    bgLogInfo("📁 ファイルオブジェクト作成完了:", {
      filename: file.name,
      size: file.size,
      type: file.type,
    });
    const result = await configManager.importFromExcel(file, options);
    if (result.success) {
      let multipleSchedule = null;
      try {
        const importedConfig = await configManager.loadConfig();
        multipleSchedule = await syncMultipleMonitoringSchedule(importedConfig);
      } catch (scheduleError) {
        bgLogError("Excel取込後の複数URL定時予約再同期に失敗:", scheduleError);
        multipleSchedule = {
          enabled: false,
          scheduleEnabled: false,
          reason: "定時予約の再同期に失敗しました",
        };
      }
      bgLogInfo("✅ Excel Import処理成功:", {
        imported_count: result.imported_count,
        warnings: result.warnings?.length || 0,
        multipleSchedule,
      });
      sendResponse({
        success: true,
        imported_count: result.imported_count,
        warnings: result.warnings || [],
        errors: result.errors || [],
        message: `${result.imported_count}件の監視設定をインポートしました`,
        multipleSchedule,
      });
      return;
    }
    bgLogError("Excel Import処理失敗:", result.errors);
    sendResponse({
      success: false,
      error: result.errors?.[0] || "インポート処理に失敗しました",
      errors: result.errors || [],
      warnings: result.warnings || [],
    });
  } catch (error) {
    bgLogError("Excel Import初期処理エラー:", error);
    sendResponse({
      success: false,
      error: `インポート初期処理に失敗しました: ${error.message}`,
    });
  }
}

// メッセージハンドラー
async function startSingleMonitoring(settings, requestTabId, { allowTestTiming = false } = {}) {
  // 既存の契約（およびテスト用のソース検査）を維持しつつ、拡張オプションは後方互換で受け取る。
  const monitoringOptions = arguments[2] || {};
  const persistConfig = monitoringOptions.persistConfig !== false;
  const monitoringScope = monitoringOptions.monitoringScope === "multiple" ? "multiple" : "single";
  const monitoringOrigin = monitoringOptions.monitoringOrigin === "scheduled" ? "scheduled" : "immediate";
  const testOnly = monitoringOptions.testOnly || null;
  const testRunId = monitoringOptions.testRunId || null;
  let targetTabId = null;
  try {
bgLogInfo("🔄 単一監視開始処理開始:", {
  tabId: requestTabId,
  settings: settings,
});

// 設定の検証
if (!settings) {
  throw new Error("監視設定が提供されていません");
}

settings.monitoringMode = normalizeMonitoringMode(settings.monitoringMode);
// テストも本番と同じ設定範囲で動かすため、常に検証する。
const monitoringModeValidationError = validateMonitoringModeSettings(settings);
if (monitoringModeValidationError) {
  throw new Error(monitoringModeValidationError);
}

// 単一画面からの開始だけ設定正本を更新する。multiple と受け入れテストは
// 既存の監視設定を上書きせず、対象タブの永続セッションだけを開始する。
if (persistConfig) await configManager.saveConfig({
  mode: "single",
  single_config: {
    url:
      settings.monitorType === "url"
        ? settings.targetUrl
        : "",
    settings: settings,
  },
  multiple_configs: [],
  last_updated: new Date().toISOString(),
});

bgLogInfo("✅ 単一監視設定保存完了");

// 監視対象タブの決定

if (settings.monitorType === "url" && settings.targetUrl) {
  // 指定URLの場合、新しいタブで開く
  bgLogInfo("🌐 指定URL監視 - 新規タブ作成:", settings.targetUrl);
  const tab = await chrome.tabs.create({
    url: settings.targetUrl,
    active: false,
  });
  targetTabId = tab.id;
  bgLogInfo(`✅ 新規タブ作成完了: ${targetTabId}`);

  // タブの読み込み完了を待機
  await new Promise((resolve) => {
    const checkComplete = (tabId, changeInfo) => {
      if (
        tabId === targetTabId &&
        changeInfo.status === "complete"
      ) {
        chrome.tabs.onUpdated.removeListener(checkComplete);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(checkComplete);

    // 5秒でタイムアウト
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(checkComplete);
      resolve();
    }, 5000);
  });
  bgLogInfo(`✅ タブ読み込み完了待機終了: ${targetTabId}`);
} else {
  // アクティブタブの場合（従来通り）
  targetTabId = requestTabId;
  bgLogInfo(`✅ アクティブタブ監視: ${targetTabId}`);
}

// 実際の監視ロジックを開始
const tabId = targetTabId;

// 系統Aは通常・テストとも、storage を正本とする二層セッションへ委譲する。
{
  const previousSession = await findSingleMonitoringSessionByTab(tabId);
  if (previousSession) await deactivateSingleMonitoringSession(previousSession.id, "restarted");
  const now = Date.now();
  const session = {
    ...createSingleMonitoringSession({ tabId, settings, now }),
    monitoringScope,
    monitoringOrigin,
    ...(testOnly ? { testOnly, testRunId } : {}),
  };
  const executionHistory = await startMonitoringExecutionHistory({
    scope: monitoringScope,
    targetId: settings.aiSupportContext?.configId || (monitoringScope === "single" ? "single" : session.id),
    targetName: settings.aiSupportContext?.configName || settings.targetUrl || "監視対象",
    targetUrl: settings.targetUrl || "",
    sessionId: session.id,
    settings,
    startedAt: now,
  });
  session.executionHistoryKey = executionHistory.historyKey;
  if (settings.downloadAiSupportFile) {
    session.aiSupportReport = createAiSupportReport(session);
  }
  const sessions = await getSingleMonitoringSessions();
  sessions[session.id] = session;
  await saveSingleMonitoringSessions(sessions);

  if (session.monitoringMode === "long_running") {
    await chrome.alarms.create(
      session.alarmName,
      createLongRunningSingleMonitoringAlarmOptions(settings),
    );
    // 開始直後にも基準状態を作成し、その後は alarms のみを時計にする。
    await runLongRunningSingleMonitoringSession(session.id, "initial");
  } else {
    try {
      await chrome.tabs.sendMessage(tabId, { action: "startHighFrequencySession", session });
    } catch (error) {
      // 読込直後は content script が ready 通知から同じ保存済み session を取得する。
      bgLogDebug("高頻度セッションの即時通知を保留しました", { tabId, error: error.message });
    }
  }
  return { success: true, message: "監視を開始しました", tabId, sessionId: session.id, monitoringMode: session.monitoringMode, interval: settings.interval, duration: settings.duration };
}

  } catch (error) {
bgLogError("❌ startMonitoring処理エラー:", error);
return {
  success: false,
  error: error.message,
  tabId: targetTabId,
};
  }
}

async function stopSingleMonitoring(tabId) {
  try {
    bgLogInfo("🛑 監視停止処理開始:", { tabId });
    const persistedSession = await findSingleMonitoringSessionByTab(tabId);
    if (persistedSession) {
      await deactivateSingleMonitoringSession(persistedSession.id, "manual_stop");
      return { success: true, message: "監視を停止しました", tabId };
    }
    bgLogInfo("ℹ️ 停止対象の監視セッションはありません", { tabId });
    return { success: true, message: "監視を停止しました", tabId };
  } catch (error) {
    bgLogError("❌ stopMonitoring処理エラー:", error);
    return { success: false, error: error.message };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // offscreen宛てのメッセージは同じruntimeイベントへ届く。
  // backgroundが先に応答すると、offscreen解析の応答を奪ってしまうため無視する。
  if (isOffscreenTargetMessage(request)) {
    return false;
  }

  const senderTabId = sender?.tab?.id;
  if (
    request.action === "contentScriptReady" &&
    typeof senderTabId === "number" &&
    periodicReloadContexts.has(senderTabId)
  ) {
    const monitoringSystem = periodicReloadContexts.get(senderTabId).monitoringSystem;
    bgLogProgress("📨 [周期リロード] contentScriptReady を受信", {
      event: "periodic-reload-content-script-ready",
      scope: { tabId: senderTabId, monitoringSystem },
      details: { tabId: senderTabId, url: request.url, monitoringSystem },
    });
  }
  bgLogDebug("📨 Background: メッセージを受信", {
    action: request.action,
    senderId: sender?.id || null,
    tabId: sender?.tab?.id || null,
  });
  logger.debug("📨 メッセージ受信:", request);
  logger.debug("🔵 [DEBUG] メッセージ受信詳細:", {
    action: request.action,
    sender: sender,
    request: request,
  });

  // 非同期処理を実行する関数
  const handleAsyncRequest = async () => {
    try {
      logger.debug("🔵 [DEBUG] switch文実行開始, action:", request.action);
      switch (request.action) {
        case "contentScriptReady":
          {
            const session = typeof senderTabId === "number"
              ? await findSingleMonitoringSessionByTab(senderTabId)
              : null;
            sendResponse({
              success: true,
              highFrequencySession:
                session?.monitoringMode === "high_frequency" && !session.evidenceCaptureInProgress
                  ? session
                  : null,
            });
          }
          break;

        case "reportHighFrequencySessionResult":
          {
            const executionKey = buildHighFrequencySessionExecutionKey(
              request.sessionId,
              request.generation,
            );
            if (highFrequencySessionResultLocks.has(executionKey)) {
              sendResponse({ success: true, continueMonitoring: false, ignored: true });
              break;
            }
            highFrequencySessionResultLocks.add(executionKey);
            try {
              const sessions = await getSingleMonitoringSessions();
              const session = sessions[request.sessionId];
              if (!session || !session.active || session.monitoringMode !== "high_frequency" ||
                  session.tabId !== senderTabId || session.generation !== request.generation) {
                if (session?.testOnly === "two_tier_acceptance") {
                  const acceptance = await getTwoTierAcceptanceStatus();
                  if (acceptance.active && acceptance.runId === session.testRunId) {
                    await setTwoTierAcceptanceStatus({
                      ...acceptance,
                      verification: {
                        ...buildTwoTierAcceptanceVerification(acceptance.verification),
                        staleReportIgnored: true,
                      },
                    });
                  }
                }
                sendResponse({ success: true, continueMonitoring: false, ignored: true });
                break;
              }
              const outcome = await evaluateSingleMonitoringSession(session, request.result);
              sendResponse({ success: true, ...outcome });
            } finally {
              highFrequencySessionResultLocks.delete(executionKey);
            }
          }
          break;

        case "expireHighFrequencySession":
          {
            const sessions = await getSingleMonitoringSessions();
            const session = sessions[request.sessionId];
            if (!session || !session.active || session.monitoringMode !== "high_frequency" ||
                session.tabId !== senderTabId || session.generation !== request.generation) {
              sendResponse({ success: true, ignored: true });
              break;
            }
            await deactivateSingleMonitoringSession(session.id, "expired");
            sendResponse({ success: true, expired: true });
          }
          break;

        case "startSingleIntegrationAutoTest":
          sendResponse({
            success: true,
            test: await startSingleIntegrationAutoTest(request.scenarioId),
          });
          break;

        case "completeKeywordMissingAutoTest":
          sendResponse({ success: true, test: await completeKeywordMissingAutoTest() });
          break;

        case "getInitialDetectedAutoTestStatus":
          sendResponse({
            success: true,
            test: await getStoredInitialDetectedAutoTestStatus(),
          });
          break;

        case "startTwoTierAcceptanceTest":
          sendResponse({ success: true, test: await startTwoTierAcceptanceTest(request.scenarioId) });
          break;

        case "getTwoTierAcceptanceTestStatus":
          sendResponse({ success: true, test: await getTwoTierAcceptanceStatus() });
          break;

        case "startTestTabScenario":
          try {
            const test = await startTestTabScenario({
              scenarioId: request.scenarioId,
              site: request.site,
              reproductionMode: request.reproductionMode,
            });
            sendResponse({ success: true, test });
          } catch (error) {
            bgLogError("❌ [テストタブ] シナリオを開始できませんでした", { scenarioId: request.scenarioId, error: error.message });
            sendResponse({ success: false, error: error.message, test: await getTestTabScenarioStatus() });
          }
          break;

        case "getTestTabScenarioStatus":
          sendResponse({ success: true, test: await getTestTabScenarioStatus() });
          break;

        case "previewTestTabScenario":
          {
            // popup がシナリオ定義を重複して持たないよう、開始せずに実行内容だけを返す。
            const run = buildTestTabScenarioRun({
              scenarioId: request.scenarioId,
              site: request.site,
              reproductionMode: request.reproductionMode,
            });
            const manualConfig = run.ok ? run.configs.find((config) => config.manualAction) : null;
            sendResponse({
              success: true,
              run,
              manualCode: manualConfig
                ? buildTestTabManualReproductionCode({ selector: manualConfig.selector, keyword: manualConfig.keyword, action: manualConfig.manualAction })
                : "",
            });
          }
          break;

        case "stopTestTabScenario":
          sendResponse({ success: true, test: await stopTestTabScenario() });
          break;

        case "reportTestTabManualWindow":
          {
            const sessions = await getSingleMonitoringSessions();
            const session = sessions[request.sessionId];
            if (!session || !session.active || session.testOnly !== "test_tab_scenario" ||
                session.tabId !== senderTabId || session.generation !== request.generation) {
              sendResponse({ success: true, ignored: true });
              break;
            }
            const message = buildTestTabManualWindowLogMessage(
              resolveTestTabSessionName(session),
              request.phase,
              request.remainingSeconds,
            );
            if (message && request.phase === "progress") {
              bgLogProgress(message, {
                event: "test-tab-manual-window",
                scope: { sessionId: session.id, remainingSeconds: request.remainingSeconds },
                details: { tabId: session.tabId },
              });
            } else if (message) {
              bgLogWarn(message, { sessionId: session.id, tabId: session.tabId });
            }
            if (request.phase === "end") {
              // 受付時間は基準取得後の最初の読み込みだけにするため、終了を永続化する。
              sessions[session.id] = { ...session, manualWindowCompleted: true };
              await saveSingleMonitoringSessions(sessions);
            }
            await recordTestTabManualWindow(session, request.phase, request.remainingSeconds);
            sendResponse({ success: true });
          }
          break;

        case "sendGmailTestEmail":
          sendResponse(await sendGmailTestEmail());
          break;

        case "getScheduledWatchSitesStatus":
          {
            const [siteStatusResult, resyncResult] = await Promise.all([
              getScheduledWatchSitesStatus(),
              getStoredScheduledWatchResyncResult(),
            ]);
            sendResponse({ success: true, ...siteStatusResult, resyncResult });
          }
          break;

        case "getMonitoringExecutionHistory":
          sendResponse({ success: true, histories: await getMonitoringExecutionHistory() });
          break;

        case "resyncScheduledWatchSites":
          sendResponse(await resyncScheduledWatchSites());
          break;

        case "startSingleScheduledWatchNow":
          sendResponse(await startSingleScheduledWatchNow());
          break;

        case "stopSingleScheduledWatchNow":
          sendResponse(await stopSingleScheduledWatchNow());
          break;

        case "startPopupListWatchNow":
          sendResponse(await startPopupListWatchNow(request.targetIds, request.durationMinutes));
          break;

        case "stopPopupListWatchNow":
          sendResponse(await stopPopupListWatchNow(request.targetIds));
          break;

        case "startScheduledWatchTest":
          try {
            sendResponse({ success: true, ...(await startScheduledWatchTest(request.mode, request.siteId || null)) });
          } catch (error) {
            const failureReason = `開始不可: ${error.message || "定時テストの開始に失敗しました"}`;
            const test = {
              mode: request.mode || "",
              id: request.siteId || (request.mode === "single" ? "single" : ""),
              name: request.mode === "single" ? "指定URL" : "選択サイト",
              active: false,
              status: "failed",
              tickedAt: new Date().toISOString(),
              failureReason,
              decisionReason: getScheduledWatchTestDecisionReason({ status: "failed", failureReason }),
              verificationItems: buildScheduledWatchTestVerificationItems({ snapshotAvailable: false }),
            };
            await chrome.storage.local.set({
              [SCHEDULED_WATCH_TEST_STATUS_KEY]: test,
            });
            sendResponse({ success: false, error: error.message || "定時テストの開始に失敗しました", test });
          }
          break;

        case "startScheduledWatchDiffTest":
          try {
            sendResponse({ success: true, ...(await startScheduledWatchDiffTest(request.siteId || null, {
              checkGmail: request.checkGmail === true,
            })) });
          } catch (error) {
            const failureReason = `開始不可: ${error.message || "差分検知テストの開始に失敗しました"}`;
            const test = {
              mode: "multi-diff", id: request.siteId || "", name: "選択サイト", active: false,
              status: "failed", tickedAt: new Date().toISOString(), failureReason,
              decisionReason: failureReason,
              verificationItems: buildScheduledWatchDiffTestVerificationItems({ checkGmail: request.checkGmail === true }),
            };
            await chrome.storage.local.set({ [SCHEDULED_WATCH_TEST_STATUS_KEY]: test });
            sendResponse({ success: false, error: error.message || "差分検知テストの開始に失敗しました", test });
          }
          break;

        case "startScheduledWatchArtifactDiffTest":
          try {
            sendResponse({ success: true, ...(await startScheduledWatchArtifactDiffTest(request.siteId || null, {
              executionMode: request.executionMode,
            })) });
          } catch (error) {
            const failureReason = `開始不可: ${error.message || "保存付き差分テストの開始に失敗しました"}`;
            const test = { mode: "multi-artifact-diff", id: request.siteId || "", name: "選択サイト", active: false, status: "failed", tickedAt: new Date().toISOString(), failureReason, decisionReason: failureReason, verificationItems: buildScheduledWatchArtifactDiffTestVerificationItems() };
            await chrome.storage.local.set({ [SCHEDULED_WATCH_TEST_STATUS_KEY]: test });
            sendResponse({ success: false, error: error.message || "保存付き差分テストの開始に失敗しました", test });
          }
          break;

        case "getScheduledWatchTestStatus":
          sendResponse({ success: true, test: await getScheduledWatchTestStatus() });
          break;

        case "serviceWorkerTest":
          sendResponse({ success: true, message: "Service Worker動作中" });
          break;

        case "getBufferedSwLogs":
          sendResponse({ success: true, logs: SwLogBuffer.getAll() });
          break;

        case "getConfigManager":
          sendResponse({ success: true, configManager: "available" });
          break;

        case "loadConfig":
          await handleLoadConfigMessage(sendResponse);
          break;

        case "saveConfig":
          await handleSaveConfigMessage(request, sendResponse);
          break;

        case "changeMode":
          await handleChangeModeMessage(request, sendResponse);
          break;

        case "startMonitoring":
          sendResponse(await startSingleMonitoring(request.settings, request.tabId));
          break;

        case "quickCapture":
          await handleQuickCaptureMessage(request, sendResponse);
          break;

        case "diagnoseStockFetch":
          await handleDiagnoseStockFetchMessage(request, sendResponse);
          break;

        case "bulkDiagnoseStockFetch":
          await handleBulkDiagnoseStockFetchMessage(request, sendResponse);
          break;

        case "updateScheduledWatchCaptureMode":
          sendResponse({
            success: true,
            ...(await updateScheduledWatchCaptureMode(request.siteId, request.captureMode)),
          });
          break;

        case "downloadStockApiInvestigationMemo":
          await handleDownloadStockApiInvestigationMemoMessage(request, sendResponse);
          break;

        case "startAllMonitoring":
          await handleStartAllMonitoringMessage(request, sendResponse);
          break;

        case "stopMonitoring":
          sendResponse(await stopSingleMonitoring(request.tabId));
          break;

        case "stopMultipleImmediateMonitoring":
          sendResponse(await stopMultipleMonitoringByOrigin("immediate"));
          break;

        case "addMonitoringTarget":
          try {
            bgLogInfo("🔄 addMonitoringTarget要求受信:", request.target);
            const mcm = await ensureMonitoringConfigManager();
            const targetId = await mcm.addMonitoringTarget(request.target);
            sendResponse({
              success: !!targetId,
              targetId,
              message: targetId
                ? "監視対象を追加しました"
                : "監視対象の追加に失敗しました",
            });
          } catch (error) {
            bgLogError("❌ addMonitoringTargetエラー:", error);
            sendResponse({ success: false, error: error.message });
          }
          return true; // 非同期応答

        case "getMonitoringData":
          // 監視データの個別取得処理
          try {
            bgLogInfo("🔄 監視データ個別取得処理開始");
            const mcm = await ensureMonitoringConfigManager();
            const config = await mcm.loadConfig();

            sendResponse({
              success: true,
              multiple_configs: config?.multiple_configs || [],
              message: "監視データの取得が完了しました",
            });
          } catch (error) {
            bgLogError("❌ 監視データ個別取得処理エラー:", error);
            sendResponse({
              success: false,
              error: `監視データの取得でエラーが発生しました: ${error.message}`,
            });
          }
          return true; // 非同期応答

        case "unifyDataStructure":
          // データ構造の統一化処理
          try {
            bgLogInfo("🔄 データ構造統一化処理開始");

            const mcm = await ensureMonitoringConfigManager();

            // unifyDataStructureメソッドの存在確認
            if (typeof mcm.unifyDataStructure === "function") {
              const result = await mcm.unifyDataStructure();
              if (result) {
                bgLogInfo("✅ データ構造統一化完了");
                sendResponse({
                  success: true,
                  message: "データ構造の統一化が完了しました",
                });
              } else {
                bgLogInfo("ℹ️ データ構造の統一化は不要でした");
                sendResponse({
                  success: true,
                  message: "データ構造は既に統一されています",
                });
              }
            } else {
              bgLogWarn(
                "⚠️ unifyDataStructureメソッドが存在しません - 既に統一されたデータとして処理します",
              );
              sendResponse({
                success: true,
                message: "データ構造は既に統一されています",
              });
            }
          } catch (error) {
            bgLogError("❌ データ構造統一化処理エラー:", error);
            sendResponse({
              success: false,
              error: `データ構造の統一化でエラーが発生しました: ${error.message}`,
            });
          }
          return true; // 非同期応答

        case "updateMonitoringTarget":
          // 監視対象の更新処理
          try {
            bgLogInfo("🔄 監視対象更新処理開始:", {
              targetId: request.targetId,
              updates: request.updates,
            });

            // monitoringConfigManagerインスタンスが存在するか確認
            if (!monitoringConfigManager) {
              bgLogError("❌ monitoringConfigManagerが初期化されていません");
              sendResponse({
                success: false,
                error: "設定管理システムが初期化されていません",
              });
              return true;
            }

            const result = await monitoringConfigManager.updateMonitoringTarget(
              request.targetId,
              request.updates,
            );

            if (result) {
              bgLogInfo("✅ 監視対象更新完了:", {
                targetId: request.targetId,
                success: result,
              });
              sendResponse({
                success: true,
                message: "監視対象が正常に更新されました",
                updatedTargetId: request.targetId,
              });
            } else {
              bgLogError("❌ 監視対象更新失敗:", {
                targetId: request.targetId,
                result: result,
              });
              sendResponse({
                success: false,
                error: "更新処理に失敗しました",
              });
            }
          } catch (error) {
            bgLogError("❌ 監視対象更新処理エラー:", error);
            sendResponse({
              success: false,
              error: `更新処理でエラーが発生しました: ${error.message}`,
            });
          }
          return true; // 非同期応答

        case "removeMonitoringTarget":
          // 統一された設定システムを使用した削除処理
          try {
            bgLogInfo("🔄 監視対象削除処理開始:", request.targetId);
            logger.debug("🔍 削除前のcurrentConfig状態:", {
              mode: currentConfig.mode,
              multipleConfigsCount: currentConfig.multiple_configs?.length || 0,
              multipleConfigsIds:
                currentConfig.multiple_configs?.map((m) => m.id) || [],
            });

            // 既存のremoveMonitoringTarget関数を使用（統一された設定システム）
            const result = await configManager.removeMonitoringTarget(
              request.targetId,
            );

            bgLogInfo("📊 削除処理結果:", result);
            logger.debug("🔍 削除後のcurrentConfig状態:", {
              mode: currentConfig.mode,
              multipleConfigsCount: currentConfig.multiple_configs?.length || 0,
              multipleConfigsIds:
                currentConfig.multiple_configs?.map((m) => m.id) || [],
            });

            // 結果の形式を確認して適切に処理
            logger.debug("🔍 削除結果の詳細分析:", {
              resultType: typeof result,
              resultIsBoolean: typeof result === "boolean",
              resultIsObject: typeof result === "object",
              resultKeys:
                result && typeof result === "object" ? Object.keys(result) : [],
              resultSuccess: result?.success,
              resultSuccessType: typeof result?.success,
            });

            if (result && (result.success === true || result === true)) {
              bgLogInfo("✅ 監視対象削除完了:", {
                deletedId: request.targetId,
                deletedName: result.removedTarget?.name || "不明",
                remainingCount: currentConfig.multiple_configs?.length || 0,
              });
              sendResponse({
                success: true,
                message: result.message || "監視対象が正常に削除されました",
                deletedTarget: result.removedTarget || { id: request.targetId },
                remainingCount: currentConfig.multiple_configs?.length || 0,
              });
            } else {
              bgLogError("❌ 監視対象削除失敗:", result);
              sendResponse({
                success: false,
                error: result?.error || "削除処理に失敗しました",
              });
            }
          } catch (error) {
            bgLogError("❌ 監視対象削除処理の重大エラー:", error);
            bgLogError("❌ エラー詳細:", {
              name: error.name,
              message: error.message,
              stack: error.stack,
            });
            sendResponse({
              success: false,
              error: `削除処理で予期しないエラーが発生しました: ${error.message}`,
            });
          }
          return true; // 非同期応答

        case "getStatus":
          await handleGetStatusMessage(sendResponse);
          break;

        case "getLogLevel":
          handleGetLogLevelMessage(sendResponse);
          break;

        case "setLogLevel":
          handleSetLogLevelMessage(request, sendResponse);
          break;

        case "exportMonitoringSettings":
          await handleExportMonitoringSettingsMessage(sendResponse);
          break;

        case "importMonitoringSettings":
          await handleImportMonitoringSettingsMessage(request, sendResponse);
          break;

        case "debugStorageContents":
          // Chrome Storage内容の完全調査
          debugStorageContents().then((result) => {
            sendResponse({
              success: true,
              debugInfo: result,
            });
          });
          return true; // 非同期応答

        case "restartServiceWorker":
          // Service Worker完全再起動処理（強化版）
          try {
            bgLogInfo("🔄 Service Worker完全再起動開始（強化版）");

            // 1. ストレージ状況を確認
            const storageData = await chrome.storage.local.get(null);
            logger.debug("🔍 Service Worker側ストレージ確認:", {
              keys: Object.keys(storageData),
              hasMonitoringConfig: !!storageData.monitoringConfig,
              hasMonitoring_config: !!storageData.monitoring_config,
              totalKeys: Object.keys(storageData).length,
            });

            // 2. 全グローバル変数をクリア
            bgLogInfo("🧹 グローバル変数クリア開始");
            currentConfig = null;

            // 3. MonitoringConfigManager完全リセット
            bgLogInfo("🔄 MonitoringConfigManager完全リセット開始");
            monitoringConfigManager = null;
            monitoringConfigManagerInitPromise = null;

            await ensureMonitoringConfigManager();
            bgLogInfo("✅ MonitoringConfigManager再初期化完了");

            // 4. ConfigManager完全リセット
            bgLogInfo("🔄 ConfigManager完全リセット開始");
            try {
              await configManager.initialize();
              bgLogInfo("✅ ConfigManager再初期化完了");
            } catch (configError) {
              bgLogWarn("⚠️ ConfigManager再初期化失敗:", configError);
            }

            // 5. 初期化後のストレージ状況を確認
            const afterStorageData = await chrome.storage.local.get(null);
            logger.debug("🔍 再初期化後のストレージ確認:", {
              keys: Object.keys(afterStorageData),
              totalKeys: Object.keys(afterStorageData).length,
              data: afterStorageData,
            });

            bgLogInfo("✅ Service Worker完全再起動完了");
            sendResponse({
              success: true,
              status: "success",
              message: "Service Worker正常に再起動しました",
              storageStatus: {
                beforeKeys: Object.keys(storageData).length,
                afterKeys: Object.keys(afterStorageData).length,
                currentConfigMode: currentConfig.mode,
              },
            });
          } catch (error) {
            bgLogError("❌ Service Worker再起動エラー:", error);
            sendResponse({
              success: false,
              status: "error",
              error: error.message,
            });
          }
          return true; // 非同期応答

        default:
          sendResponse({ success: false, error: "不明なアクション" });
      }
    } catch (error) {
      bgLogError("メッセージ処理エラー:", error);
      sendResponse({ success: false, error: error.message });
    }
  };

  // 非同期処理を実行
  handleAsyncRequest();

  // 非同期応答を示す
  return true;
});

// インストール時の処理
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await restoreLogLevelFromStorage();
    logger.info("Service Workerインストール開始");
    await configManager.initialize();

    // 監視設定I/Oの単一化: MonitoringConfigManager を1箇所で初期化（移行含む）
    await ensureMonitoringConfigManager();

    // 必要時のみ、単一キー前提のデバッグ情報を取得
    await debugStorageContents();
    await syncScheduledStockCheck();
    await cleanupStaleSnapshots();

    logger.debug("Service Workerインストール完了");
  } catch (error) {
    bgLogError("❌ Service Worker初期化失敗:", error);
    bgLogWarn("⚠️ 最小限機能で動作を継続します");
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await restoreLogLevelFromStorage();
  await syncScheduledStockCheck();
  await cleanupStaleSnapshots();
  await restoreLongRunningSingleMonitoringSessions();
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const session = await findSingleMonitoringSessionByTab(tabId);
  if (session) await deactivateSingleMonitoringSession(session.id, "tab_removed");
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (isSingleMonitoringSessionAlarmName(alarm.name)) {
    const sessions = await getSingleMonitoringSessions();
    const session = Object.values(sessions).find((item) => item.alarmName === alarm.name);
    if (session) await runLongRunningSingleMonitoringSession(session.id, "alarm");
    return;
  }
  if (alarm.name === SCHEDULED_WATCH_TEST_ALARM) {
    await runScheduledWatchTestTick();
    return;
  }
  // 既存: 単一サイト監視（popup設定）
  if (alarm.name === DAILY_STOCK_CHECK_ALARM) {
    await startScheduledStockWatch();
    return;
  }
  if (alarm.name === DAILY_MULTIPLE_MONITORING_ALARM) {
    await startScheduledMultipleMonitoring();
    return;
  }
  if (alarm.name === DAILY_SINGLE_KEYWORD_MONITORING_ALARM) {
    await startScheduledSingleKeywordMonitoring();
    return;
  }
  if (alarm.name === STOCK_WATCH_TICK_ALARM) {
    await runStockWatchTick();
    return;
  }

  // ベースライン定時取得
  const baselineSiteId = extractSiteIdFromAlarm(
    alarm.name,
    BASELINE_FETCH_ALARM,
  );
  if (baselineSiteId) {
    await fetchBaselineForSite(baselineSiteId);
    return;
  }

  // 新規: 複数サイト監視（JSON設定ファイルベース）
  const dailyInfo = extractSiteInfoFromAlarm(
    alarm.name,
    DAILY_STOCK_CHECK_ALARM,
  );
  if (dailyInfo) {
    await startScheduledStockWatchForSite(
      dailyInfo.siteId,
      dailyInfo.scheduleIndex,
    );
    return;
  }

  const tickSiteId = extractSiteIdFromAlarm(alarm.name, STOCK_WATCH_TICK_ALARM);
  if (tickSiteId) {
    await runStockWatchTickForSite(tickSiteId);
    return;
  }
});

// Service Worker コンソールからの手動確認用
self.runScheduledStockCheck = runScheduledStockCheck;
self.startScheduledStockWatch = startScheduledStockWatch;
self.formatJstStockTimestamp = formatJstStockTimestamp;
self.buildAeonStockDownloadPath = buildAeonStockDownloadPath;
self.extractKeywordFromUrl = extractKeywordFromUrl;

// 初期化
(async () => {
  try {
    await restoreLogLevelFromStorage();
    await configManager.initialize();
    await ensureMonitoringConfigManager();

    await syncScheduledStockCheck();
    await restoreLongRunningSingleMonitoringSessions();
    logger.info("Service Worker初期化完了");
  } catch (error) {
    bgLogError("❌ Service Worker初期化失敗:", error);
    bgLogWarn("⚠️ 最小限機能で動作を継続します");
  }
})();
