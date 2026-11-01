# Functional Design - PageRecorder

## 概要

本ドキュメントでは、`PageRecorder` の現行機能設計、主要データ、popup UI、監視フローを定義する。

---

## 1. 設計判断サマリ

| 項目 | 選択 | 理由 |
| --- | --- | --- |
| アーキテクチャ | Manifest V3 Service Worker | Chrome 拡張の現行標準 |
| 主運用 | `chrome.alarms` ベースの定時在庫監視 | 複数サイト監視を安定して継続できる |
| データ保存 | `chrome.storage.local` | ローカル完結で扱える |
| 配布設定 | `scheduled-watch-sites.json` / `ec-sites.json` | サイト定義と運用設定を分離できる |
| popup | 単一監視、複数監視、EC 監視 UI、テストタブを集約 | 日常運用を popup 内で完結させる |

---

## 2. 主要データ

### 2.1 popup 設定の中心データ

`monitoring_config` は single / multiple 監視と popup 周辺設定の中心となる。

```javascript
{
  mode: "single" | "multiple",
  version: string,

  single_config: {
    target: "active_tab" | "specified_url",
    url: string,
    selector: string,
    keyword: string,
    detection_mode: "appear" | "disappear",
    interval: number,
    reload_wait: number,
    immediate_check: boolean,
    externalExtensionId: string
  },

  multiple_configs: [
    {
      id: string,
      name: string,
      enabled: boolean,
      url: string,
      selector: string,
      keyword: string,
      detection_mode: "appear" | "disappear",
      interval: number,
      reload_wait: number,
      immediate_check: boolean
    }
  ],

  single_config_backup: {
    savedAt: number,
    source: string,
    config: object
  } | null
}
```

### 2.2 定時監視データ

- popup 設定ベースの単一サイト定時監視は `chrome.storage.local` の設定値を使う
- 複数サイト定時監視は `src/config/scheduled-watch-sites.json` を同梱設定として読む
- EC 監視 UI の補助定義は `src/config/ec-sites.json` を参照する
- Fetch 監視のオーバーライド設定は `chrome.storage.local` の `scheduledWatchOverrides` に保存する

### 2.2.1 fetchMode フィールド

`scheduled-watch-sites.json` の各サイト定義は `fetchMode` フィールドを持つ。

```javascript
{
  "id": "example-site",
  // ... 他のフィールド
  "fetchMode": {
    "enabled": false,        // Fetch監視の有効/無効（デフォルト: false）
    "fallbackToDom": true,   // Fetch失敗時にDOM監視へフォールバック
    "diagnosisCode": null,   // 診断結果コード
    "lastDiagnosedAt": null  // 診断日時
  }
}
```

- `enabled: false` または `fetchMode` 未定義の場合は従来の DOM 監視を使用する
- `enabled: true` の場合は Fetch API による監視を試行する
- Fetch 失敗時は `fallbackToDom` に応じて DOM 監視へフォールバックする

### 2.2.2 オーバーライド機構

`scheduled-watch-sites.json` は静的ファイルのため直接更新できない。
ユーザーの Fetch 監視設定変更は `chrome.storage.local` の `scheduledWatchOverrides` で管理する。

```javascript
{
  "scheduledWatchOverrides": {
    "example-site": {
      "fetchMode": {
        "enabled": true,
        "fallbackToDom": true,
        "diagnosisCode": "FETCH_SUPPORTED",
        "lastDiagnosedAt": "2026-09-25T14:30:00.000Z"
      }
    }
  }
}
```

設定読み込み時に静的設定とオーバーライドをマージする。

### 2.3 状態データ

監視状態は `chrome.storage.local` に保持し、popup 表示、アラーム再同期、手動テスト確認に使う。

代表的な状態は次を含む。

- 監視中フラグ
- 現在モード
- 最終実行時刻
- エラー情報
- baseline / 検知結果の要約
- テストタブ適用前バックアップ状態

---

## 3. popup UI 設計

### 3.1 主要セクション

popup は単一の画面内で複数導線を切り替えて扱う。

```text
ヘッダー
  ├─ 監視モード切替
  ├─ 単一監視設定
  ├─ 複数監視設定 / 監視対象リスト
  ├─ EC 監視 UI
  ├─ 全体制御 / 状態表示
  └─ テストタブ
```

### 3.2 単一監視 UI

- 対象 URL または active tab を指定する
- セレクタ、キーワード、検知モード、待機時間を編集する
- 即座取得、監視開始/停止、定時監視関連設定を操作する
- 通知先拡張機能 ID を設定できる

### 3.3 複数監視 UI

- 複数の監視対象を一覧で管理する
- 各項目の有効/無効、編集、削除ができる
- 一括開始 / 一括停止などの全体制御を持つ
- 監視結果は項目ごとに独立して扱う

### 3.4 EC 監視 UI

- `ec-sites.json` のサイト一覧を表示する
- サイトごとの ON/OFF を切り替える
- 単一選択時に selector や監視条件を自動補完する
- サイト紐づけ URL の登録を支援する

### 3.5 テストタブ

