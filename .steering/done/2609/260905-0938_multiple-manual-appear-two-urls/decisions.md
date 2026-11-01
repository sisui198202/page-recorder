# decisions — multiple-manual-appear-two-urls

## background を変更しない

`shouldShowManualTestCodePromptForMultipleScenario` は既知の正常系3 IDだけを案内なしにしている。新IDは未知IDとして案内を表示できるため、待機・ログ・検知ロジックを変更しない。
