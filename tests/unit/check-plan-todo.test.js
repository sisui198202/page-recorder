const {
    findTerminalTodoItems,
    formatFailures
} = require('../../scripts/check-plan-todo');

describe('check-plan-todo', () => {
    test('[ ] と [~] の項目は許可する', () => {
        const items = findTerminalTodoItems([
            '- [ ] 未着手の項目',
            '- [~] 実装済みで未確認の項目'
        ].join('\n'));

        expect(items).toEqual([]);
    });

    test.each([
        ['x', '完了した項目'],
        ['-', '保留した項目'],
        ['/', '却下した項目']
    ])('[%s] を行番号付きで検出する', (status, text) => {
        const items = findTerminalTodoItems(`# TODO\n- [${status}] ${text}`);

        expect(items).toEqual([{
            lineNumber: 2,
            status,
            text
        }]);
        expect(formatFailures(items)).toContain(`2行目 [${status}] ${text}`);
        expect(formatFailures(items)).toContain('整理案:');
    });
});
