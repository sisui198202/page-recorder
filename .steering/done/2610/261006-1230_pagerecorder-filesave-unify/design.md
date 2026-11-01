# Design: PageRecorder 保存処理の共有API統一

## 概要

`downloadWithFilename` 関数（30箇所）を `FileSave` API に段階的に置換する。

## 現状分析

### downloadWithFilename の使用箇所

| カテゴリ | 行番号 | 用途 |
|---------|--------|------|
| 関数定義 | 5051 | 関数本体 |
| エイリアス | 5091 | downloadDataUrl |
| 単一URL監視 | 256, 7891, 7903 | HTML/スクリーンショット保存 |
| 複数URL監視 | 1675, 1702, 1734 | 検知保存 |
| 定時監視 | 6478, 6509, 6546 | 検知保存 |
| 診断・AI判断 | 9227-9236, 9325-9340, 9372 | 診断結果・サポートファイル |
| テスト関連 | 9597, 9621 | ログ出力 |
| その他監視 | 10457, 10481, 10637, 10709, 10749 | 検知保存 |

### FileSave API との対応

| downloadWithFilename パラメータ | FileSave メソッド |
|-------------------------------|------------------|
| `{ textContent, mimeType: "text/html...", filename }` | `FileSave.saveHtml({ html, filename })` |
| `{ url: dataUrl (PNG), filename }` | `FileSave.saveScreenshot({ dataUrl, filename })` |
| `{ textContent, mimeType, filename }` | `FileSave.download({ textContent, mimeType, filename })` |

## 設計方針

### Phase 1: 低リスク箇所から開始

診断・AI判断サポート系を先に置換（独立性が高い）。

### Phase 2: 監視系を順次置換

単一URL → 複数URL → 定時監視 の順で進める。

### Phase 3: 関数削除

全置換完了後、`downloadWithFilename` 関数と `downloadDataUrl` エイリアスを削除。

## 置換パターン

### HTML保存

```javascript
// Before
await downloadWithFilename({
  textContent: htmlContent,
  mimeType: "text/html;charset=utf-8",
  filename: `${base}/page.html`
});

// After
await FileSave.saveHtml({
  html: htmlContent,
  filename: `${base}/page.html`
});
```

### スクリーンショット保存

```javascript
// Before
await downloadWithFilename({
  url: screenshotDataUrl,
  filename: `${base}/screenshot.png`
});

// After
await FileSave.saveScreenshot({
  dataUrl: screenshotDataUrl,
  filename: `${base}/screenshot.png`
});
```

### テキスト/JSON保存

```javascript
// Before
await downloadWithFilename({
  textContent: JSON.stringify(data, null, 2),
  mimeType: "application/json;charset=utf-8",
  filename: `${base}/data.json`
});

// After
await FileSave.download({
  textContent: JSON.stringify(data, null, 2),
  mimeType: "application/json;charset=utf-8",
  filename: `${base}/data.json`
});
```

## エラーハンドリング

```javascript
// Before
try {
  await downloadWithFilename({ ... });
} catch (error) {
  console.error("保存失敗:", error.message);
}

// After
try {
  await FileSave.download({ ... });
} catch (error) {
  if (error.code === 'EMPTY_CONTENT') {
    console.error("保存内容が空です");
  } else if (error.code === 'DOWNLOAD_FAILED') {
    console.error("ダウンロード失敗");
  } else {
    console.error("保存失敗:", error.message);
  }
}
```

## テスト方針

1. 既存の Jest テストを維持
2. FileSave モックに置換
3. 手動確認: 各保存機能の動作確認

## 完了条件

- [ ] `downloadWithFilename` の全呼び出しを置換
- [ ] `downloadWithFilename` 関数を削除
- [ ] `downloadDataUrl` エイリアスを削除
- [ ] 既存テストが通る
- [ ] 主要機能の手動確認完了

## 追加設計: 複数URL監視の定時開始

- `multiple_common_settings` に `scheduleEnabled`（既定 `false`）と `scheduleTime`（`HH:mm`）を保存する。
- Popup の複数URL監視「共通時間設定」に有効化チェックボックス・時刻入力・予約状態を置く。開始時刻は毎日繰り返し、既存の取得期間が各対象の終了を管理する。
- A 専用の `dailyMultipleMonitoring` Chrome Alarm を作成・解除する。B の `dailyStockCheck`、C の `dailyStockCheck_<site>` と名前空間を共有しない。
- Alarm 発火時は、保存済みの有効な `multiple_configs` と `multiple_common_settings` から通常の `runMultipleMonitoringStartConfigs` を呼び、Popup の手動開始と同じ監視セッションを開始する。保存済み設定は開始時に変更しない。
- `getStatus` に A の予約・実行状態を含め、Popup が次回実行時刻を表示する。

## 追加設計: C通常経路の保存付き差分テスト

- 既存の `scheduledWatchTestTick` をテスト専用アラームとして再利用し、`multi-artifact-diff` session を二段階で実行する。
- 第1段階はリロード方式でsnapshotを取得し、既存の基準証跡保存関数からPNG・HTML・TXTを `FileSave` で保存する。第2段階はURLを1件だけ除外した一時baselineとの比較で差分を必ず発生させ、共通の検知証跡保存関数からPNG・HTMLを保存する。
- 本番Cのstorage・session・通知経路には接続しない。ファイル名には `TEST_` を含め、結果カードにはファイル名とdownloadIdを表示する。
