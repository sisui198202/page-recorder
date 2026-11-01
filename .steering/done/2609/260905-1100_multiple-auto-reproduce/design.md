# design — multiple-auto-reproduce

## 方針

- `manual_appear_two_urls` にだけ対応フラグを持たせ、popupはこのフラグでトグルを表示する。
- トグル値は開始メッセージの `autoReproduce` にのみ載せ、`multiple_test_scenario_state` や設定ストレージには保存しない。
- backgroundは `scenarioId === 'manual_appear_two_urls' && autoReproduce === true` を自動注入の唯一の許可条件とする。
- 注入関数はbackgroundに固定実装し、対象セレクタ内の `在庫なし` を `在庫あり` に変更して変更件数を返す。popupの表示用コードは参照・実行しない。
- 複数監視のリロード後待機で既存の「実行できます」ログを出した直後に注入する。成功、変更件数、失敗は `bgLog*` / `logger` で記録する。
- 注入例外または対象なしはその監視tabだけのinterval・状態・テストログセッションを解除して終了する。

## 非対象

- `single` とmultipleの1〜3番
- 自動化設定の永続化
- 15秒待機、検知、ダウンロード、検知後停止フローの変更
