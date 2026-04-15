const path = require('path');

module.exports = {
  testEnvironment: 'node',
  roots: [path.resolve(__dirname, 'tests')],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.property.test.js',
  ],
  moduleDirectories: ['node_modules', path.resolve(__dirname, 'server/node_modules')],
};
