# decisions

## 2026-10-25: 複数URL監視の追加元

- 採用: `urls.yaml` を既存同期した `src/config/page-recorder-targetpages.json` をPopupで読む。
- 理由: Chrome拡張はローカルの `urls.yaml` を直接読めず、単一URL監視と同じ配布経路を再利用できる。

## 2026-10-25: 重複URLの扱い

- 採用: 監視リストに同じURLがある targetpage は選択候補から除外する。
- 理由: 同じ商品への二重監視・二重通知をUI上で予防できる。
