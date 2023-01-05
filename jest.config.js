module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['spec'],
  setupFilesAfterEnv: ['<rootDir>/spec/matchers/custom_matchers.ts'],
};