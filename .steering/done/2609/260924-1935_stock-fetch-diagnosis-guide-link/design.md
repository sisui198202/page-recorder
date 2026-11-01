# 設計: 在庫Fetch診断ガイドリンク追加

`src/ui/popup.html`の一括診断説明から、`src/ui/stock-fetch-diagnosis-site-guide.html`を`target="_blank"`で開く。ビューアは同梱の`docs/在庫Fetch診断_サイト追加手順.md`を`fetch()`し、本文を`textContent`として表示する。Markdown直接遷移時のダウンロードを避け、追加権限・`web_accessible_resources`は不要。

## 承認

- [x] ユーザー依頼により承認済み（2026-09-24）
