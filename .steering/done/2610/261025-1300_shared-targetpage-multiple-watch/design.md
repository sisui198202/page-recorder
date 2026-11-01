# design

## 方針

Chrome拡張からローカルの `urls.yaml` を直接参照せず、既存同期で生成済みの `src/config/page-recorder-targetpages.json` を使用する。単一URL監視の共有 targetpage 読込・候補表示ロジックを再利用する。

## UI とデータフロー

1. 複数URL監視の「監視するURL」に、手入力追加と共有targetpage追加で共用するサイトセレクトを1つ置く。共有targetpage側には環境・商品セレクトと「共有 targetpage を追加」ボタンだけを置く。
2. 環境と共通サイト選択で `page-recorder-targetpages.json` を絞り、現在の `multiple_configs` に同一URLがある商品を候補から除外する。共通サイトが未選択なら全サイトを候補にする。
3. 選択した targetpage から `name`、`url`、`selector`、`keyword`、`detection_mode`、`settings.targetpage`、`notifyExternalExtension`、`externalExtensionId` を組み立て、既存の `configManager.addMonitoringTarget` で保存する。
4. `prod` targetpage は単一URL監視と同じ確認ダイアログを通す。追加後は最新リストを再描画して選択候補も更新する。
5. 複数URL監視の共有targetpage商品セレクトでは、候補を `optgroup` で「🟢 在庫あり」「⚪ 在庫なし」の順に表示する。各商品行は商品名だけを表示する。
6. Popup初期化では、保存済みの共通サイト選択を復元してから共有targetpage候補を再描画し、初期描画時の未選択状態を残さない。

## 互換性

- 手入力用の「対象を追加」モーダルは変更しない。
- `monitoringConfigManager` のID採番と保存処理をそのまま利用する。
- 既存対象の設定、共通設定、実行セッションを変更しない。
