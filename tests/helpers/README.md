# tests/helpers README

## 目的

`tests/helpers/load-source-functions.js` の使い方と、特性テストでの利用手順をまとめる。

## 対象

* `tests/helpers/load-source-functions.js`
* `tests/unit/background-functions.test.js`
* `tests/unit/content-functions.test.js`

## 何をしているか

* `src/background/lib/stock-helpers.js` から純粋関数を文字列として抽出する
* `src/content/content.js` から `normalizeText` などの単体関数を抽出する
* `vm.runInContext()` で最小コンテキスト上に評価し、Jest から直接呼べるようにする

## 使い方

### 背景系ヘルパーを使う

```js
const { loadBackgroundFunctions } = require('../helpers/load-source-functions');

const { diffStockProductUrls } = loadBackgroundFunctions([
    'diffStockProductUrls'
]);
```

依存関数が必要な場合は、`backgroundDependencies` に定義された順で自動読込される。

### content 側ヘルパーを使う

```js
const { loadContentFunctions } = require('../helpers/load-source-functions');

const { normalizeText } = loadContentFunctions(['normalizeText']);
```

## テスト追加手順

1. テスト対象が純粋関数か確認する
2. `tests/unit/*.test.js` で `loadBackgroundFunctions()` または `loadContentFunctions()` を呼ぶ
3. 期待値は理想仕様ではなく現実装の出力に合わせる
4. `npm test` で回帰がないことを確認する

## 注意点

* DOM や `chrome.*` への強い依存がある関数は、この helper 方式に向かない
* 背景関数を追加でテストする場合、依存関係があれば `backgroundDependencies` を更新する
* ロジック本体の import 方式変更ではなく、現構成を壊さずに特性テストを置くための補助である
