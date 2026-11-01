# 個別商品 targetpage 共有・自動カート連携再開計画

## 方針

旧 `feature/targetpage-profiles` はマージせず、最新 `main` に存在する `src/config/page-recorder-targetpages.json` を配布設定の出発点として利用する。共有正本・同期、PageRecorder の検知通知拡張、AutoCartAgent の安全な外部受信を新規タスクで完成させる。

## 背景

旧ブランチは popup の targetpage 選択までを実装したが、共有同期、通知契約、AutoCartAgent 受信、テスト、E2E が未完了であり、現行 `main` と設定ファイルが重複する。

## 実施順序

1. `shared` の正本と検証付き同期を定義する。
2. PageRecorder が個別商品検知時に追加互換の通知を送る。
3. AutoCartAgent が許可済み送信元の通知だけを検証・処理する。
4. 自動テストと test targetpage の手動 E2E を実施する。

## 旧ブランチの扱い

`feature/targetpage-profiles` は未反映ブランチとして保留する。内容は設計上の参照に限定し、直接マージしない。
