# Glossary - PageRecorder

## 概要

本ドキュメントでは、`PageRecorder` で継続的に参照する技術用語とプロジェクト固有用語を定義する。

---

## 購入フロー関連

### 情報収集フェーズ

購入フローの第1フェーズ。入荷時間帯、在庫状態、商品 URL の変化を把握する段階。`PageRecorder` が担当する。

### パターンC

傾向予測ありかつ商品 URL が既知の運用。商品ページ監視と証跡保存が中心。

### パターンD

傾向予測ありだが商品 URL が未確定の運用。一覧差分から新商品 URL を抽出する。

### パターンI

複数サイトや複数商品を並行監視したい運用。複数サイト定時在庫監視が中心。

---

## Chrome Extension 関連

### Manifest V3 (MV3)

Chrome 拡張の現行標準仕様。Service Worker 前提で動作する。

### Service Worker

background 処理を担うイベント駆動スクリプト。永続プロセスではない。

### Content Script

Web ページ内で実行されるスクリプト。レガシー単一監視で DOM 取得に使う。

### Popup UI

拡張アイコンから開く操作画面。single / multiple / EC 監視 UI / テストタブを含む。

### Offscreen Document

MV3 制約下で Blob 保存補助などを行うための隠しドキュメント。`src/offscreen/` で実装する。

### External Messaging

`chrome.runtime.sendMessage(extensionId, ...)` を使って他拡張へ通知する方式。

### chrome.alarms

Chrome 拡張の定時実行 API。現行の主運用フローである定時在庫監視に使う。

### chrome.storage.local

拡張ローカル領域の保存先。監視設定、監視状態、補助データを保持する。

---

## 監視関連

### 系統A

single / multiple 監視で、対象ページのキーワード出現・消失を判定する監視系統。主に `startMonitoring` と Content Script による DOM 状態取得を使う。

### 系統B

popup の単一監視設定を基に、1サイトを `chrome.alarms` で定時在庫監視する系統。単一の監視セッションを管理する。

### 系統C

`scheduled-watch-sites.json` のサイト定義を基に、複数サイトを `chrome.alarms` で定時在庫監視する系統。サイトごとの監視セッションとスケジュールを管理する。

### Cアラーム再同期

系統Cのサイト定義を読み直し、Chrome に登録する定時実行アラームを設定どおりに作り直す操作。監視を即時実行したり、`scheduled-watch-sites.json` の内容を変更したりはしない。

### single 監視

1件の監視設定を中心に扱うモード。active tab または指定 URL を対象にする。

### multiple 監視

複数件の監視設定を一覧で管理するモード。各設定を個別に有効化できる。

### 定時在庫監視

`chrome.alarms` で定刻実行し、在庫状態や一覧差分を判定する監視方式。現行の主運用。

### EC 監視 UI

`ec-sites.json` のサイト定義を popup で利用し、監視条件補完や URL 登録を支援する UI。

### baseline

比較基準として事前保存する在庫状態や一覧状態。後続の差分検知に使う。

### 新商品 URL 自動取得

一覧ページの差分から、新たに出現した商品 URL のみを抽出する機能。

### 出現検知

キーワードが未存在から存在へ変化した状態を検知するモード。

### 消失検知

キーワードが存在から未存在へ変化した状態を検知するモード。

### 即座取得

その時点のページから HTML とスクリーンショットを即時保存する操作。

### 即座検知

監視開始時にその場でキーワード状態を確認する動作。

---

## 設定・保存関連

### monitoring_config

single / multiple 監視の中心設定。監視対象、セレクタ、キーワード、通知先などを含む。

### monitoring_state

現在の監視状態。実行中フラグ、最終実行時刻、エラー状態などを含む。

### scheduled-watch-sites.json

複数サイト定時監視の同梱設定ファイル。サイト単位の schedules、baseline、通知設定などを持つ。

### ec-sites.json

EC 監視 UI 用のサイト定義ファイル。popup の自動補完やサイト選択に使う。

### externalExtensionId

検知結果の送信先となる Chrome 拡張 ID。

### single_config_backup

テストタブ適用前の single 設定を一時退避する保存領域。復元操作に使う。

---

## テスト・運用関連

### Jest

ユニットテストに使うテストフレームワーク。

### jest-chrome

Chrome 拡張 API を Jest 上で扱うためのモックライブラリ。

### 手動回帰確認

`tests/docs/` の手順書に従って、Chrome 実機で監視・通知・保存導線を確認する運用。

### 回帰

今回の変更によって、以前は動いていた機能が壊れていないかを再確認する、という意味。

### branch棚卸し

`git branch --merged main` などで main へ反映済みのブランチを確認し、`main`・`master`・現在のブランチを除外したうえで、main 反映と push を確認できたブランチだけを安全に削除する運用。未反映ブランチは即時削除しない。

### 未完了タスクの中間コミット

単一目的で確認済みかつ revert 可能な完了済み差分を保全するコミット。タスク close や `main` マージの許可を意味せず、停止地点・未完了項目・再開時の確認事項を残す。

### logger / bgLog\*

background 側の標準ログ出力経路。新規ログ追加時はこれらを優先する。

### オートモード (auto mode)

Claude Code の権限モードの一つ。ツール実行ごとの許可確認を省き、危険な操作だけを分類器が自動でブロックする。`Shift+Tab` で切り替える。確認を省くだけで、ブランチ運用や承認ゲートなどのルールは引き続き適用される。

---

## 一般用語

### CSS セレクタ

DOM 要素を指定する記法。監視対象範囲の指定に使う。

### DOM

HTML 文書構造を表すオブジェクトモデル。

### YAGNI

今必要でないものを先回りで作らない原則。
