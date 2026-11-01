#!/usr/bin/env node

const http = require('node:http');

const port = Number.parseInt(process.env.PORT || '4173', 10);
const detailPathPattern = /^\/sevennet\/detail\/([^/]+)\.html$/;

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function resolveOutOfStockLabel(productId, searchParams) {
    if (searchParams.get('out') === 'unavailable' || productId === '1000000003') {
        return '在庫なし';
    }
    return '予約受付終了';
}

function renderProductPage(productId, searchParams) {
    const inStock = searchParams.get('stock') === 'in';
    const buttonLabel = inStock
        ? 'カートに入れる'
        : resolveOutOfStockLabel(productId, searchParams);
    const disabled = inStock ? '' : ' disabled';
    const stateLabel = inStock ? '在庫あり' : buttonLabel;
    const safeId = escapeHtml(productId);

    return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>偽セブンネット商品 ${safeId}</title>
  <style>
    body { margin: 0; background: #f6f6f6; color: #222; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", sans-serif; }
    main { max-width: 760px; margin: 48px auto; padding: 32px; background: #fff; border: 1px solid #ddd; }
    .p-ctaBtns { display: flex; gap: 16px; align-items: center; margin-top: 32px; }
    .c-btnCartin { min-width: 260px; padding: 14px 24px; border: 0; border-radius: 4px; background: #e60012; color: #fff; font-size: 18px; cursor: pointer; }
    .c-btnCartin:disabled { background: #8a8a8a; cursor: not-allowed; }
    .test-only { color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <p class="test-only">テスト専用・外部通信なし</p>
    <h1 class="p-productName">偽セブンネット商品 ${safeId}</h1>
    <p>状態: ${stateLabel}</p>
    <div class="js-btn-wrapper-fix-bottom-trigger">
      <div class="p-ctaBtns js-btn-wrapper-fix-bottom-content">
        <div class="p-ctaBtns__select">
          <select class="c-selectCount quantity-select form-control" aria-label="数量">
            <option value="1" selected>1</option>
          </select>
        </div>
        <div class="p-ctaBtns__cart js-ctaBtns__cart">
          <div class="cart-and-ipay">
            <input type="hidden" class="add-to-cart-url" value="">
            <button type="button" class="add-to-cart c-btnCartin js-add-to-cart" data-pid="${safeId}" data-url=""${disabled}>${buttonLabel}</button>
          </div>
        </div>
      </div>
    </div>
  </main>
  <script>
    document.querySelector('.js-add-to-cart').addEventListener('click', (event) => event.preventDefault());
  </script>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const match = url.pathname.match(detailPathPattern);
    if (!match || request.method !== 'GET') {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
    }

    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(renderProductPage(decodeURIComponent(match[1]), url.searchParams));
});

if (require.main === module) {
    server.on('error', (error) => {
        process.stderr.write(`Fake Sevennet EC を起動できませんでした: ${error.message}\n`);
        process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
        process.stdout.write(`Fake Sevennet EC: http://localhost:${port}/sevennet/detail/1000000001.html?stock=in\n`);
    });
}

module.exports = { renderProductPage, resolveOutOfStockLabel, server };
