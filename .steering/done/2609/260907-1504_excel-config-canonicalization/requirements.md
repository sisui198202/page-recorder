# requirements — Excel設定の正本化

## 目的

Excel入出力と複数監視が、`monitoring_config.multiple_configs` という単一の正本を参照するようにする。

## 背景

2026-09-07の手動確認で、旧互換配列 `multiple_targets` に2件ある一方で `multiple_configs` が空となり、Excel出力が `E001` で失敗した。PRDは `multiple_configs` を中心データとして定義している。

## 機能要件

- 旧データで `multiple_targets` のみ存在する場合、起動またはExcel入出力時に `multiple_configs` へ一度だけ移行して保存する。
- 移行後は `multiple_targets` を保存データから除去し、以後のExcel入出力は `multiple_configs` だけを使用する。
- `multiple_configs` が存在する場合は常にこれを優先し、旧配列の内容で上書きしない。
- 両配列が空の場合のExcel出力は、従来どおり `E001` を返す。

## 受け入れ条件

- 旧形式の2件をExcel出力でき、保存後は `multiple_configs` のみが2件存在する。
- CSV取込後に `multiple_configs` へ保存され、`multiple_targets` は再作成されない。
- 既存のCSV形式、popupメッセージ、ダウンロード方式を変更しない。

## スコープ外

- ExcelのXLSX形式への変更、popup UI改修、監視仕様の変更。

## 承認

- [x] ユーザー承認済み（2026-09-07）
