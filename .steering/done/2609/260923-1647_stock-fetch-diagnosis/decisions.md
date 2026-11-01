# 判断記録: 在庫取得方式診断

## 起票時点の判断

- popupは専用モードタブではなく、単一URL監視内の折りたたみ診断セクションとして検討する。
- Network Fetch/XHRの自動収集は、`debugger` 権限を追加せず、手動DevTools調査への導線と成果物保存を基本案とする。

## 採用した設計境界

- Service WorkerのFetch結果を実運用候補の根拠とし、outerHTMLは比較対象だけに使う。
- HTML解析はpopupへ本文を送らずoffscreen文書で完結させ、結果要約だけを返す。
- `FETCH_COMPATIBLE_CANDIDATE` は単一観測状態の候補であり、Fetch方式の本採用ではない。
