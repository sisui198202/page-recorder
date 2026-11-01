# requirements.md

## 目的

test / prod の個別商品 targetpage を共有正本から PageRecorder に安全に配布し、在庫検知を AutoCartAgent の既存自動カート導線へ接続する。

## 背景

旧 `feature/targetpage-profiles` は targetpage の popup 選択と設定ファイルの試作までで停止しており、共有同期・外部通知・受信側実装・検証が未完了である。現在の `main` には同名の配布設定が存在するため、旧ブランチを直接マージせず、現行実装を基準に不足機能を完成させる。

## プロダクト概要

- 解決する課題: 環境別の個別商品監視設定を一元管理し、検知結果を安全に自動カートへ渡せない。
- 対象ユーザー: PageRecorder と AutoCartAgent を用いて個別商品を監視する利用者。
- 成功指標: test targetpage に対する検知から、許可済み AutoCartAgent の handler 起動までを手動確認できる。

## ユーザーストーリー

- 監視利用者として、test / prod の個別商品 targetpage を共有正本で管理し、各拡張に配布したい。
- 監視利用者として、PageRecorder が検知した商品 URL を対象サイトの既存自動カート導線へ安全に渡したい。

## 機能要件

1. shared の正本から、入力検証済み targetpage 設定を PageRecorder の配布先へ同期できる。
2. targetpage は環境、ID、サイトID、商品URL、在庫判定条件、通知先を持つ。
3. PageRecorder は個別商品検知時、既存 `PAGE_RECORDER_STOCK_DETECTED` の既存フィールドを変えずに target ID・環境・イベント識別情報を追加する。
4. AutoCartAgent は許可済みの PageRecorder だけから通知を受け、payload と URL を検証後に既存 handler を起動する。
5. 送信失敗、設定不備、不正送信元、不正 payload、重複通知は監視または既存自動カート処理を不安全に開始・停止させず、原因を記録する。

## 受け入れ条件

- [x] 同期の dry-run と本実行で、妥当な設定だけを PageRecorder 配布先へ反映できる。
- [x] test / prod の個別商品設定を PageRecorder で選択・実行できる。
- [x] 通知は既存互換を保ち、target ID・環境・重複判定用イベントIDを含む。
- [x] AutoCartAgent は送信元・payload・URLを検証し、許可済み通知だけで既存 handler を起動する。
- [x] 不正送信元、不正 payload、重複通知、通知／タブ作成失敗で自動カートを開始しない。
- [x] 自動テストと test targetpage の手動 E2E を実施する。

## スコープ外

- キーワード検索・一覧ページからの商品 URL 抽出。
- PageRecorder による購入・認証・決済処理。
- 認証情報、決済情報、テスト用アカウント情報の shared 管理。

## 制約事項

- PageRecorder は実行時に shared を直接読まず、同期済みの拡張内設定だけを読む。
- 既存通知のフィールド名・型を変更しない。
- 既存の監視、保存、通知の挙動を回帰させない。
- AutoCartAgent と shared は別リポジトリのため、編集前に各リポジトリの状態とローカルルールを確認する。

## 承認

- [x] ユーザー承認済み（2026-10-14: 最新 main を起点に案内した連携実装を実施するよう指示）
