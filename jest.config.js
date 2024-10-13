const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js'],
  testMatch: ['**/tests/**/*.spec.ts'],
  rootDir: '.',
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
    '^@prisma/client$': '<rootDir>/node_modules/@prisma/client', // Make sure @prisma/client resolves correctly
  },
};