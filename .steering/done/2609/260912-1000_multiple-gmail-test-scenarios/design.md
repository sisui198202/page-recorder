# 設計

## 方針

- `MULTIPLE_TEST_SCENARIOS` に Gmail 専用の 1 URL / 2 URL シナリオを分離して追加する。両者とも固定の在庫なし URL と自動 DOM 再現を使う。
- popup は Gmail 専用シナリオの開始要求にだけ実行 ID・期待送信件数・設定 ID を渡す。開始前に background の preflight を実行する。
- background は Gmail 専用のテスト設定にだけ抑止解除と実行 ID を伝播する。送信基盤は session storage に実行 ID ごとの成功設定 ID と直近エラーを保存し、同一設定 ID の成功を重複計上しない。
- テストメール成功時は、有効状態・送信先・確認時刻を専用の local storage 状態へ保存する。preflight は現在の有効状態と送信先に一致するこの状態を確認し、検知送信が更新する直近送信結果には依存しない。
- popup は status をポーリングして Gmail 専用結果カードに期待件数、成功件数、実行 ID、失敗理由を表示する。
- popup 初期化では、`A: multiple` が選択済みなら `multiple_test_scenario_state.scenario_id` が `MULTIPLE_TEST_SCENARIOS` に存在する場合だけ選択値へ復元し、未保存・不正値は既定シナリオに戻す。続けて `getMultipleGmailTestStatus` を呼び、結果の `scenarioId` が現在選択中の Gmail シナリオと一致する場合だけ結果カードを描画する。`active` のときだけポーリングを再開し、別サブタブまたは別シナリオ選択時はカードとポーリングを停止する。
- popup のシナリオ詳細は、Gmail前提、監視対象URL、セレクタ、キーワード、検知方法、開始直後判定、リロード後待機、監視間隔・時間、保存内容、自動DOM再現、期待送信件数を表示する。

## 非対象

- Gmail 受信箱の読取権限・自動到着確認は追加しない。
- 本番 multiple、既存 multiple テスト、single 8 番、C 差分テストの通知境界は変更しない。
