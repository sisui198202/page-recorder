const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadScriptFunctions } = require('../helpers/load-source-functions');

describe('B/C 定時監視 UI・background 契約', () => {
    const root = path.resolve(__dirname, '../..');
    const htmlEscapeDocument = {
        createElement: () => {
            let text = '';
            return {
                set textContent(value) { text = String(value); },
                get innerHTML() { return text; }
            };
        }
    };

    test('popup は A/B/C を独立セクションに分け、B の URL 必須と C の読み取り専用操作を示す', () => {
        const html = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');
        expect(html).toContain('A: キーワード監視（単一URL）');
        expect(html).toContain('B: 検索結果・一覧ページ監視');
        expect(html).toContain('B: 対象ごとの毎日開始予約');
        expect(html).toContain('検索結果・一覧ページURLが必須です');
        expect(html).toContain('id="singleScheduledWatchSection"');
        expect(html).toContain('class="section scheduled-watch-section" id="singleScheduledWatchSection"');
        expect(html).toContain('data-single-url-subtab="keyword"');
        expect(html).toContain('data-single-url-subtab="scheduled"');
        expect(html).toContain('id="singleKeywordPanel"');
        expect(html).toContain('id="singleScheduledPanel"');
        expect(html).toContain('id="singleScheduledWatchStatus"');
        expect(html).toContain('id="keywordMonitoringFetchConditions" aria-disabled="false">\n                <h4>取得条件</h4>');
        expect(html).toContain('id="interval"');
        expect(html).toContain('<label for="duration">時間経過時の監視継続時間（今すぐ・予約共通）</label>');
        expect(html).toContain('今すぐ監視と毎日開始予約のどちらも、時間経過で終了する場合にこの時間を使います。');
        expect(html).toContain('id="singleScheduledWatchUrl"');
        expect(html).toContain('id="singleScheduledWatchSelector"');
        expect(html).toContain('id="singleScheduledWatchDiscordChannelId"');
        expect(html).toContain('<label for="singleScheduledWatchDiscordChannelId">DiscordチャンネルID</label>');
        expect(html).toContain('id="singleScheduledWatchInterval"');
        expect(html).toContain('id="singleScheduledWatchImmediateDuration"');
        expect(html).toContain('id="startSingleScheduledWatchNowButton"');
        expect(html).toContain('id="stopSingleScheduledWatchNowButton"');
        expect(html).toContain('id="multiInterval"');
        expect(html).not.toContain('reload-interval-input');
        expect(html).toContain('C: 複数サイト定期運用');
        expect(html).toContain('id="resyncScheduledWatchSitesButton"');
        expect(html).toContain('id="refreshScheduledWatchSitesButton"');
        expect(html).toContain('id="multipleListWatchSection"');
        expect(html).toContain('B: 検索結果・一覧ページ定時監視');
        expect(html).toContain('id="multipleListWatchSite"');
        expect(html).toContain('id="multipleListWatchProfile"');
        expect(html).toContain('id="multipleListWatchUrl"');
        expect(html).toContain('id="saveMultipleListWatchButton"');
        expect(html).toContain('id="multipleListWatchScheduleStatus" class="single-scheduled-watch-summary" role="status"');
        expect(html).toContain('今すぐ監視と毎日開始予約は独立しています。');
        expect(html).toContain('id="multipleListWatchImmediateDuration" type="number" min="1" max="480" value="3"');
        expect(html).toContain('時間経過時の監視継続時間（今すぐ・予約共通）');
        expect(html).toContain('id="startAllButton" class="btn-primary">今すぐ一括開始</button>');
        expect(html).toContain('id="stopAllButton" class="btn-danger" disabled>今すぐ一括停止</button>');
        expect(html).toContain('data-collapsible-id="multipleAdvancedManagement"');
        const cSectionStart = html.indexOf('id="scheduledWatchSitesSection"');
        const cSection = html.slice(cSectionStart);
        expect(cSection).toContain('<div class="button-group">');
        expect(cSection.indexOf('resyncScheduledWatchSitesButton')).toBeLessThan(cSection.indexOf('refreshScheduledWatchSitesButton'));
    });

    test('popup はFetchの実測間隔を確認できる共通実行履歴を表示する', () => {
        const html = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        expect(html).toContain('id="monitoringExecutionHistorySection" data-collapsible-section data-collapsible-id="monitoringExecutionHistory"');
        expect(html).toContain('data-collapsible-trigger aria-expanded="false" aria-controls="monitoringExecutionHistoryBody"');
        expect(html).toContain('id="monitoringExecutionHistoryBody" class="section-toggle-content" data-collapsible-content hidden');
        expect(html).toContain('id="monitoringExecutionHistoryList"');
        expect(html).toContain('class="monitoring-execution-history-header"');
        expect(html).toContain('.monitoring-execution-history-header .btn-secondary');
        expect(html).toContain('Fetchの20秒間隔は「実測間隔」で確認できます。');
        expect(source).toContain("action: 'getMonitoringExecutionHistory'");
        expect(source).toContain('formatMonitoringExecutionInterval(check.intervalMs)');
        expect(source).toContain('}, 1000);');
    });

    test('実行履歴の再描画後もチェック履歴の手動開閉状態を維持する', () => {
        const container = {
            querySelectorAll: jest.fn(() => [
                { dataset: { monitoringHistoryKey: 'immediate:open' }, open: true },
                { dataset: { monitoringHistoryKey: 'immediate:closed' }, open: false }
            ]),
            innerHTML: '',
            textContent: ''
        };
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'escapeHtml',
            'formatMonitoringExecutionTimestamp',
            'formatMonitoringExecutionInterval',
            'getMonitoringExecutionStatusLabel',
            'getMonitoringExecutionHistoryDetailsState',
            'renderMonitoringExecutionHistory'
        ], {
            document: htmlEscapeDocument,
            elements: { monitoringExecutionHistoryList: container }
        });

        functions.renderMonitoringExecutionHistory({
            'immediate:open': { status: 'success', startedAt: '2026-10-09T01:00:00.000Z', checks: [] },
            'immediate:closed': { status: 'running', startedAt: '2026-10-09T01:01:00.000Z', checks: [] }
        });

        expect(container.innerHTML).toContain('data-monitoring-history-key="immediate:open" open');
        expect(container.innerHTML).toContain('data-monitoring-history-key="immediate:closed"><summary>');
    });

    test('popup はB/C専用タブに用途別の安全テストカードと結果表示を持つ', () => {
        const html = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        expect(html).toContain('data-test-scenario-mode="scheduled"');
        expect(html).toContain('B/C: 定時監視');
        expect(html).toContain('id="testScenarioPanel"');
        expect(html).toContain('id="scheduledWatchTestPanel" hidden');
        expect(html).toContain('id="startSingleScheduledWatchTestButton"');
        expect(html).toContain('id="scheduledWatchTestSiteSelect"');
        expect(html).toContain('id="startMultiScheduledWatchTestButton"');
        expect(html).toContain('id="startMultiScheduledWatchDiffTestButton"');
        expect(html).toContain('name="scheduledWatchArtifactDiffTestMode" value="fast" checked');
        expect(html).toContain('name="scheduledWatchArtifactDiffTestMode" value="alarm"');
        expect(html).toContain('短縮検証');
        expect(html).toContain('実運用再現');
        expect(html).toContain('id="scheduledWatchDiffTestCheckGmail"');
        expect(html).toContain('class="scheduled-watch-test-grid"');
        expect(html).toContain('class="scheduled-watch-test-card"');
        expect(html).toContain('B: 商品取得テスト');
        expect(html).toContain('C: 商品取得テスト');
        expect(html).toContain('C: 差分検知テスト');
        expect(html).toContain('>指定URLの商品取得テスト</button>');
        expect(html).toContain('>選択サイトの商品取得テスト</button>');
        expect(html).toContain('>差分検知テスト</button>');
        expect(html).toContain('実行・成功に必要:</strong> 指定URLと商品取得セレクタ（単一URL監視の「監視対象セレクタ」）');
        expect(html).toContain('監視キーワード、検知モード、開始時の即座検知、リロード後待機時間は、この安全テストでは使用しません。');
        expect(html).toContain('件数セレクタは補助情報です。開始・成功の必須条件ではありません。');
        expect(html).toContain('変化検知なし・Gmail送信なし・ダウンロード保存なし');
        expect(html.match(/変化検知なし・Gmail送信なし・ダウンロード保存なし/g)).toHaveLength(2);
        expect(html).toContain('Gmail検知送信も確認（ON時だけ検知メールを送信）');
        expect(html).toContain('初回取得から一時baselineを作り、1件を除外して再取得します。除外したURLを新規URLとして検知し、差分経路を確認します。');
        expect(html).toContain('本番baseline・通常監視・ダウンロード保存・Chrome通知・外部拡張通知は行いません。');
        expect(html).toContain('<summary>判定基準</summary>');
        expect(html).toContain('対象ページの準備完了後、設定済みの商品取得セレクタで1件以上の snapshot を取得できた状態です。');
        expect(html).toContain('通常定時監視、継続的なサイト互換性、差分検知、通知の動作は保証しません。');
        expect(html).toContain('セレクタ未設定・セレクタ結果0件・snapshot 0件のため、商品取得の成功は保証しません。');
        expect(html).toContain('URL・実行状態・タブ作成・読込・DOM準備・snapshot取得のいずれかで、テストを完了できませんでした。');
        expect(source).toContain('変化検知・Gmail送信・ダウンロード・baseline保存・通常監視は行いません。');
        expect(source).toContain("executionMode = selectedMode === 'alarm' ? 'alarm' : 'fast'");
        expect(source).toContain("action: 'startScheduledWatchArtifactDiffTest', siteId, executionMode");
    });

    test('保存付き差分テストは選択した実行方式を開始メッセージへ渡し、未選択時は短縮検証にする', async () => {
        const sendScheduledWatchMessage = jest.fn(async () => ({ success: true }));
        const refreshScheduledWatchTestStatus = jest.fn(async () => ({ status: 'success' }));
        const { startScheduledWatchArtifactDiffTest } = loadScriptFunctions('../../src/ui/popup.js', [
            'startScheduledWatchArtifactDiffTest'
        ], {
            elements: {
                scheduledWatchTestSiteSelect: { value: 'c' },
                scheduledWatchArtifactDiffTestModeOptions: [
                    { value: 'fast', checked: false },
                    { value: 'alarm', checked: true }
                ]
            },
            sendScheduledWatchMessage,
            refreshScheduledWatchTestStatus,
            startScheduledWatchTestStatusPolling: jest.fn(),
            renderScheduledWatchTestStatus: jest.fn()
        });

        await startScheduledWatchArtifactDiffTest();
        expect(sendScheduledWatchMessage).toHaveBeenCalledWith({
            action: 'startScheduledWatchArtifactDiffTest', siteId: 'c', executionMode: 'alarm'
        });

        const fallbackSend = jest.fn(async () => ({ success: true }));
        const { startScheduledWatchArtifactDiffTest: startWithDefault } = loadScriptFunctions('../../src/ui/popup.js', [
            'startScheduledWatchArtifactDiffTest'
        ], {
            elements: { scheduledWatchTestSiteSelect: { value: 'c' }, scheduledWatchArtifactDiffTestModeOptions: [] },
            sendScheduledWatchMessage: fallbackSend,
            refreshScheduledWatchTestStatus,
            startScheduledWatchTestStatusPolling: jest.fn(),
            renderScheduledWatchTestStatus: jest.fn()
        });
        await startWithDefault();
        expect(fallbackSend).toHaveBeenCalledWith({
            action: 'startScheduledWatchArtifactDiffTest', siteId: 'c', executionMode: 'fast'
        });
    });

    test('B/C専用タブはA系シナリオと安全テストを排他的に表示する', () => {
        const classList = { toggle: jest.fn() };
        const testScenarioPanel = { hidden: false };
        const scheduledWatchTestPanel = { hidden: true };
        const { renderTestScenarioModeUI } = loadScriptFunctions('../../src/ui/popup.js', [
            'renderTestScenarioModeUI'
        ], {
            elements: {
                testScenarioModeOptions: [{ dataset: { testScenarioMode: 'scheduled' }, classList }],
                testScenarioPanel,
                scheduledWatchTestPanel
            }
        });

        renderTestScenarioModeUI('scheduled');
        expect(classList.toggle).toHaveBeenCalledWith('active', true);
        expect(testScenarioPanel.hidden).toBe(true);
        expect(scheduledWatchTestPanel.hidden).toBe(false);
    });

    test('取得方式診断タブは既存テストシナリオと排他的に表示する', () => {
        const classList = { toggle: jest.fn() };
        const testScenarioPanel = { hidden: false };
        const diagnosisPanel = { hidden: true };
        const { renderTestScenarioModeUI } = loadScriptFunctions('../../src/ui/popup.js', [
            'renderTestScenarioModeUI'
        ], {
            elements: {
                testScenarioModeOptions: [{ dataset: { testScenarioMode: 'diagnosis' }, classList }],
                testScenarioPanel,
                stockFetchDiagnosisTestPanel: diagnosisPanel
            }
        });

        renderTestScenarioModeUI('diagnosis');
        expect(classList.toggle).toHaveBeenCalledWith('active', true);
        expect(testScenarioPanel.hidden).toBe(true);
        expect(diagnosisPanel.hidden).toBe(false);
    });

    test('B はAと独立したURL・セレクタ・予約設定を持つ', () => {
        const html = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        const background = fs.readFileSync(path.join(root, 'src/background/background.js'), 'utf8');
        expect(html).toContain('<label for="singleScheduledWatchEnabled">毎日開始予約を有効化</label>');
        expect(html).toContain('id="singleScheduledWatchUrl"');
        expect(html).toContain('id="singleScheduledWatchSelector"');
        expect(html).toContain('<label for="monitorUrl">商品ページURLを指定</label>');
        expect(html).toContain('<label for="singleScheduledWatchUrl">検索結果・一覧ページURL</label>');
        expect(html).toContain('商品ページ用ではなく、この検索結果または一覧ページで確認した商品リンク・商品カードのセレクタを設定します。');
        expect(html).not.toContain('copySingleSettingsToScheduledWatch');
        expect(source).not.toContain('copySingleSettingsToScheduledWatch');
        expect(html).not.toContain('id="urlRegistrationSection"');
        expect(source).not.toContain('registeredUrls');
        expect(source).toContain('function collectSingleScheduledWatchFromUI()');
        expect(source).toContain('function loadSingleScheduledWatchSettings(');
        expect(source).toContain("discordChannelId: elements.singleScheduledWatchDiscordChannelId?.value.trim() || ''");
        expect(source).toContain('singleScheduledWatch.discordChannelId || \'\'');
        expect(background).toContain('discordChannelId: scheduledWatch.discordChannelId || ""');
        expect(source).toContain('async function saveSingleScheduledWatchSettings()');
        expect(source).toContain("single_scheduled_watch");
    });

    test('B は共有サイトの既定プロファイルで検索結果URLと商品取得セレクタを対にして選べる', () => {
        const html = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        const ecSites = JSON.parse(fs.readFileSync(path.join(root, 'src/config/ec-sites.json'), 'utf8'));
        const aeon = ecSites.sites.find((site) => site.id === 'aeon');
        const { getEcSiteById, getScheduledWatchProfilesFromSite, getScheduledWatchProfile, getDefaultScheduledWatchProfile } = loadScriptFunctions('../../src/ui/popup.js', [
            'getEcSiteById',
            'getScheduledWatchProfilesFromSite',
            'getScheduledWatchProfile',
            'getDefaultScheduledWatchProfile'
        ], { ecSitesCache: ecSites.sites });

        expect(html).toContain('id="singleScheduledWatchSite"');
        expect(html).toContain('id="singleScheduledWatchProfile"');
        expect(source).toContain('function applySingleScheduledWatchProfile(');
        expect(source).toContain('function clearSingleScheduledWatchProfileSelection()');
        expect(aeon.scheduledWatchProfiles).toContainEqual(expect.objectContaining({
            id: 'pokemon-card-game',
            productSelector: 'li.product__item',
            isDefault: true
        }));
        expect(getScheduledWatchProfilesFromSite(getEcSiteById('aeon'))).toHaveLength(1);
        expect(getScheduledWatchProfile('aeon', 'pokemon-card-game')).toMatchObject({
            productSelector: 'li.product__item'
        });
        expect(getDefaultScheduledWatchProfile('aeon')).toMatchObject({ id: 'pokemon-card-game' });
    });

    test('B はセブンネットの検索結果プロファイルとAと共通の予約ON/OFF操作を持つ', () => {
        const html = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        const background = fs.readFileSync(path.join(root, 'src/background/background.js'), 'utf8');
        const ecSites = JSON.parse(fs.readFileSync(path.join(root, 'src/config/ec-sites.json'), 'utf8'));
        const scheduledWatchSites = JSON.parse(fs.readFileSync(path.join(root, 'src/config/scheduled-watch-sites.json'), 'utf8'));
        const { getEcSiteById, getScheduledWatchProfilesFromSite } = loadScriptFunctions('../../src/ui/popup.js', [
            'getEcSiteById', 'getScheduledWatchProfilesFromSite'
        ], { ecSitesCache: ecSites.sites, scheduledWatchSitesCache: scheduledWatchSites.sites });
        const sevennet = getEcSiteById('sevennet');

        expect(getScheduledWatchProfilesFromSite(sevennet)).toContainEqual(expect.objectContaining({
            id: '7net-pokemon',
            url: 'https://7net.omni7.jp/search?q=%E3%83%9D%E3%82%B1%E3%83%A2%E3%83%B3%E3%82%AB%E3%83%BC%E3%83%89%E3%82%B2%E3%83%BC%E3%83%A0&ageGroup=2',
            productSelector: 'a[href*="/detail/"]',
            schedules: [{ startTime: '12:00', endTime: '12:01', intervalSeconds: 30 }]
        }));
        expect(html).toContain('id="setSingleScheduledWatchTimesFromNowButton"');
        expect(html).toContain('id="singleScheduledWatchEnabled"');
        expect(html).toContain('毎日開始予約を有効化');
        expect(html).toContain('予約だけで開始');
        expect(html).toContain('予約を止める');
        expect(html).not.toContain('id="startSingleScheduledWatchButton"');
        expect(html).not.toContain('id="stopSingleScheduledWatchButton"');
        expect(html.indexOf('class="single-scheduled-watch-guide"')).toBeLessThan(html.indexOf('id="singleScheduledWatchStatus"'));
        expect(html.indexOf('id="singleScheduledWatchStatus"')).toBeLessThan(html.indexOf('id="singleScheduledWatchOpenDetectedUrl"'));
        expect(source).not.toContain('async function scheduleSingleScheduledWatch()');
        expect(source).toContain('async function setSingleScheduledWatchTimesFromNow()');
        expect(source).not.toContain("action: 'startSingleScheduledWatch'");
        expect(background).toContain('reason: "scheduled_watch_disabled"');
        expect(background).toContain('const monitorSelector = scheduledWatch.monitorSelector || "";');
        expect(background).toContain('!monitorSelector');
        expect(background).toContain('"商品取得セレクタを設定してください"');
    });

    test('B は予約と独立して指定時間の即時監視を開始・停止できる', () => {
        const html = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        const background = fs.readFileSync(path.join(root, 'src/background/background.js'), 'utf8');
        const configManager = fs.readFileSync(path.join(root, 'src/background/monitoringConfigManager.js'), 'utf8');

        expect(html).toContain('id="singleScheduledWatchImmediateDuration" min="1" max="480" value="3"');
        expect(html).toContain('id="startSingleScheduledWatchNowButton"');
        expect(html).toContain('id="stopSingleScheduledWatchNowButton"');
        expect(html.indexOf('B: 検索結果・一覧ページ監視')).toBeLessThan(html.indexOf('singleScheduledWatchImmediateDuration'));
        expect(html.indexOf('singleScheduledWatchImmediateDuration')).toBeLessThan(html.indexOf('singleScheduledWatchEnabled'));
        expect(html.indexOf('id="startButton"')).toBeGreaterThan(html.indexOf('id="duration"'));
        expect(html).toContain('<h4>今すぐ監視</h4>');
        expect(html).toContain('<h4>毎日開始予約</h4>');
        expect(source).toContain('async function startSingleScheduledWatchNow()');
        expect(source).toContain("action: 'startSingleScheduledWatchNow'");
        expect(source).toContain('async function stopSingleScheduledWatchNow()');
        expect(source).toContain("action: 'stopSingleScheduledWatchNow'");
        expect(configManager).toContain('immediateDurationMinutes: 3');
        expect(background).toContain('async function startSingleScheduledWatchNow()');
        expect(background).toContain('requireEnabled: false');
        expect(background).toContain('trigger: "immediate"');
        expect(background).toContain('async function stopSingleScheduledWatchNow()');
        expect(background).toContain('reason: "manual_stop"');
        expect(background).toContain('activeSession.trigger === "immediate"');
    });

    test('B の現在時刻プリセットは開始を+2分、終了を+3分にする', () => {
        const { formatLocalTimeHHMM, getSingleScheduledWatchTimePreset } = loadScriptFunctions('../../src/ui/popup.js', [
            'formatLocalTimeHHMM',
            'getSingleScheduledWatchTimePreset'
        ]);
        const now = new Date(2026, 9, 7, 9, 58, 30);

        expect(formatLocalTimeHHMM(now)).toBe('09:58');
        expect(getSingleScheduledWatchTimePreset(now)).toEqual({ startTime: '10:00', endTime: '10:01' });
        expect(getSingleScheduledWatchTimePreset(new Date(2026, 9, 7, 23, 58, 30))).toEqual({ startTime: '00:00', endTime: '00:01' });
    });

    test('複数URL B の現在時刻プリセットは開始を+2分、終了を+3分にして未保存フォームへ入力する', () => {
        const html = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        const multipleListWatchStartTime = { value: '11:57' };
        const multipleListWatchEndTime = { value: '12:05' };
        const showMessage = jest.fn();
        const { formatLocalTimeHHMM, getSingleScheduledWatchTimePreset, getMultipleListWatchTimePreset, setMultipleListWatchTimesFromNow } = loadScriptFunctions('../../src/ui/popup.js', [
            'formatLocalTimeHHMM',
            'getSingleScheduledWatchTimePreset',
            'getMultipleListWatchTimePreset',
            'setMultipleListWatchTimesFromNow'
        ], {
            elements: { multipleListWatchStartTime, multipleListWatchEndTime },
            showMessage
        });
        const now = new Date(2026, 9, 7, 9, 58, 30);

        expect(html).toContain('id="setMultipleListWatchTimesFromNowButton"');
        expect(html).toContain('追加・更新するまで保存されません。');
        expect(html).toContain('id="setMultipleScheduledMonitoringTimeFromNowButton"');
        expect(getMultipleListWatchTimePreset(now)).toEqual({ startTime: '10:00', endTime: '10:01' });
        expect(getMultipleListWatchTimePreset(new Date(2026, 9, 7, 23, 58, 30))).toEqual({ startTime: '00:00', endTime: '00:01' });
        setMultipleListWatchTimesFromNow();
        expect(multipleListWatchStartTime.value).toMatch(/^\d{2}:\d{2}$/);
        expect(multipleListWatchEndTime.value).toMatch(/^\d{2}:\d{2}$/);
        expect(showMessage).toHaveBeenCalledWith('開始時刻を現在＋2分、終了時刻を現在＋3分に入力しました', 'success');
        expect(source).toContain('function setMultipleListWatchTimesFromNow()');
    });

    test('複数URL A の現在時刻プリセットは開始を+2分にして保存・予約再同期する', async () => {
        const multiScheduleTime = { value: '11:57' };
        const showMessage = jest.fn();
        const saveMultipleModeCommonSettings = jest.fn(async () => true);
        const { formatLocalTimeHHMM, setMultipleScheduledMonitoringTimeFromNow } = loadScriptFunctions('../../src/ui/popup.js', [
            'formatLocalTimeHHMM',
            'setMultipleScheduledMonitoringTimeFromNow'
        ], {
            elements: { multiScheduleTime },
            saveMultipleModeCommonSettings,
            showMessage
        });

        await setMultipleScheduledMonitoringTimeFromNow();
        expect(multiScheduleTime.value).toMatch(/^\d{2}:\d{2}$/);
        expect(saveMultipleModeCommonSettings).toHaveBeenCalledWith({ showScheduleMessage: true });
        expect(showMessage).toHaveBeenCalledWith('開始時刻を現在＋2分に設定して保存しました', 'success');
        expect(formatLocalTimeHHMM(new Date(2026, 9, 7, 9, 58))).toBe('09:58');
    });

    test('単一URL A は指定URLだけに毎日開始予約と現在時刻プリセットを提供する', () => {
        const html = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        const background = fs.readFileSync(path.join(root, 'src/background/background.js'), 'utf8');
        const configManager = fs.readFileSync(path.join(root, 'src/background/monitoringConfigManager.js'), 'utf8');
        const { formatScheduledWatchExecutionTimestamp, formatScheduledWatchNextRun, formatSingleKeywordScheduleStatus } = loadScriptFunctions('../../src/ui/popup.js', [
            'formatScheduledWatchExecutionTimestamp',
            'formatScheduledWatchNextRun',
            'formatSingleKeywordScheduleStatus'
        ]);

        expect(html).toContain('id="singleKeywordScheduleEnabled"');
        expect(html).toContain('id="singleKeywordScheduleTime"');
        expect(html).toContain('id="setSingleKeywordScheduleTimeFromNowButton"');
        expect(source).toContain('予約は「商品ページURLを指定」を選んだ場合に利用できます。');
        expect(html).toContain('class="single-keyword-schedule-settings"');
        expect(html).toContain('予約だけで開始');
        expect(html).toContain('「開始」ボタンは不要です。');
        expect(html).toContain('今すぐ開始');
        expect(html).toContain('予約時刻に監視が実行中なら、新しい監視は開始しません。');
        expect(source).toContain('function updateSingleKeywordScheduleControls()');
        expect(source).toContain('async function setSingleKeywordScheduleTimeFromNow()');
        expect(source).toContain('config.single_keyword_schedule = collectSingleKeywordScheduleFromUI();');
        expect(source).toContain('updateStatus();');
        expect(background).toContain('single_keyword_schedule: monitoringStatus.single_keyword_schedule');
        expect(background).toContain('single_keyword_schedule: responseData.single_keyword_schedule');
        expect(configManager).toContain('single_keyword_schedule: config.single_keyword_schedule');
        expect(background).toContain('single_config: { url: responseData.single_config?.url || "" }');
        expect(formatSingleKeywordScheduleStatus({
            enabled: true,
            startTime: '15:27',
            nextRunAt: Date.parse('2026-10-08T06:27:00.000Z')
        })).toContain('定時監視: 有効\n開始時刻: 15:27\n次回実行:');
    });

    test('A/BのURL履歴は分離し、直近10件だけを候補表示する', async () => {
        const html = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        const { normalizeRecentMonitorUrl, updateRecentMonitorUrlHistory } = loadScriptFunctions('../../src/ui/popup.js', [
            'normalizeRecentMonitorUrl', 'updateRecentMonitorUrlHistory'
        ], {
            RECENT_MONITOR_URL_LIMIT: 10
        });

        expect(html).toContain('id="targetUrl" list="singleKeywordRecentUrls"');
        expect(html).toContain('id="singleScheduledWatchUrl" list="singleScheduledWatchRecentUrls"');
        expect(html).toContain('<datalist id="singleKeywordRecentUrls"></datalist>');
        expect(html).toContain('<datalist id="singleScheduledWatchRecentUrls"></datalist>');
        expect(html).not.toContain('通常運用は複数URL監視です。');
        expect(source).toContain("SINGLE_KEYWORD_RECENT_URLS_STORAGE_KEY = 'singleKeywordRecentUrls'");
        expect(source).toContain("SINGLE_SCHEDULED_WATCH_RECENT_URLS_STORAGE_KEY = 'singleScheduledWatchRecentUrls'");
        expect(normalizeRecentMonitorUrl('ftp://example.com')).toBe('');
        expect(normalizeRecentMonitorUrl('not a url')).toBe('');
        expect(updateRecentMonitorUrlHistory(['https://example.com/old', '', 'not a url'], 'https://example.com/new'))
            .toEqual(['https://example.com/new', 'https://example.com/old']);
        expect(updateRecentMonitorUrlHistory(['https://example.com/a', 'https://example.com/b'], 'https://example.com/a'))
            .toEqual(['https://example.com/a', 'https://example.com/b']);
        expect(updateRecentMonitorUrlHistory(Array.from({ length: 12 }, (_, index) => `https://example.com/${index}`), 'https://example.com/latest'))
            .toHaveLength(10);

        const storage = {};
        const { rememberRecentMonitorUrl } = loadScriptFunctions('../../src/ui/popup.js', [
            'normalizeRecentMonitorUrl', 'updateRecentMonitorUrlHistory', 'rememberRecentMonitorUrl'
        ], {
            RECENT_MONITOR_URL_LIMIT: 10,
            chrome: {
                storage: {
                    local: {
                        get: async (key) => ({ [key]: storage[key] }),
                        set: async (value) => Object.assign(storage, value)
                    }
                }
            }
        });
        await rememberRecentMonitorUrl('singleKeywordRecentUrls', 'https://example.com/product');
        await rememberRecentMonitorUrl('singleScheduledWatchRecentUrls', 'https://example.com/search?q=card');
        expect(storage.singleKeywordRecentUrls).toEqual(['https://example.com/product']);
        expect(storage.singleScheduledWatchRecentUrls).toEqual(['https://example.com/search?q=card']);
    });

    test('B/C は予約状態と次回実行時刻を共通して表示する', () => {
        const { formatScheduledWatchNextRun, formatSingleScheduledWatchStatus } = loadScriptFunctions('../../src/ui/popup.js', [
            'formatScheduledWatchExecutionTimestamp',
            'formatScheduledWatchNextRun',
            'formatSingleScheduledWatchStatus'
        ]);
        const nextRunAt = Date.parse('2026-10-07T00:30:00.000Z');

        expect(formatScheduledWatchNextRun([{ scheduledTime: nextRunAt }])).toContain('10/07');
        expect(formatScheduledWatchNextRun([])).toBe('未予約');
        expect(formatSingleScheduledWatchStatus({
            enabled: true,
            startTime: '09:30',
            endTime: '10:00',
            intervalSeconds: 30,
            nextRunAt
        })).toContain('定時監視: 予約中\n予定枠: 09:30 〜 10:00\n間隔: 30秒\n次回実行:');
        expect(formatSingleScheduledWatchStatus({ enabled: false })).toBe('定時監視: 無効');
        expect(formatSingleScheduledWatchStatus({
            enabled: false,
            scheduleEnabled: true,
            startTime: '09:30',
            endTime: '10:00',
            reason: '商品取得セレクタを設定してください'
        })).toBe('定時監視: 予約不可\n予定枠: 09:30 〜 10:00\n商品取得セレクタを設定してください');
    });

    test('A は Popup で定時開始を設定し、予約状態を表示する', () => {
        const html = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');
        const { formatScheduledWatchExecutionTimestamp, formatScheduledWatchNextRun, formatMultipleScheduledMonitoringStatus } = loadScriptFunctions('../../src/ui/popup.js', [
            'formatScheduledWatchExecutionTimestamp',
            'formatScheduledWatchNextRun',
            'formatMultipleScheduledMonitoringStatus'
        ]);
        const nextRunAt = Date.parse('2026-10-07T00:30:00.000Z');

        expect(html).toContain('id="multiScheduleEnabled"');
        expect(html).toContain('id="multiScheduleTime"');
        expect(html).toContain('id="setMultipleScheduledMonitoringTimeFromNowButton"');
        expect(html).toContain('id="multipleScheduledMonitoringStatus" class="single-scheduled-watch-summary" role="status"');
        expect(html).toContain('毎日指定時刻に有効な監視対象を開始します。');
        const summaryStart = html.indexOf('id="multipleOperationsSummarySection"');
        const summaryEnd = html.indexOf('id="multipleGlobalControlsSection"', summaryStart);
        const scheduleSettingsStart = html.indexOf('id="multipleTimeSettingsBody"');
        expect(html.slice(summaryStart, summaryEnd)).not.toContain('id="multipleScheduledMonitoringStatus"');
        expect(html.indexOf('id="multipleScheduledMonitoringStatus"')).toBeGreaterThan(scheduleSettingsStart);
        expect(formatMultipleScheduledMonitoringStatus({
            enabled: true,
            startTime: '09:30',
            targetCount: 2,
            nextRunAt
        })).toContain('定時監視: 予約中\n開始時刻: 09:30\n対象: 2件\n次回実行:');
        expect(formatMultipleScheduledMonitoringStatus({
            enabled: false,
            scheduleEnabled: true,
            startTime: '09:30',
            targetCount: 0,
            reason: '有効な監視対象が0件のため予約できません'
        })).toBe('定時監視: 予約不可\n開始時刻: 09:30\n対象: 0件\n有効な監視対象が0件のため予約できません');
        expect(formatMultipleScheduledMonitoringStatus({ enabled: false })).toBe('定時監視: 無効');
    });

    test('複数URL B は対象別の定時予約だけを A と同じ状態カードで表示する', () => {
        const { formatScheduledWatchExecutionTimestamp, formatScheduledWatchNextRun, formatMultipleListWatchScheduleStatus } = loadScriptFunctions('../../src/ui/popup.js', [
            'formatScheduledWatchExecutionTimestamp',
            'formatScheduledWatchNextRun',
            'formatMultipleListWatchScheduleStatus'
        ]);
        const nextRunAt = Date.parse('2026-10-08T03:30:00.000Z');

        expect(formatMultipleListWatchScheduleStatus([
            { id: 'c-site', source: 'scheduled-watch-sites', enabled: true, name: 'C site' },
            {
                id: 'list-1', source: 'popup-list-watch', enabled: true, name: '一覧A', status: 'scheduled',
                schedules: [{ startTime: '11:57', endTime: '12:05', intervalSeconds: 30 }],
                alarms: [{ scheduledTime: nextRunAt }]
            }
        ])).toContain('定時監視: 予約中\n対象: 1件\n一覧A: 11:57 〜 12:05 / 次回実行:');
        expect(formatMultipleListWatchScheduleStatus([])).toBe('定時監視: 無効\n対象ごとの毎日開始予約は未登録です。');
        expect(formatMultipleListWatchScheduleStatus([{
            source: 'popup-list-watch', enabled: true, name: '一覧A', status: 'running',
            activeSession: { active: true, trigger: 'immediate' }, schedules: [{ startTime: '11:57', endTime: '12:05' }],
            alarms: [{ scheduledTime: nextRunAt }]
        }])).toContain('定時監視: 予約中');
    });

    test('A の定時アラームは B/C と別名で、保存済みの有効対象だけを開始する', async () => {
        const alarms = {
            clear: jest.fn(async () => true),
            create: jest.fn(async () => {})
        };
        const config = {
            mode: 'multiple',
            multiple_common_settings: { scheduleEnabled: true, scheduleTime: '09:30' },
            multiple_configs: [{ id: 'a', enabled: true }, { id: 'b', enabled: false }]
        };
        const runMultipleMonitoringStartConfigs = jest.fn(async () => [{ success: true }]);
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'syncMultipleMonitoringSchedule',
            'startScheduledMultipleMonitoring'
        ], {
            DAILY_MULTIPLE_MONITORING_ALARM: 'dailyMultipleMonitoring',
            chrome: { alarms },
            logger: { info: jest.fn(), debug: jest.fn() },
            createScheduleDate: jest.fn(() => new Date('2026-10-07T00:30:00.000Z')),
            configManager: { loadConfig: jest.fn(async () => config) },
            resolveStartAllMonitoringRequestMeta: jest.fn((request) => ({ requestId: request.requestId })),
            runMultipleMonitoringStartConfigs,
            summarizeStartAllMonitoringResults: jest.fn(() => ({ total: 1, successCount: 1, failureCount: 0 }))
        });

        await functions.syncMultipleMonitoringSchedule(config);
        expect(alarms.clear).toHaveBeenCalledWith('dailyMultipleMonitoring');
        expect(alarms.create).toHaveBeenCalledWith('dailyMultipleMonitoring', {
            when: Date.parse('2026-10-07T00:30:00.000Z'),
            periodInMinutes: 24 * 60
        });

        await functions.startScheduledMultipleMonitoring();
        expect(runMultipleMonitoringStartConfigs).toHaveBeenCalledWith(
            expect.objectContaining({
                configs: [{ id: 'a', enabled: true }],
                commonSettings: config.multiple_common_settings,
                monitoringOrigin: 'scheduled'
            }),
            expect.objectContaining({ requestId: expect.stringContaining('scheduledMultiple_') })
        );
    });

    test('A は即時・予約の開始元を分離し、即時停止では予約実行を停止しない', async () => {
        const { buildStartAllMonitoringMessage } = loadScriptFunctions('../../src/ui/popup.js', [
            'buildStartAllMonitoringMessage'
        ], { createStartAllMonitoringRequestId: jest.fn(() => 'immediate-request') });
        expect(buildStartAllMonitoringMessage([], {}, 'now')).toMatchObject({
            action: 'startAllMonitoring', requestId: 'now', monitoringOrigin: 'immediate'
        });

        const deactivateSingleMonitoringSession = jest.fn(async () => ({}));
        const { stopMultipleMonitoringByOrigin } = loadScriptFunctions('../../src/background/background.js', [
            'getMonitoringSessionScope',
            'getMonitoringSessionOrigin',
            'stopMultipleMonitoringByOrigin'
        ], {
            getSingleMonitoringSessions: jest.fn(async () => ({
                immediate: { id: 'immediate', active: true, monitoringScope: 'multiple', monitoringOrigin: 'immediate' },
                scheduled: { id: 'scheduled', active: true, monitoringScope: 'multiple', monitoringOrigin: 'scheduled' }
            })),
            deactivateSingleMonitoringSession
        });
        await expect(stopMultipleMonitoringByOrigin('immediate')).resolves.toMatchObject({ stoppedCount: 1 });
        expect(deactivateSingleMonitoringSession).toHaveBeenCalledWith('immediate', 'manual_stop');
        expect(deactivateSingleMonitoringSession).not.toHaveBeenCalledWith('scheduled', 'manual_stop');
    });

    test('A の予約対象数は軽量化された状態応答ではなく正本設定から判定する', () => {
        const { resolveMultipleMonitoringConfigForStatus } = loadScriptFunctions('../../src/background/background.js', [
            'resolveMultipleMonitoringConfigForStatus'
        ]);
        const resolved = resolveMultipleMonitoringConfigForStatus({
            multiple_configs: [],
            multiple_configs_summary: { count: 2 },
            multiple_common_settings: { scheduleEnabled: true, scheduleTime: '09:00' }
        }, {
            multiple_configs: [{ id: 'a', enabled: true }, { id: 'b', enabled: true }],
            multiple_common_settings: { scheduleEnabled: true, scheduleTime: '09:00' }
        });
        expect(resolved.multipleConfigs.filter((target) => target.enabled)).toHaveLength(2);
        expect(resolved.commonSettings).toEqual({ scheduleEnabled: true, scheduleTime: '09:00' });
    });

    test('B は終了時刻が開始時刻以下の場合に保存せず、日付またぎを受け付けない', async () => {
        const { saveMultipleListWatchTarget } = loadScriptFunctions('../../src/ui/popup.js', [
            'saveMultipleListWatchTarget'
        ], {
            elements: {
                multipleListWatchSite: { value: 'site' },
                multipleListWatchProfile: { value: 'profile' },
                multipleListWatchUrl: { value: 'https://example.com/list' },
                multipleListWatchStartTime: { value: '23:00' },
                multipleListWatchEndTime: { value: '01:00' },
                multipleListWatchInterval: { value: '30' }
            },
            getScheduledWatchProfile: jest.fn(() => ({ url: 'https://example.com/default' })),
            configManager: { loadConfig: jest.fn() }
        });
        await expect(saveMultipleListWatchTarget()).rejects.toThrow('終了時刻は開始時刻より後に設定してください（日付またぎは未対応です）');
    });

    test('複数URL B は対象ごとに予約を有効・無効化し、定時アラームを再同期する', async () => {
        const config = {
            multiple_list_watch_configs: [{ id: 'list-1', enabled: true, name: '一覧A' }]
        };
        const saveConfig = jest.fn(async () => true);
        const sendScheduledWatchMessage = jest.fn(async () => ({ success: true }));
        const renderMultipleListWatchList = jest.fn();
        const refreshScheduledWatchSitesSafely = jest.fn(async () => []);
        const showMessage = jest.fn();
        const { normalizeGetStatusResponse, unwrapConfigFromManager, isConfigSaveSuccessful, setMultipleListWatchTargetEnabled } = loadScriptFunctions('../../src/ui/popup.js', [
            'normalizeGetStatusResponse',
            'unwrapConfigFromManager',
            'isConfigSaveSuccessful',
            'setMultipleListWatchTargetEnabled'
        ], {
            configManager: { loadConfig: jest.fn(async () => config), saveConfig },
            sendScheduledWatchMessage,
            renderMultipleListWatchList,
            refreshScheduledWatchSitesSafely,
            showMessage
        });

        await setMultipleListWatchTargetEnabled('list-1', false);
        expect(saveConfig).toHaveBeenCalledWith(expect.objectContaining({
            multiple_list_watch_configs: [expect.objectContaining({ id: 'list-1', enabled: false })]
        }));
        expect(sendScheduledWatchMessage).toHaveBeenCalledWith({ action: 'resyncScheduledWatchSites' });
        expect(renderMultipleListWatchList).toHaveBeenCalledWith(expect.objectContaining({
            multiple_list_watch_configs: [expect.objectContaining({ id: 'list-1', enabled: false })]
        }));
        expect(refreshScheduledWatchSitesSafely).toHaveBeenCalledTimes(1);
        expect(showMessage).toHaveBeenCalledWith('一覧監視の予約を無効化しました', 'success');
        expect(normalizeGetStatusResponse).toBeDefined();
        expect(unwrapConfigFromManager).toBeDefined();
        expect(isConfigSaveSuccessful).toBeDefined();

        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        expect(source).toContain('data-list-watch-action="toggle-enabled"');
        expect(source).toContain("'予約を無効化'");
        expect(source).toContain("'予約を有効化'");
    });

    test('複数URL B は選択対象だけを予約と独立して即時開始・停止する', async () => {
        const startScheduledStockWatchForSite = jest.fn(async () => ({ success: true }));
        const startFunctions = loadScriptFunctions('../../src/background/background.js', [
            'startPopupListWatchNow'
        ], {
            POPUP_LIST_WATCH_PREFIX: 'popupListWatch_',
            loadScheduledWatchSites: jest.fn(async () => [{ id: 'popupListWatch_list-1', source: 'popup-list-watch', enabled: false }]),
            startScheduledStockWatchForSite
        });
        await expect(startFunctions.startPopupListWatchNow(['list-1'], 3)).resolves.toMatchObject({
            success: true, startedCount: 1, skippedCount: 0
        });
        expect(startScheduledStockWatchForSite).toHaveBeenCalledWith('popupListWatch_list-1', 0, {
            trigger: 'immediate', durationMinutes: 3, allowDisabled: true
        });

        const endMultiSiteSession = jest.fn(async () => {});
        const stopFunctions = loadScriptFunctions('../../src/background/background.js', [
            'stopPopupListWatchNow'
        ], {
            POPUP_LIST_WATCH_PREFIX: 'popupListWatch_',
            getMultiSiteSession: jest.fn(async () => ({ active: true, trigger: 'immediate' })),
            endMultiSiteSession
        });
        await expect(stopFunctions.stopPopupListWatchNow(['list-1'])).resolves.toMatchObject({
            success: true, stoppedCount: 1
        });
        expect(endMultiSiteSession).toHaveBeenCalledWith('popupListWatch_list-1', { active: true, trigger: 'immediate' }, { reason: 'manual_stop' });

        const html = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        expect(html).toContain('id="multipleListWatchImmediateDuration" type="number" min="1" max="480" value="3"');
        expect(html).toContain('id="startMultipleListWatchNowButton"');
        expect(html).toContain('id="stopMultipleListWatchNowButton"');
        expect(source).toContain("action: 'startPopupListWatchNow'");
        expect(source).toContain("action: 'stopPopupListWatchNow'");
        expect(source).toContain('data-list-watch-immediate-select');
    });

    test('複数URL B は popup と同じ buy-target プロファイルIDで実行対象を解決する', async () => {
        const ecSites = {
            sites: [{
                id: 'aeon',
                scheduledWatchProfiles: [{
                    id: 'pokemon-card-game',
                    url: 'https://aeonretail.com/Form/Product/ProductList.aspx?query=pokemon',
                    productSelector: 'li.product__item'
                }]
            }]
        };
        const scheduledSites = {
            sites: [{
                id: 'aeon-pokemon',
                name: 'イオン ポケモンカードゲーム',
                url: 'https://aeonretail.com/Form/Product/ProductList.aspx?query=pokemon',
                selectors: { productLinks: 'li.product__item' },
                notification: { siteId: 'aeon' },
                source: { kind: 'buy-target' }
            }]
        };
        const fetch = jest.fn(async (url) => ({
            ok: true,
            json: async () => url === 'ec-sites' ? ecSites : scheduledSites
        }));
        const { resolvePopupListWatchSites } = loadScriptFunctions('../../src/background/background.js', [
            'resolvePopupListWatchSites'
        ], {
            configManager: {
                loadConfig: jest.fn(async () => ({
                    multiple_list_watch_configs: [{
                        id: 'list-1', name: 'ポケモンカードゲーム', siteId: 'aeon', profileId: 'aeon-pokemon',
                        url: 'https://aeonretail.com/Form/Product/ProductList.aspx?query=pokemon'
                    }]
                }))
            },
            chrome: { runtime: { getURL: (path) => path === 'src/config/ec-sites.json' ? 'ec-sites' : 'scheduled-sites' } },
            fetch,
            EC_SITES_PATH: 'src/config/ec-sites.json',
            SCHEDULED_WATCH_SITES_PATH: 'src/config/scheduled-watch-sites.json',
            POPUP_LIST_WATCH_PREFIX: 'popupListWatch_',
            logger: { warn: jest.fn() }
        });

        await expect(resolvePopupListWatchSites()).resolves.toMatchObject({
            sites: [{ id: 'popupListWatch_list-1', selectors: { productLinks: 'li.product__item' } }],
            errors: []
        });
    });

    test('複数URL B の即時開始が全件失敗した場合は、成功扱いにせず理由を返す', async () => {
        const { startPopupListWatchNow } = loadScriptFunctions('../../src/background/background.js', [
            'startPopupListWatchNow'
        ], {
            POPUP_LIST_WATCH_PREFIX: 'popupListWatch_',
            loadScheduledWatchSites: jest.fn(async () => []),
            startScheduledStockWatchForSite: jest.fn()
        });

        await expect(startPopupListWatchNow(['missing-target'], 3)).resolves.toMatchObject({
            success: false,
            startedCount: 0,
            skippedCount: 1,
            results: [{ targetId: 'missing-target', reason: 'target_not_found' }]
        });
        await expect(startPopupListWatchNow(['missing-target'], 3)).resolves.toMatchObject({
            error: expect.stringContaining('設定を確認してください')
        });
    });

    test('複数URL B の即時開始結果はスキップ対象と理由を popup に表示できる形式にする', () => {
        const { formatMultipleListWatchStartResult } = loadScriptFunctions('../../src/ui/popup.js', [
            'formatMultipleListWatchStartResult'
        ]);

        expect(formatMultipleListWatchStartResult({
            results: [
                { targetId: 'started', success: true },
                { targetId: 'running', success: false, reason: 'already_running' }
            ]
        })).toBe(' / スキップ理由: running: already_running');

        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        expect(source).toContain('設定要修正');
        expect(source).toContain('popupListWatchErrors');
        expect(source).toContain('data-list-watch-immediate-select data-list-watch-id="${escapeHtml(target.id)}"${disabled}');
    });

    test('複数URL B の対象一覧を再描画しても即時監視の選択状態を保持する', () => {
        const renderedItems = [];
        const list = {
            innerHTML: '',
            classList: { add: jest.fn() },
            querySelectorAll: jest.fn(() => []),
            appendChild: (item) => renderedItems.push(item)
        };
        const { getSelectedMultipleListWatchTargetIds, updateMultipleListWatchImmediateControls, renderMultipleListWatchList } = loadScriptFunctions('../../src/ui/popup.js', [
            'getSelectedMultipleListWatchTargetIds',
            'updateMultipleListWatchImmediateControls',
            'renderMultipleListWatchList'
        ], {
            elements: {
                multipleListWatchList: list,
                startMultipleListWatchNowButton: {},
                stopMultipleListWatchNowButton: {}
            },
            escapeHtml: (value) => String(value),
            document: { createElement: () => ({}) }
        });

        renderMultipleListWatchList({
            multiple_list_watch_configs: [{ id: 'list-1', name: '一覧A', enabled: true, intervalSeconds: 30 }]
        }, [], ['list-1']);

        expect(renderedItems[0].innerHTML).toContain('data-list-watch-id="list-1" checked');
        expect(getSelectedMultipleListWatchTargetIds).toBeDefined();
        expect(updateMultipleListWatchImmediateControls).toBeDefined();
    });

    test('複数URL B は popup を開き直して選択がなくても実行中の即時監視を停止できる', async () => {
        const sendScheduledWatchMessage = jest.fn(async () => ({ success: true, stoppedCount: 1 }));
        const refreshScheduledWatchSitesSafely = jest.fn(async () => []);
        const showMessage = jest.fn();
        const { getSelectedMultipleListWatchTargetIds, stopMultipleListWatchNow } = loadScriptFunctions('../../src/ui/popup.js', [
            'getSelectedMultipleListWatchTargetIds',
            'stopMultipleListWatchNow'
        ], {
            elements: { multipleListWatchList: { querySelectorAll: () => [] } },
            __multipleListWatchImmediateTargetIds: ['list-1'],
            sendScheduledWatchMessage,
            refreshScheduledWatchSitesSafely,
            showMessage
        });

        await stopMultipleListWatchNow();

        expect(sendScheduledWatchMessage).toHaveBeenCalledWith({ action: 'stopPopupListWatchNow', targetIds: ['list-1'] });
        expect(refreshScheduledWatchSitesSafely).toHaveBeenCalledTimes(1);
        expect(showMessage).toHaveBeenCalledWith('一覧監視の即時監視を停止しました（停止 1件）', 'success');
        expect(getSelectedMultipleListWatchTargetIds()).toEqual([]);
    });

    test('複数URL B のAI判断サポート設定はAと分離して保存され、即時監視ログは予約と区別する', () => {
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        const background = fs.readFileSync(path.join(root, 'src/background/background.js'), 'utf8');
        const configManager = fs.readFileSync(path.join(root, 'src/background/monitoringConfigManager.js'), 'utf8');

        expect(source).toContain('async function saveMultipleListWatchAiSupportFilePreference()');
        expect(source).toContain("activeSubtab === 'list'");
        expect(source).toContain('multiple_list_watch_common_settings');
        expect(background).toContain('downloadAiSupportFile: common.downloadAiSupportFile === true');
        expect(background).toContain('const monitoringLabel = isImmediate ? "即時監視" : "監視";');
        expect(background).toContain('${monitoringLabel}終了');
        expect(background).toContain('継続時間終了');
        expect(background).toContain('[${siteId}][immediate]');
        expect(configManager).toContain('downloadAiSupportFile: false');
    });

    test('単一URL A の定時アラームは指定URLだけを開始し、実行中は重複開始しない', async () => {
        const alarms = {
            clear: jest.fn(async () => true),
            create: jest.fn(async () => {})
        };
        const config = {
            mode: 'single',
            single_keyword_schedule: { enabled: true, startTime: '09:30' },
            single_config: {
                url: 'https://example.com/product',
                settings: { monitorKeyword: '在庫あり', interval: 20 }
            }
        };
        const startSingleMonitoring = jest.fn(async () => ({ success: true }));
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'syncSingleKeywordMonitoringSchedule',
            'startScheduledSingleKeywordMonitoring'
        ], {
            DAILY_SINGLE_KEYWORD_MONITORING_ALARM: 'dailySingleKeywordMonitoring',
            chrome: { alarms },
            logger: { info: jest.fn(), debug: jest.fn() },
            createScheduleDate: jest.fn(() => new Date('2026-10-07T00:30:00.000Z')),
            configManager: { loadConfig: jest.fn(async () => config) },
            getSingleMonitoringSessions: jest.fn(async () => ({})),
            getMonitoringSessionScope: jest.fn(() => 'single'),
            startSingleMonitoring
        });

        await functions.syncSingleKeywordMonitoringSchedule(config);
        expect(alarms.clear).toHaveBeenCalledWith('dailySingleKeywordMonitoring');
        expect(alarms.create).toHaveBeenCalledWith('dailySingleKeywordMonitoring', {
            when: Date.parse('2026-10-07T00:30:00.000Z'),
            periodInMinutes: 24 * 60
        });

        await functions.startScheduledSingleKeywordMonitoring();
        expect(startSingleMonitoring).toHaveBeenCalledWith(
            expect.objectContaining({
                monitorType: 'url',
                targetUrl: 'https://example.com/product',
                monitorKeyword: '在庫あり'
            }),
            null,
            { persistConfig: false, monitoringScope: 'single' }
        );

        const activeFunctions = loadScriptFunctions('../../src/background/background.js', [
            'startScheduledSingleKeywordMonitoring'
        ], {
            configManager: { loadConfig: jest.fn(async () => config) },
            getSingleMonitoringSessions: jest.fn(async () => ({ active: { active: true } })),
            getMonitoringSessionScope: jest.fn(() => 'single'),
            logger: { info: jest.fn(), debug: jest.fn() },
            startSingleMonitoring
        });
        await expect(activeFunctions.startScheduledSingleKeywordMonitoring()).resolves.toMatchObject({
            skipped: true,
            reason: 'single_monitoring_already_running'
        });
        expect(startSingleMonitoring).toHaveBeenCalledTimes(1);
    });

    test('B の定時予約中でも A の取得条件を無効化しない', () => {
        const classList = { remove: jest.fn() };
        const keywordMonitoringFetchConditions = {
            classList,
            setAttribute: jest.fn()
        };
        const elements = {
            keywordMonitoringFetchConditions,
            interval: { disabled: false },
            customInterval: { disabled: false },
            duration: { disabled: false },
            customDuration: { disabled: false }
        };
        const { updateKeywordMonitoringFetchConditionsState } = loadScriptFunctions('../../src/ui/popup.js', [
            'updateKeywordMonitoringFetchConditionsState'
        ], { elements });

        expect(updateKeywordMonitoringFetchConditionsState()).toBe(false);
        expect(classList.remove).toHaveBeenCalledWith('is-disabled');
        expect(keywordMonitoringFetchConditions.setAttribute).toHaveBeenCalledWith('aria-disabled', 'false');
        expect(elements.interval.disabled).toBe(false);
        expect(elements.customInterval.disabled).toBe(false);
        expect(elements.duration.disabled).toBe(false);
        expect(elements.customDuration.disabled).toBe(false);
    });

    test('B の有効な定時予約中でも A の通常開始を無効化しない', () => {
        const startButton = { disabled: false, textContent: '開始' };
        const stopButton = { disabled: true };
        const elements = {
            startButton,
            stopButton,
            statusIndicator: { className: '' },
            statusText: { textContent: '' }
        };
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'updateButtonState'
        ], { elements, StatusIndicator: { render: jest.fn() } });

        functions.updateButtonState(false, 'single');
        expect(startButton.disabled).toBe(false);
        expect(startButton.textContent).toBe('開始');
    });

    test('定時テスト結果の状態ごとのカード表示情報を返す', () => {
        const { formatScheduledWatchTestStatus, resolveScheduledWatchTestStatusPresentation, getScheduledWatchTestTarget, getScheduledWatchTestVerificationItems } = loadScriptFunctions('../../src/ui/popup.js', [
            'formatScheduledWatchTestStatus',
            'resolveScheduledWatchTestStatusPresentation',
            'getScheduledWatchTestTarget',
            'getScheduledWatchTestVerificationItems'
        ]);
        expect(formatScheduledWatchTestStatus()).toBe('定時テスト: 未実行');
        expect(formatScheduledWatchTestStatus({ status: 'running', name: 'C' })).toContain('実行中');
        expect(resolveScheduledWatchTestStatusPresentation('success')).toEqual({ label: '成功', title: '商品取得を確認', tone: 'passed' });
        expect(resolveScheduledWatchTestStatusPresentation('warning')).toEqual({ label: '要確認', title: '商品取得を確認してください', tone: 'needs-review' });
        expect(resolveScheduledWatchTestStatusPresentation('failed')).toEqual({ label: '失敗', title: '安全テストを完了できませんでした', tone: 'failed' });
        expect(resolveScheduledWatchTestStatusPresentation('running')).toEqual({ label: '実行中', title: '安全テストを実行中', tone: 'running' });
        expect(getScheduledWatchTestTarget({ mode: 'single', url: 'https://example.com/item' })).toBe('https://example.com/item');
        expect(getScheduledWatchTestTarget({ mode: 'multi', name: 'Cサイト' })).toBe('Cサイト');
        expect(getScheduledWatchTestVerificationItems({ status: 'success', matchedCount: 2, snapshotCount: 3 })).toEqual([
            { label: '商品取得セレクタ結果', passed: true, reason: '2件' },
            { label: 'snapshot取得件数', passed: true, reason: '3件' }
        ]);
        expect(formatScheduledWatchTestStatus({ status: 'warning', warningReason: '商品取得セレクタが未設定です', name: 'B' })).toContain('要確認');
        expect(formatScheduledWatchTestStatus({ status: 'failed', failureReason: '取得失敗' })).toContain('取得失敗');
    });

    test('定時テスト結果カードは対象・判定理由・取得件数・無副作用の範囲を分離する', () => {
        const createElement = () => ({
            className: '', textContent: '', hidden: false, children: [],
            append(...nodes) { this.children.push(...nodes); },
            replaceChildren(...nodes) { this.children = [...nodes]; }
        });
        const container = createElement();
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'formatScheduledWatchTestStatus',
            'resolveScheduledWatchTestStatusPresentation',
            'getScheduledWatchTestTarget',
            'getScheduledWatchTestVerificationItems',
            'renderScheduledWatchTestStatus'
        ], {
            elements: { scheduledWatchTestStatus: container },
            document: { createElement }
        });

        functions.renderScheduledWatchTestStatus({
            mode: 'multi', name: 'Cサイト', status: 'warning',
            decisionReason: '商品取得セレクタの結果が0件です',
            verificationItems: [
                { label: '商品取得セレクタ結果', passed: false, reason: '0件' },
                { label: 'snapshot取得件数', passed: false, reason: '0件' }
            ]
        });

        expect(container.className).toContain('auto-test-result-card');
        expect(container.className).toContain('status-needs-review');
        expect(container.children[0].children[0].textContent).toBe('要確認');
        expect(container.children[1].textContent).toBe('対象: Cサイト');
        expect(container.children[3].textContent).toBe('商品取得セレクタの結果が0件です');
        expect(container.children[4].children).toHaveLength(2);
        expect(container.children[5].textContent).toContain('変化検知・Gmail送信・ダウンロード・baseline保存・通常監視は行いません');
    });

    test('B/C 安全テストは対象と商品取得内容を説明し、開始拒否を結果欄へ表示する', () => {
        const html = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        expect(html).toContain('B: 商品取得テスト');
        expect(html).toContain('C: 商品取得テスト');
        expect(html).toContain('設定済みの商品取得経路で1回 snapshot を取得します。');
        const start = source.indexOf('async function startScheduledWatchSafetyTest(');
        const end = source.indexOf('async function copyTextToClipboard(', start);
        expect(source.slice(start, end)).toContain("status: 'failed'");
        expect(source.slice(start, end)).toContain('開始不可:');
        expect(source.slice(start, end)).toContain('renderScheduledWatchTestStatus(response?.test');
    });

    test('定時テストの実行中だけ状態をポーリングし、完了時に停止する', () => {
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        const refreshStart = source.indexOf('async function refreshScheduledWatchTestStatus()');
        const refreshEnd = source.indexOf('async function startScheduledWatchSafetyTest(', refreshStart);
        const startTestStart = refreshEnd;
        const startTestEnd = source.indexOf('async function copyTextToClipboard(', startTestStart);

        expect(source).toContain('function startScheduledWatchTestStatusPolling()');
        expect(source).toContain('setInterval(async () => {');
        expect(source.slice(refreshStart, refreshEnd)).toContain("if (test?.status !== 'running')");
        expect(source.slice(refreshStart, refreshEnd)).toContain('stopScheduledWatchTestStatusPolling();');
        expect(source.slice(startTestStart, startTestEnd)).toContain("if (test?.status === 'running')");
        expect(source.slice(startTestStart, startTestEnd)).toContain('startScheduledWatchTestStatusPolling();');
    });

    test('background は専用キー・専用アラームと C message を使い、テストで baseline を永続化しない', () => {
        const source = fs.readFileSync(path.join(root, 'src/background/background.js'), 'utf8');
        expect(source).toContain('SCHEDULED_WATCH_TEST_SESSION_KEY');
        expect(source).toContain('SCHEDULED_WATCH_TEST_ALARM');
        expect(source).toContain('case "getScheduledWatchSitesStatus"');
        expect(source).toContain('scheduledWatch,');
        expect(source).toContain('nextRunAt: scheduledAlarm?.scheduledTime || null');
        expect(source).toContain('case "resyncScheduledWatchSites"');
        expect(source).toContain('case "startScheduledWatchTest"');
        const testStart = source.indexOf('async function startScheduledWatchTest(');
        const testEnd = source.indexOf('async function getScheduledWatchTestStatus()', testStart);
        const testSource = source.slice(testStart, testEnd);
        expect(testSource).not.toContain('persistStockSnapshot');
        expect(testSource).not.toContain('handleStockWatchDetection');
        expect(testSource).not.toContain('handleMultiSiteDetection');
        expect(source).toContain('matchedCount: elements.length');
        expect(source).toContain('const status = !snapshot ? "failed" : warningReason ? "warning" : "success";');
        expect(source).toContain('!monitorSelector');
        expect(source).toContain('matchedCount === 0');
        expect(source).toContain('snapshotCount === 0');
        expect(source).toContain('if (!pageReady)');
        expect(source).toContain('decisionReason: getScheduledWatchTestDecisionReason');
        expect(source).toContain('verificationItems: buildScheduledWatchTestVerificationItems');
        expect(source).toContain('const failureReason = `開始不可: ${error.message || "定時テストの開始に失敗しました"}`;');
    });

    test('background は成功・要確認・失敗に表示専用の判定理由と取得件数を設定する', () => {
        const { buildScheduledWatchTestVerificationItems, getScheduledWatchTestDecisionReason } = loadScriptFunctions('../../src/background/background.js', [
            'buildScheduledWatchTestVerificationItems',
            'getScheduledWatchTestDecisionReason'
        ]);

        expect(getScheduledWatchTestDecisionReason({ status: 'success' }))
            .toBe('対象ページ準備後、設定済み商品取得経路でsnapshotを1件以上取得できた。');
        expect(getScheduledWatchTestDecisionReason({ status: 'warning', warningReason: '商品取得セレクタの結果が0件です' }))
            .toBe('商品取得セレクタの結果が0件です');
        expect(getScheduledWatchTestDecisionReason({ status: 'failed', failureReason: '開始不可: B の本運用中です' }))
            .toBe('開始不可: B の本運用中です');
        expect(buildScheduledWatchTestVerificationItems({ monitorSelector: '.item', matchedCount: 1, snapshotCount: 1 })).toEqual([
            { label: '商品取得セレクタ結果', passed: true, reason: '1件' },
            { label: 'snapshot取得件数', passed: true, reason: '1件' }
        ]);
        expect(buildScheduledWatchTestVerificationItems({ monitorSelector: '', matchedCount: 0, snapshotCount: 0 })).toEqual([
            { label: '商品取得セレクタ結果', passed: false, reason: '商品取得セレクタが未設定です' },
            { label: 'snapshot取得件数', passed: false, reason: '0件' }
        ]);
        expect(buildScheduledWatchTestVerificationItems({ snapshotAvailable: false })[1])
            .toEqual({ label: 'snapshot取得件数', passed: false, reason: 'snapshotを取得できませんでした' });
    });

    test('C アラーム再同期は実在アラームを照合して成功・要確認・失敗を判定する', () => {
        const { buildScheduledWatchResyncResult } = loadScriptFunctions('../../src/background/background.js', [
            'buildScheduledWatchResyncResult'
        ], {
            BASELINE_FETCH_ALARM: 'baselineFetch',
            DAILY_STOCK_CHECK_ALARM: 'dailyStockCheck'
        });
        const sites = [{
            id: 'aeon', name: 'AEON', enabled: true, url: 'https://example.com', baselineTime: '09:00',
            schedules: [{ startTime: '09:01' }, { startTime: '09:02' }]
        }];
        const expectedAlarms = [
            { name: 'baselineFetch_aeon' },
            { name: 'dailyStockCheck_aeon_0' },
            { name: 'dailyStockCheck_aeon_1' }
        ];

        expect(buildScheduledWatchResyncResult({ sites, alarms: expectedAlarms })).toMatchObject({
            status: 'success', activeSiteCount: 1, expectedAlarmCount: 3, configuredAlarmCount: 3,
            missingAlarms: [], configurationIssues: []
        });
        expect(buildScheduledWatchResyncResult({ sites, alarms: expectedAlarms.slice(0, 2) })).toMatchObject({
            status: 'warning', expectedAlarmCount: 3, configuredAlarmCount: 2,
            missingAlarms: [{ siteName: 'AEON', name: 'dailyStockCheck_aeon_1' }]
        });
        expect(buildScheduledWatchResyncResult({ sites: [], alarms: [] })).toMatchObject({
            status: 'warning', activeSiteCount: 0, expectedAlarmCount: 0, configuredAlarmCount: 0,
            decisionReason: '有効な C サイトがないため、再同期するアラームはありません。'
        });
        expect(buildScheduledWatchResyncResult({
            sites: [{ ...sites[0], id: '', url: '' }], alarms: []
        })).toMatchObject({
            status: 'warning', activeSiteCount: 1, expectedAlarmCount: 0, configuredAlarmCount: 0,
            configurationIssues: [{ siteName: 'AEON', reason: 'サイトIDが未設定です' }]
        });
        expect(buildScheduledWatchResyncResult({ error: new Error('alarm create failed') })).toMatchObject({
            status: 'failed', decisionReason: 'C アラームの再同期に失敗しました: alarm create failed'
        });
    });

    test('C 実行結果は取得後の時間満了・検知終了を正常完了とし、未取得と取得例外を区別する', () => {
        const { resolveScheduledWatchExecutionOutcome } = loadScriptFunctions('../../src/background/background.js', [
            'resolveScheduledWatchExecutionOutcome'
        ]);
        const captured = { snapshotCaptured: true, selectorTextCaptured: true };

        expect(resolveScheduledWatchExecutionOutcome(captured, 'window_end')).toMatchObject({
            status: 'success', decisionReason: expect.stringContaining('完走')
        });
        expect(resolveScheduledWatchExecutionOutcome(captured, 'new_product_detected')).toMatchObject({
            status: 'success', decisionReason: expect.stringContaining('新商品検知')
        });
        expect(resolveScheduledWatchExecutionOutcome({ snapshotCaptured: true, selectorTextCaptured: false }, 'window_end')).toMatchObject({
            status: 'needs_review'
        });
        expect(resolveScheduledWatchExecutionOutcome({}, 'window_end')).toMatchObject({ status: 'failed' });
        expect(resolveScheduledWatchExecutionOutcome(captured, 'capture_error')).toMatchObject({ status: 'failed' });
    });

    test('C 実行結果は実行時間と予定枠を分けて session に保持する', () => {
        const { buildScheduledWatchExecutionResult } = loadScriptFunctions('../../src/background/background.js', [
            'buildScheduledWatchExecutionResult'
        ]);
        expect(buildScheduledWatchExecutionResult({
            siteId: 'aeon', scheduleIndex: 0, startedAt: '2026-09-11T01:00:00.000Z',
            scheduleWindowStart: '10:00', scheduleWindowEnd: '10:10'
        })).toMatchObject({
            startedAt: '2026-09-11T01:00:00.000Z',
            scheduledWindowStart: '10:00',
            scheduledWindowEnd: '10:10'
        });
    });

    test.each([
        ['success', '正常完了', 'window_end', '時間満了'],
        ['running', '実行中', null, '実行中'],
        ['needs_review', '要確認', null, 'テキストを確認してください。'],
        ['failed', '失敗', 'capture_error', '取得エラー']
    ])('C 実行結果カードは %s の状態・時刻・終了理由・数値を分離表示する', (status, label, endReason, endDetail) => {
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'escapeHtml',
            'getScheduledWatchExecutionPresentation',
            'formatScheduledWatchExecutionTimestamp',
            'getScheduledWatchExecutionEndDetail',
            'getScheduledWatchTextPresentation',
            'buildScheduledWatchExecutionCardMarkup'
        ], { document: htmlEscapeDocument });
        const longText = `商品A\n商品B\n商品C\n${'商品テキスト'.repeat(30)}`;
        const markup = functions.buildScheduledWatchExecutionCardMarkup({
            status,
            startedAt: '2026-09-11T01:00:00.000Z',
            endedAt: status === 'running' ? null : '2026-09-11T01:10:00.000Z',
            scheduledWindowStart: '10:00', scheduledWindowEnd: '10:10',
            endReason, decisionReason: 'テキストを確認してください。',
            matchedCount: 2, snapshotCount: 3, tickCount: 4, textPreview: longText
        });

        expect(markup).toContain(`status-${status}`);
        expect(markup).toContain(label);
        expect(markup).toContain('実行時間');
        expect(markup).toContain('予定枠');
        expect(markup).toContain('10:00 〜 10:10');
        expect(markup).toContain(`終了</span><span>${endDetail}`);
        expect(markup).toContain('セレクタ一致');
        expect(markup).toContain('2件');
        expect(markup).toContain('snapshot');
        expect(markup).toContain('3件');
        expect(markup).toContain('tick');
        expect(markup).toContain('4回');
        expect(markup).toContain('取得テキスト');
        expect(markup).toContain(longText);
        expect(markup).toContain('取得テキストを全文表示');
        expect(markup).toContain('<details');
    });

    test('C 実行結果カードは3行・360文字のプレビューと全文展開を使い、保存側の2000文字上限を維持する', () => {
        const source = fs.readFileSync(path.join(root, 'src/background/background.js'), 'utf8');
        const popupSource = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        const longText = 'a'.repeat(361);
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'escapeHtml',
            'getScheduledWatchExecutionPresentation',
            'formatScheduledWatchExecutionTimestamp',
            'getScheduledWatchExecutionEndDetail',
            'getScheduledWatchTextPresentation',
            'buildScheduledWatchExecutionCardMarkup'
        ], { document: htmlEscapeDocument });

        expect(source).toContain('.slice(0, 2000)');
        expect(popupSource).toContain('function getScheduledWatchTextPresentation(text, maxLines = 3, maxCharacters = 360)');
        expect(functions.getScheduledWatchTextPresentation('1行目\n2行目\n3行目\n4行目')).toEqual({
            fullText: '1行目\n2行目\n3行目\n4行目', preview: '1行目\n2行目\n3行目…', hasMore: true, fullLength: 15
        });
        const markup = functions.buildScheduledWatchExecutionCardMarkup({
            status: 'success', textPreview: longText
        });
        expect(markup).toContain('取得テキストを全文表示（361文字）');
        expect(markup).toContain(longText);
    });

    test.each([
        ['success', { status: 'success', decisionReason: '照合できました。' }],
        ['warning', { status: 'warning', decisionReason: '設定を確認してください。' }],
        ['failed', { status: 'failed', decisionReason: '再同期に失敗しました。' }]
    ])('C アラーム再同期結果 %s を session に保存して復元する', async (_, result) => {
        const session = {
            set: jest.fn(async () => {}),
            get: jest.fn(async () => ({ scheduledWatchResyncResult: result }))
        };
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'setScheduledWatchResyncResult',
            'getStoredScheduledWatchResyncResult'
        ], {
            chrome: { storage: { session } },
            SCHEDULED_WATCH_RESYNC_RESULT_SESSION_KEY: 'scheduledWatchResyncResult'
        });

        await expect(functions.setScheduledWatchResyncResult(result)).resolves.toBe(result);
        expect(session.set).toHaveBeenCalledWith({ scheduledWatchResyncResult: result });
        await expect(functions.getStoredScheduledWatchResyncResult()).resolves.toEqual(result);
    });

    test.each([
        ['success', [{ id: 'aeon', name: 'AEON', enabled: true, url: 'https://example.com' }], [{ name: 'dailyStockCheck_aeon' }], true],
        ['warning', [], [], true],
        ['failed', [], [], false]
    ])('C 再同期 %s の結果を応答前に session へ保存する', async (_, sites, alarms, succeeds) => {
        const session = { set: jest.fn(async () => {}) };
        const functions = loadScriptFunctions('../../src/background/background.js', [
            'buildScheduledWatchResyncResult',
            'setScheduledWatchResyncResult',
            'resyncScheduledWatchSites'
        ], {
            BASELINE_FETCH_ALARM: 'baselineFetch',
            DAILY_STOCK_CHECK_ALARM: 'dailyStockCheck',
            SCHEDULED_WATCH_RESYNC_RESULT_SESSION_KEY: 'scheduledWatchResyncResult',
            chrome: { storage: { session }, alarms: { getAll: jest.fn(async () => alarms) } },
            syncMultiSiteScheduledCheck: succeeds
                ? jest.fn(async () => {})
                : jest.fn(async () => { throw new Error('alarm create failed'); }),
            loadScheduledWatchSites: jest.fn(async () => sites),
            getScheduledWatchSitesStatus: jest.fn(async () => []),
            bgLogError: jest.fn()
        });

        const response = await functions.resyncScheduledWatchSites();
        expect(session.set).toHaveBeenCalledWith({ scheduledWatchResyncResult: response.resyncResult });
        expect(response.resyncResult.status).toBe(succeeds ? (sites.length ? 'success' : 'warning') : 'failed');
    });

    test('C アラーム再同期結果カードは状態・理由・件数・未設定対象を表示する', () => {
        const createElement = () => ({
            className: '', textContent: '', hidden: false, children: [],
            append(...nodes) { this.children.push(...nodes); },
            replaceChildren(...nodes) { this.children = [...nodes]; }
        });
        const container = createElement();
        const functions = loadScriptFunctions('../../src/ui/popup.js', [
            'resolveScheduledWatchResyncPresentation',
            'getScheduledWatchResyncVerificationItems',
            'renderScheduledWatchResyncResult'
        ], {
            elements: { scheduledWatchResyncResult: container },
            document: { createElement }
        });

        expect(functions.resolveScheduledWatchResyncPresentation('success')).toEqual({
            label: '成功', title: 'C アラームを設定・照合しました', tone: 'passed'
        });
        expect(functions.resolveScheduledWatchResyncPresentation('warning').label).toBe('要確認');
        expect(functions.resolveScheduledWatchResyncPresentation('failed').label).toBe('失敗');
        functions.renderScheduledWatchResyncResult({
            status: 'warning', decisionReason: '期待アラームを確認できませんでした。',
            activeSiteCount: 2, expectedAlarmCount: 6, configuredAlarmCount: 5,
            missingAlarms: [{ siteName: 'AEON', name: 'dailyStockCheck_aeon_1' }]
        });
        expect(container.className).toContain('status-needs-review');
        expect(container.children[0].children[0].textContent).toBe('要確認');
        expect(container.children[2].textContent).toBe('期待アラームを確認できませんでした。');
        expect(container.children[3].children.map((item) => item.children[1].textContent)).toEqual([
            'アラーム設定・照合', '未設定アラーム', '有効サイト数'
        ]);
        expect(container.children[3].children[0].children[2].textContent).toBe('期待 6件 / 設定済み 5件');
    });

    test('C 状態の初期取得時に保存済み再同期結果を復元し、未実行ならカードを隠す', async () => {
        const renderScheduledWatchSites = jest.fn();
        const renderMultipleListWatchScheduleStatus = jest.fn();
        const renderMultipleListWatchImmediateStatus = jest.fn();
        const renderScheduledWatchResyncResult = jest.fn();
        const sendScheduledWatchMessage = jest.fn()
            .mockResolvedValueOnce({
                success: true,
                sites: [{ id: 'aeon' }],
                resyncResult: { status: 'success' }
            })
            .mockResolvedValueOnce({ success: true, sites: [], resyncResult: null });
        const elements = { scheduledWatchTestSiteSelect: null };
        const { refreshScheduledWatchSites } = loadScriptFunctions('../../src/ui/popup.js', [
            'refreshScheduledWatchSites'
        ], {
            elements,
            sendScheduledWatchMessage,
            renderScheduledWatchSites,
            renderMultipleListWatchScheduleStatus,
            renderMultipleListWatchImmediateStatus,
            renderScheduledWatchResyncResult
        });

        await expect(refreshScheduledWatchSites()).resolves.toEqual([{ id: 'aeon' }]);
        expect(renderScheduledWatchResyncResult).toHaveBeenLastCalledWith({ status: 'success' });
        expect(renderMultipleListWatchScheduleStatus).toHaveBeenLastCalledWith([{ id: 'aeon' }]);
        expect(renderMultipleListWatchImmediateStatus).toHaveBeenLastCalledWith([{ id: 'aeon' }]);
        await refreshScheduledWatchSites();
        expect(renderScheduledWatchResyncResult).toHaveBeenLastCalledWith(null);
    });

    test('C状態を更新は状態取得だけで各C表示を再描画し、失敗理由を表示する', async () => {
        const popupSource = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        const sendScheduledWatchMessage = jest.fn(async () => ({
            success: true,
            sites: [{ id: 'aeon', latestExecution: { status: 'success' } }],
            resyncResult: { status: 'success' }
        }));
        const renderScheduledWatchSites = jest.fn();
        const renderMultipleListWatchScheduleStatus = jest.fn();
        const renderMultipleListWatchImmediateStatus = jest.fn();
        const renderScheduledWatchResyncResult = jest.fn();
        const showMessage = jest.fn();
        const elements = { scheduledWatchTestSiteSelect: null };
        const { refreshScheduledWatchSites } = loadScriptFunctions('../../src/ui/popup.js', [
            'refreshScheduledWatchSites'
        ], {
            elements,
            sendScheduledWatchMessage,
            renderScheduledWatchSites,
            renderMultipleListWatchScheduleStatus,
            renderMultipleListWatchImmediateStatus,
            renderScheduledWatchResyncResult
        });
        const { handleRefreshScheduledWatchSites } = loadScriptFunctions('../../src/ui/popup.js', [
            'handleRefreshScheduledWatchSites'
        ], {
            refreshScheduledWatchSitesSafely: refreshScheduledWatchSites,
            showMessage
        });

        await handleRefreshScheduledWatchSites();
        expect(sendScheduledWatchMessage).toHaveBeenCalledTimes(1);
        expect(sendScheduledWatchMessage).toHaveBeenCalledWith({ action: 'getScheduledWatchSitesStatus' });
        expect(sendScheduledWatchMessage).not.toHaveBeenCalledWith({ action: 'resyncScheduledWatchSites' });
        expect(renderScheduledWatchSites).toHaveBeenCalledWith([{ id: 'aeon', latestExecution: { status: 'success' } }]);
        expect(renderMultipleListWatchScheduleStatus).toHaveBeenCalledWith([{ id: 'aeon', latestExecution: { status: 'success' } }]);
        expect(renderMultipleListWatchImmediateStatus).toHaveBeenCalledWith([{ id: 'aeon', latestExecution: { status: 'success' } }]);
        expect(renderScheduledWatchResyncResult).toHaveBeenCalledWith({ status: 'success' });
        expect(showMessage).toHaveBeenCalledWith('C の状態を更新しました', 'success');

        sendScheduledWatchMessage.mockResolvedValueOnce({ success: false, error: 'background unavailable' });
        await handleRefreshScheduledWatchSites();
        expect(showMessage).toHaveBeenLastCalledWith('background unavailable', 'error');
        expect(popupSource).toContain("elements.refreshScheduledWatchSitesButton.addEventListener('click', handleRefreshScheduledWatchSites);");
    });

    test('C 状態は実行有無にかかわらず5秒ごとに1本だけ更新し、取得中は重複させない', () => {
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        const pollingStart = source.indexOf('function startScheduledWatchStatusPolling()');
        const pollingEnd = source.indexOf('function stopScheduledWatchTestStatusPolling()', pollingStart);
        const pollingSource = source.slice(pollingStart, pollingEnd);
        const refreshStart = source.indexOf('async function refreshScheduledWatchSitesSafely()');
        const refreshEnd = source.indexOf('function startScheduledWatchStatusPolling()', refreshStart);
        const refreshSource = source.slice(refreshStart, refreshEnd);

        expect(source).toContain('let scheduledWatchStatusPollTimer = null;');
        expect(source).toContain('let scheduledWatchStatusRefreshPromise = null;');
        expect(pollingSource).toContain('if (scheduledWatchStatusPollTimer !== null) return;');
        expect(pollingSource).toContain('}, 5000);');
        expect(pollingSource).toContain('await refreshScheduledWatchSitesSafely();');
        expect(refreshSource).toContain('if (scheduledWatchStatusRefreshPromise)');
        expect(refreshSource).toContain('return scheduledWatchStatusRefreshPromise;');
        expect(refreshSource).toContain('scheduledWatchStatusRefreshPromise = null;');
        expect(source).not.toContain('function updateScheduledWatchExecutionStatusPolling(');
    });

    test('C 状態の自動更新は表示専用で、失敗時も通知せずpagehideで停止する', () => {
        const source = fs.readFileSync(path.join(root, 'src/ui/popup.js'), 'utf8');
        const pollingStart = source.indexOf('function startScheduledWatchStatusPolling()');
        const pollingEnd = source.indexOf('function stopScheduledWatchTestStatusPolling()', pollingStart);
        const pollingSource = source.slice(pollingStart, pollingEnd);
        const pagehideStart = source.indexOf("window.addEventListener('pagehide'");
        const pagehideEnd = source.indexOf('// モード選択ボタン', pagehideStart);

        expect(pollingSource).toContain("console.warn('C 状態の自動更新に失敗:'");
        expect(pollingSource).not.toContain('showMessage(');
        expect(pollingSource).not.toContain('resyncScheduledWatchSites');
        expect(source.slice(pagehideStart, pagehideEnd)).toContain('stopScheduledWatchStatusPolling();');
        expect(source).toContain('await refreshScheduledWatchSitesSafely();\n        await refreshScheduledWatchTestStatus();');
        expect(source).toContain('startScheduledWatchStatusPolling();');
    });

    test('B の無効時でも C 同期を呼ぶ', () => {
        const source = fs.readFileSync(path.join(root, 'src/background/background.js'), 'utf8');
        const start = source.indexOf('async function syncScheduledStockCheck(');
        const end = source.indexOf('/** C の定義・実行状態', start);
        const syncSource = source.slice(start, end);
        expect(syncSource).toContain('await syncMultiSiteScheduledCheck()');
        expect(syncSource).not.toContain('logger.info("⏰ 定時差分検知アラームをクリアしました");\n      return;');
        expect(source).toContain('alarm.name.startsWith(`${DAILY_STOCK_CHECK_ALARM}_`)');
    });

    // Alfred の正本はリポジトリ外（作者環境）にあるため、無い環境ではスキップする
    const alfredDataDir = path.join(os.homedir(), 'Work/automation/_data');
    const sourcePath = path.join(alfredDataDir, 'stock_watch_snippets.src.json');
    const generatedPath = path.join(alfredDataDir, 'stock_watch_snippets.json');
    const testIfAlfredData = fs.existsSync(sourcePath) ? test : test.skip;

    testIfAlfredData('Alfred の正本と生成 JSON は C アラーム同期・状態確認を含む', () => {
        const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
        const generated = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
        expect(source.static_items.map((item) => item.id)).toEqual(expect.arrayContaining([
            'test_backup_config', 'test_restore_config', 'stock_resync_c_alarms', 'stock_c_status'
        ]));
        expect(generated.items.map((item) => item.id)).toEqual(expect.arrayContaining([
            'stock_resync_c_alarms', 'stock_c_status'
        ]));
    });
});
