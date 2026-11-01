const { renderProductPage } = require('../fake-ec/server');

describe('偽セブンネット商品ページ', () => {
    test('在庫ありは本物と同じカートボタンのクラス・文言でdisabledを付けない', () => {
        const html = renderProductPage('1000000001', new URLSearchParams('stock=in'));

        expect(html).toContain('class="add-to-cart c-btnCartin js-add-to-cart"');
        expect(html).toContain('>カートに入れる</button>');
        expect(html).not.toContain('js-add-to-cart" data-pid="1000000001" data-url="" disabled');
    });

    test('在庫なしはdisabled付きで、予約受付終了と在庫なしの両方を返せる', () => {
        const reservationHtml = renderProductPage('1000000002', new URLSearchParams('stock=out'));
        const unavailableHtml = renderProductPage('1000000003', new URLSearchParams('stock=out'));

        expect(reservationHtml).toContain('js-add-to-cart" data-pid="1000000002" data-url="" disabled>予約受付終了</button>');
        expect(unavailableHtml).toContain('js-add-to-cart" data-pid="1000000003" data-url="" disabled>在庫なし</button>');
    });

    test('カートボタンはフォーム送信せず、クリックもpreventDefaultする', () => {
        const html = renderProductPage('1000000001', new URLSearchParams('stock=in'));

        expect(html).toContain('<button type="button"');
        expect(html).toContain("addEventListener('click', (event) => event.preventDefault())");
        expect(html).not.toContain('<form');
    });
});
