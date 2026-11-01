const fs = require('fs');
const path = require('path');

describe('在庫Fetch診断のサイト追加手順リンク', () => {
    const root = path.resolve(__dirname, '../..');

    test('popupはMarkdownビューアを別タブで開く', () => {
        const popup = fs.readFileSync(path.join(root, 'src/ui/popup.html'), 'utf8');

        expect(popup).toContain('href="stock-fetch-diagnosis-site-guide.html"');
        expect(popup).toContain('target="_blank"');
    });

    test('ビューアは同梱の手順書を読み込み表示する', () => {
        const html = fs.readFileSync(path.join(root, 'src/ui/stock-fetch-diagnosis-site-guide.html'), 'utf8');
        const script = fs.readFileSync(path.join(root, 'src/ui/stock-fetch-diagnosis-site-guide.js'), 'utf8');

        expect(html).toContain('id="guideContent"');
        expect(html).toContain('stock-fetch-diagnosis-site-guide.js');
        expect(script).toContain("fetch('../../docs/在庫Fetch診断_サイト追加手順.md')");
    });
});
