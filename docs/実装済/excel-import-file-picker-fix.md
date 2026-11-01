# Excel取込のファイル選択ダイアログ不表示修正

## 背景

Chrome for Testing 136 で、popup の「Excel取込」を選んでもファイル選択ダイアログが表示されず、取込処理が始まらないことを確認した。現在は `display: none` の file input を JavaScript から `click()` している。

## 方針

利用者が「Excel取込」ボタンをクリックした時点で、同期的に native file input の `click()` を実行する。File System Access API、可視input、非同期フォールバックは使わない。file input は設定管理のボタン群から外し、popup末尾の `display: none` 要素として置く。選択結果は既存の `change` イベントから共通取込処理へ渡し、Excel/CSVの形式、background通信、設定保存は変更しない。

## 完了条件

- 「Excel取込」の選択で同期native file inputのファイル選択ダイアログが開く
- native file inputの選択が既存の共通取込処理を実行する
- キャンセル時は取込要求も設定変更も発生しない
- 自動テストと手動確認手順を更新する
