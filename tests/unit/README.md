# tests/unit README

## 目的

`tests/unit/` 配下の Jest テストの実行方法と追加方針をまとめる。

## 現在のテスト

* `background-functions.test.js`
  * `src/background/lib/stock-helpers.js` の純粋関数を対象にした特性テスト
* `content-functions.test.js`
  * `src/content/content.js` の `normalizeText` を対象にした特性テスト

## 実行方法

リポジトリルートで実行する。

```bash
npm test
```

ユニットテストだけを明示したい場合:

```bash
npm run test:unit
```

特定ファイルだけ回す場合:

```bash
npx jest tests/unit/background-functions.test.js
npx jest tests/unit/content-functions.test.js
```

## テスト方針

* 現挙動を固定する特性テストを優先する
* 既存仕様を変える期待値は置かない
* 監視フロー全体ではなく、切り出された純粋関数を主対象にする

## 新規テスト追加手順

1. 対象関数を選ぶ
2. `tests/helpers/load-source-functions.js` で読めるか確認する
3. `*.test.js` を追加し、入力と現在出力を固定する
4. `npm test` を実行する

## 注意点

* 実機の定時差分検知回帰はこのディレクトリだけでは保証しない
* 高リスクな監視統合や message フローは手動テストと併用する
