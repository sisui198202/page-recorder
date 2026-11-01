# AI判断サポートレポート

## 目的

単一URL監視・複数URL監視の手動テスト結果を、AIが追加のログ照合なしで判定できるMarkdownとして出力する。

## 背景

現行ファイルは基準取得時に生成されるため、検知・終了・証跡保存の最終結果を含まず、Service Worker全体の設定とログが混在する。

## 手動テストレビュー

`resulttest` は最新のAI判断サポートファイルを、このタスクの受け入れ条件と照合してレビュー・記録できる。

## 追加要件（複数URL監視・共通設定）

- AI判断サポートファイルの有効・無効は、SWログコピーの直下にある共通UIから、選択中の監視モードへ保存する。
- 単一URL監視は既存の `single_config.settings.downloadAiSupportFile`、複数URL監視は `multiple_common_settings.downloadAiSupportFile` を使い、値は独立して保持する。
- 複数URL監視はURLごとに終端時1ファイルを出力し、開始グループID、監視設定ID・名称、終了理由をファイル名と本文に含める。
- 単一URL監視の既存ファイル名形式は変更しない。
