// Content Script for DOM Mutation Detection
// F12手動変更を含む実際のDOM変更を監視

(function() {
    'use strict';

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

    // DOM変更監視の状態管理
    let mutationObserver = null;
    let isMonitoring = false;
    let currentSelector = null;
    let currentKeyword = null;
    let lastKnownState = null;
    let highFrequencyReloadTimer = null;
    let highFrequencySessionKey = null;

    console.log('Summary AutoReload Downloader Content Script loaded');

    /**
     * テキストの正規化処理
     * 空白文字（タブ・改行・スペース）を適切に処理
     */
    function normalizeText(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text
            .replace(/\s+/g, ' ')  // 連続する空白文字を単一スペースに
            .trim();               // 前後の空白を除去
    }

    // Background Scriptからのメッセージを受信
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Content Script メッセージ受信:', message);

        try {
            switch (message.action) {
                case 'startDOMWatching':
                    startDOMWatching(message.selector, message.keyword);
                    sendResponse({ success: true });
                    break;

                case 'stopDOMWatching':
                    stopDOMWatching();
                    sendResponse({ success: true });
                    break;

                case 'getCurrentDOMState':
                    const state = getCurrentDOMState(message.selector, message.keyword);
                    sendResponse(state);
                    break;

                case 'getFetchMonitorState':
                    getFetchMonitorState(message.selector, message.keyword)
                        .then(sendResponse)
                        .catch((error) => sendResponse({ fetchError: error.message }));
                    break;

                case 'startHighFrequencySession':
                    void runHighFrequencySession(message.session).catch((error) => {
                        console.warn('[Content] 高頻度Fetchセッションの開始に失敗しました:', error);
                    });
                    sendResponse({ success: true });
                    break;

                case 'stopHighFrequencySession':
                    clearTimeout(highFrequencyReloadTimer);
                    highFrequencyReloadTimer = null;
                    sendResponse({ success: true });
                    break;

                case 'simulateManualChange':
                    // テスト用: 手動変更をシミュレート
                    simulateManualChange(message.selector, message.newText);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Content Script エラー:', error);
            sendResponse({ success: false, error: error.message });
        }

        return true; // 非同期レスポンス
    });

    /**
     * DOM変更監視を開始
     */
    function startDOMWatching(selector, keyword) {
        console.log('DOM監視開始:', { selector, keyword });

        // 既存の監視を停止
        stopDOMWatching();

        currentSelector = selector;
        currentKeyword = keyword;
        isMonitoring = true;

        // 初期状態を取得
        lastKnownState = getCurrentDOMState(selector, keyword);
        console.log('初期DOM状態:', lastKnownState);

        // MutationObserverを設定
        mutationObserver = new MutationObserver((mutations) => {
            handleDOMMutations(mutations);
        });

        // 監視対象要素を取得
        const targetElement = selector ? document.querySelector(selector) : document.body;

        if (targetElement) {
            // 監視オプション設定
            const config = {
                childList: true,        // 子要素の追加・削除
                subtree: true,          // 子孫要素も監視
                characterData: true,    // テキスト変更
                attributes: false,      // 属性変更は無視（パフォーマンス向上）
                attributeOldValue: false,
                characterDataOldValue: false
            };

            mutationObserver.observe(targetElement, config);
            console.log('MutationObserver開始 - 監視対象:', targetElement);
        } else {
            console.warn('監視対象要素が見つかりません:', selector);
        }
    }

    /**
     * DOM変更監視を停止
     */
    function stopDOMWatching() {
        if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
            console.log('MutationObserver停止');
        }

        isMonitoring = false;
        currentSelector = null;
        currentKeyword = null;
        lastKnownState = null;
    }

    /**
     * DOM変更を処理
     */
    function handleDOMMutations(mutations) {
        if (!isMonitoring || !currentSelector || !currentKeyword) {
            return;
        }

        // 複数のmutationが同時に発生する場合があるため、デバウンス処理
        clearTimeout(handleDOMMutations.timeoutId);
        handleDOMMutations.timeoutId = setTimeout(() => {
            checkForKeywordChanges();
        }, 100); // 100ms後に実行
    }

    /**
     * キーワード状態の変化をチェック
     */
    function checkForKeywordChanges() {
        const currentState = getCurrentDOMState(currentSelector, currentKeyword);

        if (!lastKnownState) {
            lastKnownState = currentState;
            return;
        }

        // 状態が変化した場合
        if (lastKnownState.hasKeyword !== currentState.hasKeyword ||
            lastKnownState.text !== currentState.text) {

            console.log('DOM変更検知:', {
                previous: lastKnownState,
                current: currentState,
                selector: currentSelector,
                keyword: currentKeyword
            });

            // Background Scriptに変更を通知
            chrome.runtime.sendMessage({
                action: 'domStateChanged',
                previousState: lastKnownState,
                currentState: currentState,
                selector: currentSelector,
                keyword: currentKeyword,
                timestamp: new Date().toISOString()
            }).catch(error => {
                console.error('Background Script通知エラー:', error);
            });

            // 状態を更新
            lastKnownState = currentState;
        }
    }

    /**
     * 現在のDOM状態を取得
     */
    function getCurrentDOMState(selector, keyword) {
        if (!keyword || keyword.trim() === '') {
            return { hasKeyword: false, text: '', error: 'キーワードが未設定です' };
        }

        let targetText = '';
        let targetElement = null;

        try {
            if (!selector || selector.trim() === '') {
                // セレクタが空の場合は全体テキストを対象
                targetText = document.body.textContent || document.body.innerText || '';
                targetElement = document.body;
            } else {
                // 指定されたセレクタ内のテキストを対象
                targetElement = document.querySelector(selector);
                if (!targetElement) {
                    return { hasKeyword: false, text: '', error: 'セレクタが見つかりません', selector };
                }

                // 複数の方法でテキストを取得（F12手動変更対応）
                targetText = targetElement.textContent ||
                           targetElement.innerText ||
                           targetElement.innerHTML.replace(/<[^>]*>/g, '').trim();
            }

            // テキストの正規化処理
            const normalizedText = normalizeText(targetText);
            const hasKeyword = normalizedText.includes(keyword);

            return {
                hasKeyword: hasKeyword,
                text: normalizedText.substring(0, 200), // 正規化されたテキストの最初の200文字
                fullText: normalizedText, // 完全な正規化テキスト（キーワード比較用）
                rawText: targetText.substring(0, 200), // 元のテキスト（デバッグ用）
                error: null,
                selector: selector,
                element: targetElement ? targetElement.tagName : null,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('DOM状態取得エラー:', error);
            return {
                hasKeyword: false,
                text: '',
                error: error.message,
                selector: selector
            };
        }
    }

    async function getFetchMonitorState(selector, keyword) {
        try {
            const response = await fetch(window.location.href, {
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
            });
            if (!response.ok) {
                return { fetchError: `HTTP ${response.status}`, fetchStatus: response.status };
            }
            const html = await response.text();
            const fetchedDocument = new DOMParser().parseFromString(html, 'text/html');
            const elements = selector && selector.trim()
                ? fetchedDocument.querySelectorAll(selector)
                : [fetchedDocument.body];
            if (!elements.length) {
                return { fetchError: 'Fetch結果に監視対象セレクタが見つかりません' };
            }
            const texts = Array.from(elements).map((element) => normalizeText(element.textContent || element.innerText || ''));
            const text = texts.find((value) => value.includes(keyword || '')) || texts[0] || '';
            return {
                hasKeyword: texts.some((value) => value.includes(keyword || '')),
                text: text.substring(0, 200),
                fullText: text,
                selector,
                element: elements[0]?.tagName || null,
                fetchMode: true,
                fetchStatus: response.status
            };
        } catch (error) {
            return { fetchError: error.message || 'Fetchに失敗しました' };
        }
    }

    /**
     * 手動変更のシミュレート（テスト用）
     */
    function simulateManualChange(selector, newText) {
        console.log('手動変更シミュレート:', { selector, newText });

        const element = selector ? document.querySelector(selector) : null;
        if (element && newText) {
            // textContentを直接変更（F12での手動変更をシミュレート）
            element.textContent = newText;
            console.log('手動変更シミュレート完了:', element);
        } else {
            console.warn('シミュレート対象が見つかりません:', selector);
        }
    }

    // ページ読み込み完了時にContent Script準備完了を通知
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', notifyContentScriptReady);
    } else {
        notifyContentScriptReady();
    }

    function notifyContentScriptReady() {
        // Background Scriptがこのアクションに対応していない場合は送信しない
        // 非同期レスポンスエラーを防ぐため、送信のみ実行（レスポンス不要）
        try {
            chrome.runtime.sendMessage({
                action: 'contentScriptReady',
                url: window.location.href,
                timestamp: new Date().toISOString()
            }, (response) => {
                // レスポンスは期待しないが、エラーハンドリングのために追加
                if (chrome.runtime.lastError) {
                    // Extension contextが無効な場合は静かに無視
                    console.debug('Content Script準備完了通知: Extension context無効:', chrome.runtime.lastError.message);
                }
                if (response?.highFrequencySession) {
                    void runHighFrequencySession(response.highFrequencySession).catch((error) => {
                        console.warn('[Content] 高頻度Fetchセッションの再開に失敗しました:', error);
                    });
                }
            });
        } catch (error) {
            // Chrome拡張機能が無効・アンロードされた場合のエラーを静かに処理
            console.debug('Content Script準備完了通知: 拡張機能無効:', error.message);
        }
    }

    function getHighFrequencySessionKey(session) {
        return `${session?.id || 'unknown'}:${session?.generation ?? 'unknown'}`;
    }

    async function runHighFrequencySession(session, isFollowUp = false) {
        if (!session?.id || !session?.settings) return;
        const sessionKey = getHighFrequencySessionKey(session);
        if (!isFollowUp && highFrequencySessionKey === sessionKey) return;
        highFrequencySessionKey = sessionKey;
        if (isHighFrequencySessionExpired(session)) {
            chrome.runtime.sendMessage({
                action: 'expireHighFrequencySession',
                sessionId: session.id,
                generation: session.generation
            }, () => {
                // タブ消失・拡張再読み込み時は、期限到達後の再読込を止められればよい。
                void chrome.runtime.lastError;
            });
            return;
        }
        // 受け入れテストだけが、初回未検知後の次回ページ読込で固定テストDOMを変更する。
        // 通常セッションには testOnly 属性がないため、この経路は絶対に有効化されない。
        let testDomMutation = null;
        if (session.testOnly === 'two_tier_acceptance' &&
            session.settings.twoTierTestBehavior === 'detect_after_initial' &&
            session.initialCheckCompleted === true) {
            const target = document.querySelector(session.settings.monitorSelector);
            if (target && !target.dataset.pageRecorderTwoTierTestChanged) {
                target.dataset.pageRecorderTwoTierTestChanged = 'true';
                target.textContent = `${target.textContent || ''} ${session.settings.monitorKeyword}`;
                testDomMutation = {
                    applied: true,
                    selector: session.settings.monitorSelector,
                    keyword: session.settings.monitorKeyword
                };
            }
        }
        if (shouldHoldForTestTabManualWindow(session)) {
            await runTestTabManualWindow(session);
        }
        if (session.testOnly === 'test_tab_scenario' && session.initialCheckCompleted === true) {
            testDomMutation = applyTestTabDomMutation(
                document,
                session.settings.monitorSelector,
                session.settings.monitorKeyword,
                session.settings.twoTierTestBehavior
            );
        }
        // 次回読込は、この確認を開始した時点からの間隔で予約する。
        // 保存処理の所要時間を5秒間隔へ上乗せしないため、開始時刻を背景へ渡す。
        const checkStartedAt = Date.now();
        const state = session.settings.captureMode === 'fetch'
            ? await getFetchMonitorState(session.settings.monitorSelector, session.settings.monitorKeyword)
            : getCurrentDOMState(session.settings.monitorSelector, session.settings.monitorKeyword);
        const result = {
            ...state,
            checkStartedAt,
            testDomMutation
        };
        chrome.runtime.sendMessage({
            action: 'reportHighFrequencySessionResult',
            sessionId: session.id,
            generation: session.generation,
            result
        }, (response) => {
            if (chrome.runtime.lastError || !response?.continueMonitoring) return;
            if (session.testOnly === 'two_tier_acceptance' && session.initialCheckCompleted === false) {
                // 初回結果の応答後に、旧generationを模した報告を送る。
                // 正常セッションへ影響せず無視されることを受け入れテストで確認する。
                chrome.runtime.sendMessage({
                    action: 'reportHighFrequencySessionResult',
                    sessionId: session.id,
                    generation: session.generation - 1,
                    result
                }, () => {
                    void chrome.runtime.lastError;
                });
            }
            if (response.captureMode === 'reload') session.settings.captureMode = 'reload';
            const delay = Number(response.reloadAfterMs);
            if (Number.isFinite(delay) && delay >= 0) {
                clearTimeout(highFrequencyReloadTimer);
                highFrequencyReloadTimer = setTimeout(() => {
                    if (session.settings.captureMode === 'fetch') {
                        void runHighFrequencySession(session, true).catch((error) => {
                            console.warn('[Content] 高頻度Fetchセッションの継続に失敗しました:', error);
                        });
                    } else {
                        window.location.reload();
                    }
                }, delay);
            }
        });
    }

    function isHighFrequencySessionExpired(session, now = Date.now()) {
        return Number.isFinite(Number(session?.endsAt)) && now >= Number(session.endsAt);
    }

    // テストタブのシナリオだけが、基準取得後に一致したすべての要素の文言を変える。
    // 同じ状態のボタンが複数ある（通常とスマホ用の固定ボタンなど）サイトでも判定が変わるようにする。
    function applyTestTabDomMutation(root, selector, keyword, behavior) {
        if (behavior !== 'detect_after_initial' && behavior !== 'disappear_after_initial') return null;
        let targets = [];
        try {
            targets = [...root.querySelectorAll(selector)];
        } catch (_) {
            targets = [];
        }
        const changed = targets.filter((target) => !target.dataset.pageRecorderTestTabChanged);
        changed.forEach((target) => {
            target.dataset.pageRecorderTestTabChanged = 'true';
            target.textContent = behavior === 'disappear_after_initial'
                ? (target.textContent || '').split(keyword).join('')
                : `${target.textContent || ''} ${keyword}`;
        });
        return { applied: changed.length > 0, selector, keyword, count: changed.length };
    }

    function shouldHoldForTestTabManualWindow(session) {
        return session?.testOnly === 'test_tab_scenario' &&
            session?.settings?.twoTierTestBehavior === 'manual_after_initial' &&
            session?.initialCheckCompleted === true &&
            session?.manualWindowCompleted !== true;
    }

    // 手動モードでは、基準取得後の最初の読み込みで確認を20秒止め、DevTools での変更を受け付ける。
    // 受付状況は Service Worker のログへ出すため、背景へ段階ごとに通知する。
    async function runTestTabManualWindow(session) {
        const notify = (phase, remainingSeconds) => new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'reportTestTabManualWindow',
                sessionId: session.id,
                generation: session.generation,
                phase,
                remainingSeconds
            }, () => {
                void chrome.runtime.lastError;
                resolve();
            });
        });
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        await notify('start', 20);
        await wait(10000);
        await notify('progress', 10);
        await wait(5000);
        await notify('progress', 5);
        await wait(5000);
        await notify('end', 0);
        session.manualWindowCompleted = true;
    }

})();
