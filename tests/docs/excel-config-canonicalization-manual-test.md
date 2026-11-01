# Excel設定正本化の手動テスト

## 目的

旧形式の監視設定を失わずにExcel出力でき、取込後も正本だけが使われることを確認する。

## 実行

1. `chrome.storage.local` の `monitoring_config` を、`multiple_configs: []` と2件の `multiple_targets` を持つ値にする。
2. 拡張をリロードし、popupの複数監視で「Excel出力」を実行する。
3. 出力したCSVを「Excel取込」で取り込み、再度「Excel出力」を実行する。

## 期待結果

- 1回目の出力で `E001` にならず、2件を含むCSVがダウンロードされる。
- Storageには2件の `multiple_configs` が保存され、`multiple_targets` は存在しない。
- 取込後も件数が維持され、再出力できる。
