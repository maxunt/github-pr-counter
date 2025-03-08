module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle module aliases and CSS imports
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transform: {
    // Use ts-jest for TypeScript files
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      jsx: 'react',
    }],
    // Use babel-jest for JavaScript files with custom config path
    '^.+\\.(js|jsx)$': ['babel-jest', { 
      configFile: './babel.config.test.js',
      presets: ['next/babel'] 
    }],
  },
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
}; 