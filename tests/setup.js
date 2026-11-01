const { chrome } = require('jest-chrome');

global.chrome = chrome;

afterEach(() => {
    jest.clearAllMocks();
});
