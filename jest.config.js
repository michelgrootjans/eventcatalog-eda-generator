module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
      'src',
      'spec',
  ],
  setupFilesAfterEnv: ['<rootDir>/spec/matchers/custom_matchers.ts'],
};