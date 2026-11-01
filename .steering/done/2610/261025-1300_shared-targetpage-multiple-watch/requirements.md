# requirements

## 目的

Popup の本番「複数URL監視」で、共有 targetpage から商品を選択して監視対象へ追加できるようにする。

## 背景

`buy-target-config/sites/{siteId}/urls.yaml` を同期して配布する `src/config/page-recorder-targetpages.json` は、単一URL監視ではすでに利用している。複数URL監視でも同じ正本を使えば、URL・在庫監視条件・通知先を手入力せず選択できる。

## 受け入れ条件

- 複数URL監視で環境・サイト・商品を選び、共有 targetpage を監視リストへ追加できる。
- 追加対象はURL、セレクタ、キーワード、検知モード、外部拡張通知プロファイルを引き継ぐ。
- すでに監視リストにあるURLは候補に表示せず、二重監視を防ぐ。
- サイト選択は手入力追加用と共有 targetpage 用で共通の1つだけを表示する。
- 共通サイト選択が未選択なら、共有 targetpage の商品候補は全サイト分を表示する。
- 共通サイトを選ぶと、共有 targetpage の商品候補も同じサイトに絞り込む。
- Popup再表示時は、保存済みの共通サイト選択を復元した後の条件で共有 targetpage 商品候補を表示する。
- 共有 targetpage の商品候補は、在庫あり・在庫なしを分けた見出し付きグループで表示する。
- 既存の手入力追加、既存対象、実行中監視、共通設定を壊さない。
- Sevennet の2商品を追加し、通常の複数URL監視を開始できることを手動確認する。

## 起点

- 所有リポジトリ: `PageRecorder`
- 起点台帳: `plan/todo.md` の「共有 targetpage をpopupの本番複数URL監視へ商品単位で追加」と「複数URL監視のサイト選択を統合」の2項目
- 正本: `buy-target-config/sites/{siteId}/urls.yaml`
- 配布コピー: `src/config/page-recorder-targetpages.json`
- UI: `src/ui/popup.html` / `src/ui/popup.js`
