#!/usr/bin/env node

/**
 * plan/todo.md に完了・保留・却下の終端状態が残っていないかを検査する。
 * このスクリプトは読み取り専用であり、todo ファイルを書き換えない。
 */
const fs = require('fs');
const path = require('path');

const PLAN_TODO_PATH = path.join(__dirname, '../plan/todo.md');
const TERMINAL_STATUSES = new Set(['x', '-', '/']);
const TODO_ITEM_PATTERN = /^\s*[-*+]\s+\[([ x~\-/])\]\s+(.+?)\s*$/;

const CLEANUP_GUIDANCE = {
    x: '対応する .steering/done/ の完了記録を確認し、必要な成果物説明だけを docs/実装済/ に残して、この項目を削除してください。',
    '-': '.steering/on-hold/ に保留理由を記録して、この項目を削除してください。',
    '/': 'decisions.md などに却下理由を記録して、この項目を削除してください。'
};

function findTerminalTodoItems(markdown) {
    return markdown.split(/\r?\n/).flatMap((line, index) => {
        const match = line.match(TODO_ITEM_PATTERN);
        if (!match || !TERMINAL_STATUSES.has(match[1])) {
            return [];
        }

        return [{
            lineNumber: index + 1,
            status: match[1],
            text: match[2]
        }];
    });
}

function formatFailures(items) {
    const details = items.map(item => (
        `  ${item.lineNumber}行目 [${item.status}] ${item.text}\n` +
        `    整理案: ${CLEANUP_GUIDANCE[item.status]}`
    ));

    return [
        'plan/todo.md に終端状態の項目が残っています。close を中断してください。',
        ...details
    ].join('\n');
}

function checkPlanTodo(filePath = PLAN_TODO_PATH) {
    const markdown = fs.readFileSync(filePath, 'utf8');
    return findTerminalTodoItems(markdown);
}

if (require.main === module) {
    const terminalItems = checkPlanTodo();

    if (terminalItems.length > 0) {
        console.error(formatFailures(terminalItems));
        process.exitCode = 1;
    } else {
        console.log('plan/todo.md に終端状態の項目はありません。');
    }
}

module.exports = {
    CLEANUP_GUIDANCE,
    findTerminalTodoItems,
    formatFailures,
    checkPlanTodo
};
