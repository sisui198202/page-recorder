# design.md

## 概要

現行のプロダクション挙動を変更せず、2件のユニットテストを実装上の契約に合わせる。

## 設計方針

- 保存付き差分テストは、初回専用アラーム後にbaseline取得・1秒待機・強制差分検知・後始末までを同一実行内で完了する短縮検証を正とする。
- `scheduled-watch-diff-test`は、中間storage状態ではなく、最終ステータス、強制検知したURL、5件の成果物、専用session削除を検証する。
- 在庫取得診断のフォールバック経路は、`loadEcSites()`と`loadScheduledWatchSitesForPopup()`を並行読込する。単体テストには後者の解決済みモックを注入し、フォーム入力がある経路では両ローダーを呼ばないことも維持する。
- `popup.js`と`background.js`のプロダクションロジック、popup UI、設定スキーマは変更しない。

## 要件対応

| 要件 | 対応方法 |
| --- | --- |
| 保存付き差分テストの契約 | テストを最終状態の検証へ更新する。 |
| 在庫取得診断の契約 | 新しいローダー依存をテストへ注入する。 |
| 全ユニットテスト成功 | 対象テスト後に全ユニットテストを実行する。 |
| 回帰確認 | 現行の短縮挙動とフォーム／フォールバックの両経路を対象テストで確認する。 |

## 変更対象

- `tests/unit/scheduled-watch-diff-test.test.js`
- `tests/unit/stock-fetch-diagnosis.test.js`
- `.steering/261011-1051_scheduled-watch-test-contracts/`

## 非変更対象

- `src/background/background.js`
- `src/ui/popup.js`
- `src/ui/popup.html`
- `src/config/` 配下の設定ファイル

## テスト方針

- 対象2テストを個別実行する。
- `npm run test:unit -- --runInBand`で全ユニットテストを実行する。
- `git diff --check`と`npm run check:plan-todo`を実行する。
