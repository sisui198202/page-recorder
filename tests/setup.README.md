# tests/setup.js README

## 目的

`tests/setup.js` が Jest 実行前に何を初期化しているかと、更新時の確認手順をまとめる。

## 現在の役割

`tests/setup.js` では以下を行う。

* `jest-chrome` を読み込み、`global.chrome` に割り当てる
* 各テスト後に `jest.clearAllMocks()` を実行する

対象コード:

```js
const chrome = require('jest-chrome');

global.chrome = chrome;

afterEach(() => {
    jest.clearAllMocks();
});
```

## いつ更新するか

* `chrome.*` API をモックする前提が増えたとき
* 全テスト共通の初期化が必要になったとき
* テスト後のクリーンアップを追加したいとき

## 更新手順

1. `tests/setup.js` を編集する
2. 必要なら `tests/unit/*.test.js` 側の前提も合わせて見直す
3. リポジトリルートで `npm test` を実行する

```bash
npm test
```

## 注意点

* 個別テスト専用のセットアップは `tests/setup.js` に寄せすぎない
* 全テスト共通で必要なものだけを置く
* `chrome` モックの振る舞い追加が必要なら、まず各テストファイル内で十分かを確認する
