# 設計: ログ重複抑止の分類定義

## 方針

文言だけをキーにする暗黙的な重複抑止を廃止する。通常の `bgLogInfo` と `bgLogDebug` は、既存のログレベル判定だけを行い、重複抑止しない。抑止が必要な周期進捗・調査詳細だけを、専用ヘルパーで明示して出力する。

## ログ分類と抑止方針

| 分類 | 代表例 | 抑止 |
| --- | --- | --- |
| 終端・結果 | 検知、停止完了、保存完了、通知結果 | しない |
| 操作・設定 | 監視開始・停止、設定保存、アラーム登録 | しない |
| 周期進捗 | 周期リロード、定時監視Tick、周期リロード中のcontentScriptReady | 同一イベント・同一対象だけ5秒間抑止 |
| 調査詳細 | 繰返しDOM状態、内部リトライ状態 | 専用ヘルパーを使う場合だけ同じ方式で抑止 |

WARN / ERROR は現在どおり常に出力する。抑止は可読性のための表示制御だけであり、監視状態・保存・通知などの処理には影響させない。

## 内部インターフェース

- `shouldSuppressLog(entry, now?)` は、`level`、`category`、`event`、`scope` を受け取る。
- `scope` は `sessionId`、`tabId`、`siteId`、`scheduleIndex` などの識別子だけを持つオブジェクトとし、キー生成時にプロパティ名をソートして安定化する。
- `category` が `progress` または `diagnostic` 以外、`event` または有効な `scope` がない場合は抑止しない。
- `bgLogProgress(message, { event, scope, details })` と `bgLogDiagnostic(message, { event, scope, details })` を追加する。`details` は抑止キーに含めず、実際に表示する補足情報だけに使う。
- `bgLogInfo` と `bgLogDebug` の既存呼び出し形式は維持し、暗黙の抑止を行わない。

抑止キーは `level + category + event + 安定化したscope` とする。TTLは既存と同じ5秒とし、異なるsessionId / tabId / siteId / scheduleIndexを同一イベントとして扱わない。

## 既存呼び出しの移行範囲

明確に周期実行である次のログだけを専用ヘルパーへ移行する。

- `runPeriodicReload()` の開始・DOM準備完了
- 定時監視の `Tick実行`
- 周期リロード中の `contentScriptReady` 受信

`🛑 系統Aセッション停止完了`、検知、保存完了、通知結果、設定保存、手動操作ログは通常ログのままとし、抑止対象にしない。DOM待機などの既存DEBUGログは本タスクでは文言整理せず、必要時に明示的な `bgLogDiagnostic` へ移行できる状態だけを作る。

## テスト方針

- 純粋関数テストで、終端・結果・操作・設定が抑止されないことを確認する。
- 同じ `event` と同じ `scope` の周期進捗だけが5秒以内に抑止されることを確認する。
- `scope` が異なる場合、同じイベントでも抑止されないことを確認する。
- WARN / ERRORが抑止されないことを確認する。
- Aの2 URL同時検知で異なるsessionIdの停止完了ログが各1件出ることを、既存情報設計改善タスクの手動確認で確認する。

## 変更対象

- `src/background/background.js`
- `tests/unit/background-functions.test.js`
- `.claude/rules/logging.md`
- `docs/ログ表記ガイド.md`
