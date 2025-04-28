module.exports = {
  preset: 'ts-jest', // Use ts-jest preset for TypeScript support
  testEnvironment: 'node', // Set test environment to Node.js
  testMatch: ['**/tests/**/*.test.ts'], // Match test files in the "tests" directory
  modulePathIgnorePatterns: ['<rootDir>/dist/'], // Ignore dist folder during module resolution
}
