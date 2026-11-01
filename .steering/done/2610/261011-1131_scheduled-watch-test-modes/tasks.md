# tasks.md

詳細ルールは [tasks テンプレート README](~/Documents/Summary/11_テンプレート/40_タスク管理/README.md) を参照。

## チェック状態の定義

- [ ] 未着手
- [~] 実装済み・未確認
- [x] 実装・確認とも完了
- [-] 保留
- [/] 却下

## Phase 1: 方式選択UI

- [x] 保存付き差分テストカードに、短縮検証を既定とする相互排他ラジオ型セグメントと説明文を追加する。
- [x] popupが選択した`fast`または`alarm`を開始メッセージへ渡す。
- [x] popupのUI契約テストで、既定値・選択肢・送信値を確認する。

## Phase 2: background状態遷移

- [x] 開始メッセージの実行方式を検証してテストsessionへ保存し、未指定・無効値を`fast`へ正規化する。
- [x] `fast`で既存の同一実行内のdetect・終了を維持する。
- [x] `alarm`でbaseline後のsession保存と2回目アラーム予約を行い、次tickでdetect・後始末を完了する。
- [x] 両方式で専用session、成果物5件、通知抑止、本番C監視・baseline非干渉を維持する。

## Phase 3: テストと手順

- [x] `fast`と`alarm`のbackground状態遷移をユニットテストで確認する。
- [x] テストタブの手順書を、両方式の用途・成功条件・非干渉条件へ更新する。
- [x] 関連ユニットテスト、全ユニットテスト、`npm run check:plan-todo`、`git diff --check`を実行する。
- [x] Chrome popupで両方式を実行し、結果カード・成果物・本番監視と通知経路の非干渉を確認した。

## Phase 4: 記録

- [x] 手動確認結果と、短縮検証／実運用再現の使い分けを`ai-notes.md`へ記録する。
