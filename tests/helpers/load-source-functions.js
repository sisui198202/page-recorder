const fs = require('fs');
const path = require('path');
const vm = require('vm');

function extractFunctionSourceByBraces(source, functionName) {
    const patterns = [
        new RegExp(`async\\s+function\\s+${functionName}\\s*\\(`),
        new RegExp(`function\\s+${functionName}\\s*\\(`)
    ];

    let match = null;
    for (const pattern of patterns) {
        match = pattern.exec(source);
        if (match) {
            break;
        }
    }

    if (!match) {
        throw new Error(`Function not found: ${functionName}`);
    }

    const startIndex = match.index;
    const parenStart = source.indexOf('(', startIndex);
    let parenDepth = 0;
    let braceStart = -1;

    for (let i = parenStart; i < source.length; i += 1) {
        const char = source[i];
        if (char === '(') {
            parenDepth += 1;
        } else if (char === ')') {
            parenDepth -= 1;
        } else if (char === '{' && parenDepth === 0) {
            braceStart = i;
            break;
        }
    }

    let braceDepth = 0;
    for (let i = braceStart; i < source.length; i += 1) {
        const char = source[i];
        if (char === '{') {
            braceDepth += 1;
        } else if (char === '}') {
            braceDepth -= 1;
            if (braceDepth === 0) {
                return source.slice(startIndex, i + 1);
            }
        }
    }

    throw new Error(`Could not extract function body: ${functionName}`);
}

function createContext(extra = {}) {
    const context = {
        console,
        URL,
        Intl,
        Date,
        Math,
        setTimeout,
        clearTimeout,
        logger: {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {}
        },
        self: {},
        ...extra
    };

    vm.createContext(context);
    return context;
}

function loadBackgroundFunctions(functionNames, extraContext = {}) {
    const filePath = path.resolve(__dirname, '../../src/background/lib/stock-helpers.js');
    const source = fs.readFileSync(filePath, 'utf8');
    const context = createContext(extraContext);

    // stock-helpers.js is pure functions only, load entire file at once
    vm.runInContext(source, context, { filename: 'stock-helpers.js' });

    return functionNames.reduce((acc, functionName) => {
        acc[functionName] = context[functionName];
        return acc;
    }, {});
}

function loadContentFunctions(functionNames, extraContext = {}) {
    const filePath = path.resolve(__dirname, '../../src/content/content.js');
    const source = fs.readFileSync(filePath, 'utf8');
    const context = createContext(extraContext);

    for (const functionName of functionNames) {
        const functionSource = extractFunctionSourceByBraces(source, functionName);
        vm.runInContext(functionSource, context, { filename: 'content.js' });
    }

    return functionNames.reduce((acc, functionName) => {
        acc[functionName] = context[functionName];
        return acc;
    }, {});
}

function loadScriptFunctions(scriptPath, functionNames, extraContext = {}) {
    const filePath = path.resolve(__dirname, scriptPath);
    const source = fs.readFileSync(filePath, 'utf8');
    const context = createContext(extraContext);

    for (const functionName of functionNames) {
        const functionSource = extractFunctionSourceByBraces(source, functionName);
        vm.runInContext(functionSource, context, { filename: path.basename(filePath) });
    }

    return functionNames.reduce((acc, functionName) => {
        acc[functionName] = context[functionName];
        return acc;
    }, {});
}

module.exports = {
    loadBackgroundFunctions,
    loadContentFunctions,
    loadScriptFunctions
};
