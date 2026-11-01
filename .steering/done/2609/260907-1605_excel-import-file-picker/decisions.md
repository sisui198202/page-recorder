# 判断記録

## 2026-09-08: 同期 native file input 起動方式へ復帰

Chrome for Testing 136では、label方式とFile System Access API優先方式でファイル選択ダイアログが表示されなかった。複数URL監視タブで以前動作していた、ボタンクリック内から同期的に非表示native file inputの `click()` を実行する方式を正本とする。File System Access API、可視input、非同期フォールバックは採用しない。
