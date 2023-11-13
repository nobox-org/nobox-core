/** @type { import('jest').Config} */

const Config = {
   verbose: true,
   preset: 'ts-jest',
   testEnvironment: 'node',
   moduleNameMapper: {
      '@/(.*)': '<rootDir>/src/$1',
   },
   moduleFileExtensions: ['js', 'json', 'ts'],
   setupFilesAfterEnv: ['./jest.setup.js'],
};

module.exports = Config;
