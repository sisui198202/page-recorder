# design.md

## 概要

系統Aの監視を `monitoringMode` で明示的に分ける。高頻度セッションは対象タブの Content Script を時計とし、長期監視は `chrome.alarms` を時計とする。判定、保存、通知、外部拡張連携はbackgroundの共通処理へ集約する。

本書はrequirements承認後の設計案であり、ユーザー承認後に `tasks.md` を具体化する。

## モードと入力制約

| `monitoringMode` | 用途                   | 実行者          | 監視時間 | 確認間隔    |
| ---------------- | ---------------------- | --------------- | -------- | ----------- |
| `high_frequency` | 先着検知・自動購入連携 | Content Script  | 1〜60分  | 5〜20秒程度 |
| `long_running`   | 再入荷待ち             | `chrome.alarms` | 30分〜8時間 | 30秒以上    |

- popupの単一監視・複数監視にモード選択を追加し、選択中モードに合わない監視時間・間隔は開始できないようにする。
- モード未指定の既存設定は `high_frequency` として正規化し、既存の短間隔運用を維持する。
- 長期監視で30秒周期を利用するため、`manifest.json` に `minimum_chrome_version: "120"` を設定する。

## セッションと保存

- 監視設定の正本は既存 `monitoring_config` を維持し、各設定へ `monitoringMode` を追加する。
- 実行中の系統Aセッションは、新しい `chrome.storage.local` キー `singleMonitoringSessions` に保存する。セッションIDをキーとし、`tabId`、設定のスナップショット、`startedAt`、`endsAt`、`active`、`alarmName`、`generation`、実行リースを保持する。
- 開始時は「セッション保存 → 実行者の開始」の順にする。停止・検知完了・期限切れ・対象タブ消失では、`active: false` を保存してからタイマーまたはアラームを解除する。
- browser再起動などで保存済み `tabId` が存在しない場合は、対象タブを新規に開かず、当該セッションを停止する。ユーザーが明示的に開始したタブだけを監視対象とする。

## 高頻度セッション

1. backgroundは対象タブを確定し、セッションを保存してからContent Scriptへ開始を通知する。
2. Content Scriptはページ読込時に自身の `tabId` のアクティブセッションを問い合わせ、`endsAt` を過ぎていなければDOMを確認してbackgroundへ結果を送る。
3. backgroundは共通の判定・baseline保存・通知・停止処理を実行する。継続する場合だけContent Scriptが次回時刻にページを再読み込みする。
4. 再読み込み後はContent Scriptが再注入され、保存済みセッションから再開する。対象タブの終了、Chrome終了、端末スリープ、タブ破棄時は継続を保証しない。

Content ScriptはDOM状態の収集と次回再読み込みだけを担い、検知結果の意味付けや外部通知を持たない。

## 長期監視

1. backgroundは対象タブと保存済みセッションに、系統A専用の一意なアラーム名を割り当てる。系統B/Cのアラーム命名規則には触れない。
2. `chrome.alarms.onAlarm` はアラーム名からセッションを取得し、`active`、`endsAt`、`generation`、実行リースを確認してから対象タブを再読み込み・確認する。
3. 確認中は期限付き実行リースで重複実行を防ぐ。正常・異常のどちらでもfinally相当の処理でリースを解除する。期限切れリースは次の発火で回収できるようにする。
4. Service Worker初期化時と `chrome.runtime.onStartup` 時に、アクティブな長期セッションと実在アラームを照合する。アラームがなければ再作成し、期限切れ・停止済み・タブ不在のセッションは停止・削除する。

アラームは正確な時刻実行を保証しないため、`scheduledTime` ではなく実行時の `Date.now()` で終了判定する。

## 共通境界

- `evaluateSingleKeywordDetection` と既存の検知後処理を再利用し、モードによって検知条件、baseline、Gmail、external messagingの結果を変えない。
- `startSingleMonitoring` / 複数監視開始はモード別のセッション起動へ委譲する。旧 `monitoringIntervals` と `monitoringStates` は高頻度の互換経路を置き換えた後に削除する。
- Content Scriptからbackgroundへの新規メッセージは、セッションIDとgenerationを含め、古いページ・停止済みセッションの報告を無視できるようにする。

## 要件マッピング

| requirements             | 設計対応                                                 |
| ------------------------ | -------------------------------------------------------- |
| 高頻度の短間隔監視       | Content Scriptの保存済みセッション再開と短間隔再読み込み |
| 高頻度は1〜60分          | `endsAt` とpopup入力検証                                 |
| 長期のMV3休止耐性        | `singleMonitoringSessions`、アラーム、起動時照合         |
| 長期は30分〜8時間・30秒以上 | popup入力検証とアラーム生成前の検証                      |
| 検知後の既存動作維持     | backgroundの共通検知後処理                               |

## 検証方針

- 単体: モード正規化、時間・間隔検証、セッション期限、アラーム名、リース判定、起動時照合をJestで固定する。
- 契約: popupのモード選択・制約表示、Content Scriptとbackgroundのメッセージ契約、系統B/Cアラーム非干渉を確認する。
- 手動: 高頻度の単一/複数URL、検知・停止・タブ終了を確認する。長期はアラーム発火、Service Worker停止後の復元、期限切れ・停止済みの非復元、セレクタ異常・通知を確認する。

## ステータス

- [x] ユーザーによるdesign承認待ち
