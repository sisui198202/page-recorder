const { loadScriptFunctions } = require('../helpers/load-source-functions');

describe('popupのService Worker初期化', () => {
    test('設定取得要求を直接送り、短い事前疎通テストを実行しない', async () => {
        const sendMessage = jest.fn((message, callback) => {
            if (message.action === 'getConfigManager') {
                callback({ success: true, configManager: 'available' });
                return;
            }
            if (message.action === 'loadConfig') {
                callback({ success: true, config: {} });
            }
        });
        const chrome = { runtime: { sendMessage, lastError: null } };
        const { getConfigManagerFromBackground } = loadScriptFunctions(
            '../../src/ui/popup.js',
            ['getConfigManagerFromBackground'],
            { chrome, getFallbackConfigManager: jest.fn() }
        );

        const manager = await getConfigManagerFromBackground();

        expect(sendMessage).toHaveBeenCalledWith({ action: 'getConfigManager' }, expect.any(Function));
        expect(sendMessage).not.toHaveBeenCalledWith({ action: 'serviceWorkerTest' }, expect.any(Function));
        await expect(manager.loadConfig()).resolves.toEqual({ success: true, config: {} });
    });
});
