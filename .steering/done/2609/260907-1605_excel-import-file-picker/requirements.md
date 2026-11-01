# 要件

## 目的

popup の「Excel取込」から、Chrome のファイル選択ダイアログを確実に表示して設定取込を開始できるようにする。

## 背景

2026-09-07 に Chrome for Testing 136 で、取込ボタンを選んでもダイアログが出ず、background に取込メッセージも届かないことを確認した。ユーザーから修正依頼を受けた。

## 受け入れ条件

- multiple 監視設定の「Excel取込」で `.xlsx`、`.xls`、`.csv` を選べる
- 明示的な「Excel取込」ボタンのクリックイベント内で、同期的に native file input の `click()` を実行する
- file input は設定管理のボタン群から外し、popup末尾の `display: none` 要素として配置する
- File System Access API、可視input、非同期フォールバックを使用しない
- native file inputの選択は、共通の既存取込処理へ進む
- ファイル選択をキャンセルしても設定を変更しない
- 取込フォーマット、background 通信、CSV列、ダウンロード方式を変更しない
