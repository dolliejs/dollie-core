module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'alloy/typescript',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  rules: {
    semi: ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    quotes: ['error', 'single'],
    'no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 1 }],
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/consistent-type-assertions': 'off',
    '@typescript-eslint/no-require-imports': 'off',
  },
};
