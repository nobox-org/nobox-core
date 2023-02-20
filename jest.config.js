/** @type { import('jest').Config} */

const Config = {
   verbose: true,
   moduleNameMapper: {
      '@/(.*)': '<rootDir>/src/$1',
   },
   moduleFileExtensions: ['js', 'json', 'ts'],
};

module.exports = Config;
