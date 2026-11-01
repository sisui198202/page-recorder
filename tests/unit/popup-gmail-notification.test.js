const { loadScriptFunctions } = require('../helpers/load-source-functions');

function loadPopupGmailFunctions(overrides = {}) {
    const storage = {
        gmailNotificationSettings: { enabled: true, recipientEmail: 'saved@example.com' },
        gmailNotificationLastResult: { status: 'success', message: 'Gmail を送信しました' }
    };
    const elements = {
        gmailNotificationEnabled: { checked: false },
        gmailNotificationRecipient: { value: '' },
        gmailNotificationResult: { textContent: '', style: {} },
        sendGmailTestEmailButton: { disabled: false }
    };
    const chrome = {
        storage: {
            local: {
                get: jest.fn(async (keys) => Object.fromEntries(keys.map((key) => [key, storage[key]]))),
                set: jest.fn(async (values) => Object.assign(storage, values))
            }
        },
        runtime: {
            lastError: null,
            sendMessage: jest.fn((_message, callback) => callback({ success: true, status: 'success', message: 'Gmail を送信しました' }))
        }
    };
    const functions = loadScriptFunctions('../../src/ui/popup.js', [
        'normalizePopupGmailNotificationSettings',
        'getGmailNotificationResultText',
        'renderGmailNotificationResult',
        'loadGmailNotificationSettingsForPopup',
        'saveGmailNotificationSettingsFromPopup',
        'sendGmailTestEmailFromPopup'
    ], {
        chrome,
        elements,
        GMAIL_NOTIFICATION_SETTINGS_KEY: 'gmailNotificationSettings',
        GMAIL_NOTIFICATION_LAST_RESULT_KEY: 'gmailNotificationLastResult',
        ...overrides
    });
    return { functions, elements, chrome, storage };
}

describe('popup Gmail 通知設定', () => {
    test('未保存値を無効・空送信先に正規化する', () => {
        const { functions } = loadPopupGmailFunctions();
        expect(functions.normalizePopupGmailNotificationSettings()).toEqual({ enabled: false, recipientEmail: '' });
    });

    test('保存済み設定と直近成功結果を復元する', async () => {
        const { functions, elements } = loadPopupGmailFunctions();
        await functions.loadGmailNotificationSettingsForPopup();
        expect(elements.gmailNotificationEnabled.checked).toBe(true);
        expect(elements.gmailNotificationRecipient.value).toBe('saved@example.com');
        expect(elements.gmailNotificationResult.textContent).toContain('送信成功');
    });

    test('設定変更を local storage に保存する', async () => {
        const { functions, elements, storage } = loadPopupGmailFunctions();
        elements.gmailNotificationEnabled.checked = true;
        elements.gmailNotificationRecipient.value = ' next@example.com ';
        await functions.saveGmailNotificationSettingsFromPopup();
        expect(storage.gmailNotificationSettings).toEqual({ enabled: true, recipientEmail: 'next@example.com' });
    });

    test('テスト送信中はボタンを無効化し、background 応答を結果表示する', async () => {
        let resolveResponse;
        const { functions, elements, chrome } = loadPopupGmailFunctions();
        chrome.runtime.sendMessage.mockImplementation((_message, callback) => {
            resolveResponse = () => callback({ success: false, status: 'auth_required', message: '認証が必要です' });
        });
        const pending = functions.sendGmailTestEmailFromPopup();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(elements.sendGmailTestEmailButton.disabled).toBe(true);
        expect(elements.gmailNotificationResult.textContent).toBe('テストメールを送信中...');
        resolveResponse();
        const result = await pending;
        expect(result.status).toBe('auth_required');
        expect(elements.sendGmailTestEmailButton.disabled).toBe(false);
        expect(elements.gmailNotificationResult.textContent).toContain('認証が必要です');
    });
});
