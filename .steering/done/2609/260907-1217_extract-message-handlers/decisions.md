# decisions — extract-message-handlers

## D-001: 同一ファイル内の handler 抽出に限定する

- 決定内容: 3 action を `background.js` 内の名前付き async handler へ抽出する。
- 背景: 既存の message switch は大きく、局所的な修正と応答契約の検証が難しい。
- 検討した選択肢: switch 内に維持する / 別モジュールへ移す / 同一ファイル内で抽出する。
- 採用理由: module-scope 依存と MV3 の読み込み構成を変えず、挙動差を最小にできる。
- 却下理由: 別モジュール化は依存注入や読み込み順の変更を伴う。
- 影響範囲: `quickCapture` と設定 CSV 入出力の message dispatch の内部構造だけ。
- ステータス: 確定。

## D-002: 系統A/B/Cの構造変更は保留する

- 決定内容: 系統B/C統合、content script 廃止、系統Aの alarms 移行は実施しない。
- 背景: ユーザーは系統A/Bを今後も使用する。
- 採用理由: storage 互換性と監視回帰のリスクが、今回の可読性改善の便益を上回る。
- ステータス: 確定。
