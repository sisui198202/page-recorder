// Blob URL を管理するマップ（後で revoke 用）
const blobUrlMap = new Map();

function analyzeStockHtml(html, selector, keyword) {
    const normalizedSelector = String(selector || '').trim();
    const normalizedKeyword = String(keyword || '').trim();
    if (!normalizedSelector) {
        return {
            matchCount: 0,
            keywordMatchCount: 0,
            hasKeyword: false,
            error: { code: 'MISSING_SELECTOR', message: '監視対象セレクタが未指定です' }
        };
    }

    try {
        const document = new DOMParser().parseFromString(String(html || ''), 'text/html');
        const elements = Array.from(document.querySelectorAll(normalizedSelector));
        const keywordMatchCount = normalizedKeyword
            ? elements.filter((element) =>
                String(element.textContent || '').replace(/\s+/g, ' ').includes(normalizedKeyword)
            ).length
            : 0;

        return {
            matchCount: elements.length,
            keywordMatchCount,
            hasKeyword: keywordMatchCount > 0,
            error: null
        };
    } catch (error) {
        return {
            matchCount: 0,
            keywordMatchCount: 0,
            hasKeyword: false,
            error: { code: 'INVALID_SELECTOR', message: error.message }
        };
    }
}

function analyzeStockHtmlPair({ fetchHtml, outerHtml, selector, keyword } = {}) {
    return {
        fetch: analyzeStockHtml(fetchHtml, selector, keyword),
        dom: analyzeStockHtml(outerHtml, selector, keyword)
    };
}

/**
 * HTML から商品URLを抽出する（Fetch監視用）
 * @param {string} html - 解析対象のHTML文字列
 * @param {string} selector - 商品リンク要素のセレクタ
 * @param {string} baseUrl - 相対URLを解決するためのベースURL
 * @returns {Object} 抽出結果
 */
function extractProductUrls(html, selector, baseUrl) {
    const normalizedSelector = String(selector || '').trim();
    if (!normalizedSelector) {
        return {
            urls: [],
            count: 0,
            error: { code: 'MISSING_SELECTOR', message: '商品セレクタが未指定です' }
        };
    }

    try {
        const document = new DOMParser().parseFromString(String(html || ''), 'text/html');
        const elements = Array.from(document.querySelectorAll(normalizedSelector));
        const urls = [];

        for (const element of elements) {
            let href = null;
            // 要素自体が <a> の場合
            if (element.tagName === 'A') {
                href = element.getAttribute('href');
            } else {
                // 子孫に <a> がある場合
                const anchor = element.querySelector('a');
                if (anchor) {
                    href = anchor.getAttribute('href');
                }
            }

            if (href) {
                // 相対URLを絶対URLに変換
                try {
                    const absoluteUrl = new URL(href, baseUrl).href;
                    urls.push(absoluteUrl);
                } catch {
                    // 無効なURLはスキップ
                }
            }
        }

        return {
            urls,
            count: urls.length,
            usedSelector: normalizedSelector,
            error: null
        };
    } catch (error) {
        return {
            urls: [],
            count: 0,
            error: { code: 'PARSE_ERROR', message: error.message }
        };
    }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.target !== 'offscreen') {
        return false;
    }

    if (message?.type === 'OFFSCREEN_ANALYZE_STOCK_HTML') {
        try {
            sendResponse({
                success: true,
                analysis: analyzeStockHtmlPair(message.payload)
            });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }

    // Fetch監視用: HTML から商品URLを抽出
    if (message?.type === 'OFFSCREEN_EXTRACT_PRODUCT_URLS') {
        try {
            const { html, selector, baseUrl } = message.payload || {};
            const result = extractProductUrls(html, selector, baseUrl);
            sendResponse({
                success: true,
                extraction: result
            });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }

    // Blob URL 生成リクエスト
    if (message?.type === 'OFFSCREEN_CREATE_BLOB_URL') {
        (async () => {
            let objectUrl = null;
            try {
                if (message.dataUrl) {
                    const response = await fetch(message.dataUrl);
                    const blob = await response.blob();
                    objectUrl = URL.createObjectURL(blob);
                } else if (message.textContent != null) {
                    const blob = new Blob([message.textContent], {
                        type: message.mimeType || 'text/plain;charset=utf-8'
                    });
                    objectUrl = URL.createObjectURL(blob);
                } else {
                    throw new Error('download content is empty');
                }

                // URL を管理マップに登録（5秒後に自動 revoke）
                blobUrlMap.set(objectUrl, Date.now());
                setTimeout(() => {
                    if (blobUrlMap.has(objectUrl)) {
                        URL.revokeObjectURL(objectUrl);
                        blobUrlMap.delete(objectUrl);
                    }
                }, 5000);

                sendResponse({ success: true, blobUrl: objectUrl });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();

        return true;
    }

    // Blob URL revoke リクエスト
    if (message?.type === 'OFFSCREEN_REVOKE_BLOB_URL') {
        const { blobUrl } = message;
        if (blobUrl && blobUrlMap.has(blobUrl)) {
            URL.revokeObjectURL(blobUrl);
            blobUrlMap.delete(blobUrl);
        }
        sendResponse({ success: true });
        return true;
    }

    return false;
});
