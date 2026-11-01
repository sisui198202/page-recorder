# Fetch監視経路の設計ガイド

## 目的

PageRecorderでは、Fetch方式を選んでも常に同じ場所で取得するわけではない。系統A・系統Cの用途とMV3の制約に応じて取得経路を選び、監視周期・Cookie文脈・リソース消費を両立させる。

本書は、各経路の使い分けと、将来の改善で守る設計方針を示す。

## 現在の取得経路

| 系統 | 主な用途 | 実行周期 | Fetchの実行場所 | タブ | Cookie・ログイン状態 |
| --- | --- | --- | --- | --- | --- |
| A・高頻度 | 先着検知など短時間の監視 | 5〜20秒 | 監視タブのContent Script | 必要 | ページと同じ文脈を使用できる |
| A・長期 | 再入荷待ちなど長時間の監視 | 30秒以上 | Content ScriptへFetchを依頼 | 必要 | ページと同じ文脈を使用できる |
| C・定時複数サイト | 公開商品一覧の定時差分監視 | サイト設定の間隔 | Service Worker + offscreen | 通常不要 | 拡張機能として取得する |

系統Aでタブを作成する理由は、短周期タイマーと同一オリジンのページ文脈を使うためである。Fetchの安定性だけを目的にタブを作成しているわけではない。

系統CのFetchは、公開ページを低負荷で取得する経路である。Fetchが失敗し、DOM監視へのフォールバックが必要になった場合だけ監視タブを作成する。

## 設計の全体像

```text
周期制御
  短周期（5〜20秒）      Content Script のタイマー
  長期・定時（30秒以上） chrome.alarms
             │
             ▼
取得経路
  Content Script Fetch ─┐
  Service Worker Fetch ─┼─→ 判定・実行履歴・SWログ・通知・証跡保存
  DOM監視（フォールバック）┘
```

取得経路はサイト特性に応じて異なってよい。一方で、取得後に残す実行履歴、Service Workerログ、AI判断サポートファイル、通知、証跡保存の意味は共通に保つ。

## MV3と短周期監視

Manifest V3のService Workerは常駐しない。停止・再起動を前提にするため、短周期の継続タイマーをService Workerだけに依存させない。

- 5〜20秒の高頻度監視は、開いている監視タブのContent Scriptがタイマーを保持する。
- 30秒以上の長期・定時監視は、状態を`chrome.storage.local`へ保存し、`chrome.alarms`で再開できるようにする。
- `chrome.alarms`は通常30秒未満の周期を保証しない。20秒監視を系統Cのタブレス構成へ統一しない理由はここにある。

Chromeの制約は、[Service Workerライフサイクル](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) と [chrome.alarms API](https://developer.chrome.com/docs/extensions/mv2/reference/alarms) を参照する。

## 取得方式の選び方

| 条件 | 推奨経路 | 理由 |
| --- | --- | --- |
| 5〜20秒で監視したい | Content Script Fetch | Service Workerの休止に左右されず、短周期を維持しやすい |
| ログイン、地域、配送先、Cookieで結果が変わる | Content Script Fetch | 表示ページに近い認証・Cookie文脈で取得できる |
| 公開ページでCookie不要 | Service Worker Fetch | 監視タブを作らず、低負荷で取得できる |
| FetchのHTMLとDOMの判定が一致しない | DOM監視 | JavaScript描画や在庫APIなど、Fetch HTMLだけでは判定できない可能性がある |
| Fetch取得に失敗した | DOM監視へフォールバック | 監視を止めず、既存のページ監視で継続する |

取得方式診断で`FETCH_SUPPORTED`になっても、ログイン状態・SKU・地域などが異なる条件でも同じ結果になるかを確認してから、タブレスFetchを使う。

## 実行確認とログ

Fetchの実行間隔は、チェック開始時刻の差分を実測値として保存する。

- popupの「監視実行状況」で、`設定間隔`、`取得方式`、`実測間隔`を確認する。
- AI判断サポートファイルの「実行チェック履歴」で、終了後も同じ履歴を確認する。
- Service Workerログでは、各Fetch完了時に次を出力する。

```text
⏰ [Fetch実行][系統A][対象URL] 結果
  - チェック開始: 16:34:48
  - 実測間隔: 20.0秒（設定: 20秒）
  - 取得所要: 0.3秒
  - 結果: success（検知なし）
```

初回は`実測間隔: 初回`となる。Fetch失敗時も実測間隔と失敗内容を残し、リロード方式へのフォールバックを追跡できる。

## 現在の到達点と今後の方針

現在は、系統AのContent Script Fetch、系統CのタブレスFetch、Fetch失敗時のDOMフォールバック、実行履歴・AI判断サポート・Service Workerログの共通化ができている。

一方で、キーワード判定、URL差分判定、通知、証跡保存には系統A/C固有の処理が残る。今後はAをCへ一律に寄せるのではなく、各経路から返す取得結果を共通形式へ近づけ、取得後の処理を段階的に共有する。

## 関連資料

- [System Architecture](../PRD/architecture.md)
- [在庫Fetch診断 判定ガイド](在庫Fetch診断_判定ガイド.md)
- [系統A-MV3監視安定化計画](実装済/系統A-MV3監視安定化計画.md)