- single 向けの手動テストシナリオを一括適用する
- 適用前設定を `single_config_backup` に退避する
- 復元導線を popup 内に持つ
- multiple の4番だけは、利用者がONにした開始操作に限り、リロード後待機中のDOM再現を自動実行できる。このON/OFFは保存しない
- 「取得方式診断」では、ECサイトの在庫あり・なしサンプルを一括診断し、選択サイトと結果を復元する
- 単件診断はアクティブタブまたは指定URL、専用セレクタ、専用キーワードを使用する。ECサイト選択時は既定値を専用入力に反映するが、通常監視設定は参照・更新しない

---

## 4. 監視フロー設計

### 4.1 系統 A: 単一 / 複数 URL キーワード監視

```text
popup
  -> background へ開始要求
  -> 対象ページの DOM / テキスト確認
  -> キーワード変化判定
  -> 検知時に HTML / スクリーンショット保存
  -> 状態更新
```

- レガシーの content script 利用フローを含む
- 主運用ではないが、引き続きサポート対象

### 4.2 系統 B: popup 設定ベースの単一サイト定時在庫監視

```text
popup 設定保存
  -> background が schedule を同期
  -> chrome.alarms 発火
  -> 対象ページ取得
  -> 在庫状態を判定
  -> 検知時に保存 / 通知
```

### 4.3 系統 C: JSON ベースの複数サイト定時在庫監視

```text
scheduled-watch-sites.json 読込
  -> サイトごとに alarms 同期
  -> baseline 取得
  -> 定時チェック実行
  -> 在庫差分または URL 差分判定
  -> 検知時に保存 / external messaging
```

これは現行の主運用フローである。

### 4.4 Fetch 監視フロー

`fetchMode.enabled: true` のサイトは、タブを開かずに Service Worker から直接 Fetch API で監視する。

```text
scheduled-watch-sites.json + オーバーライド読込
  -> fetchMode.enabled を判定
  -> [enabled: true] Fetch API で HTML 取得
  -> offscreen で HTML 解析（商品 URL 抽出）
  -> 在庫差分 / URL 差分判定
  -> 検知時に保存 / external messaging
  -> [Fetch 失敗 && fallbackToDom: true] DOM 監視へフォールバック
```

#### Fetch 監視のメリット

- タブを開かないため、リソース消費が少ない
- 複数サイト同時監視のスケーラビリティが高い
- UI ブロッキングを防げる

#### Fetch 監視の制約

- JavaScript 実行後の DOM を取得できない
- 認証が必要なページには対応できない
- CORS 制約の影響を受ける場合がある

#### 取得方式の選択

popupでは、単一URL監視・複数URL監視で共通の取得方式（Fetch / リロード）を選択できる。定時複数サイト監視では、サイトごとの選択を `scheduledWatchOverrides` に保存し、次回監視から適用する。
「在庫 Fetch 一括診断」は設定を変更しない確認機能とする。A系高頻度Fetchは監視タブ内のContent Scriptで実行し、C系Fetchは従来どおりタブレスで実行する。Fetchで検知した場合は通知を先行し、証跡保存のためだけに監視タブを再読込する。

### 4.4.1 実行履歴の可視化

各監視対象について、実行中または直近1実行の開始・チェック・終了を `chrome.storage.local` に保存する。popupではチェック開始時刻、前回開始からの実測間隔、取得方式、成功・検知・失敗・フォールバック結果を表示する。Fetch高頻度監視の設定間隔は、この実測間隔で確認する。単一URL・複数URLのAI判断サポートファイルにも同じチェック履歴を出力する。

### 4.5 新商品 URL 抽出

- baseline と現取得結果を比較する
- 既知 URL を除外し、新規 URL のみ抽出する
- 検知 payload に含めて外部拡張へ渡せる形にする

---

## 5. ダウンロードと通知

### 5.1 保存処理

- スクリーンショットは `chrome.tabs.captureVisibleTab()` を使う
- HTML / DOM 情報は `chrome.scripting.executeScript()` または既存の content script 経路で取得する
- ダウンロードは `chrome.downloads.download()` で行う
- Blob 保存補助が必要な場合は `offscreen` を使う

### 5.2 外部拡張通知

- 検知結果は external messaging で外部拡張へ送る
- 通知 payload は検知種別、対象サイト、URL、差分結果などを含む
- 通知先 ID は popup 設定またはサイト設定に従う
- Gmail 通知を有効にした場合は、A/B/C の本番検知結果を Gmail API でも送信する
- Gmail の送信先と有効状態は popup で設定し、認証・送信は Service Worker が担当する
- Gmail 送信失敗は既存の保存、Chrome 通知、external messaging を停止させない

---

## 6. エラーハンドリング設計

| カテゴリ | 例 | 方針 |
| --- | --- | --- |
| ページ取得失敗 | タブ更新失敗、対象ページ未読込 | ログ記録し、必要に応じて次回実行へ継続 |
| セレクタ不一致 | 要素未検出、件数取得失敗 | サイト単位で記録し、手動確認対象にする |
| 通知失敗 | 外部拡張未応答、ID不一致 | 監視本体は止めず、通知失敗を記録する |
| 設定不整合 | 保存値欠落、旧形式 | 既存移行処理または安全な既定値で扱う |

background 側の新規ログは `logger` / `bgLog*` を通す。
