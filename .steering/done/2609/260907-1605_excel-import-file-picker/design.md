# 設計

## 方針

取込操作は通常のボタンとし、クリックイベント内で同期的に native file input の `click()` だけを実行する。File System Access API、可視input、非同期フォールバックは撤去する。file input は設定管理のボタン群から外し、popup末尾の `display: none` 要素へ戻す。

native file inputの `change` は既存の共通取込関数へ `File` を渡す。ファイル未選択時は取込関数を呼ばず、input値だけをリセットする。既存のExcel/CSV解析、background通信、保存形式は変更しない。

## 変更対象

- `src/ui/popup.html`: 通常の取込ボタンと、popup末尾の非表示native file inputを置く
- `src/ui/popup.js`: ボタンのクリックから同期的にinputを起動し、inputの `change` から共通の取込関数を呼ぶ
- `tests/unit/`: 同期起動、input選択、キャンセルを確認する回帰テストを追加する
- `tests/docs/`: Chrome で確認する手順を追加する

## 非変更範囲

Excel/CSV 解析、background の `importMonitoringSettings`、設定保存、取込後の画面更新は既存実装を維持する。
