// This Babel configuration is only used for Jest tests, not for Next.js
const isTest = process.env.NODE_ENV === 'test';

module.exports = isTest ? {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
} : {}; 