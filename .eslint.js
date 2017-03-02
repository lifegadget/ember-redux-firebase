module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  },
  extends: 'eslint:recommended',
  env: {
    browser: true
  },
  rules: {
    "no-console": ["warn", {allow: ["warn", "error"]}],
    "no-unused-vars": 1,
    "no-case-declarations": 0,
  }
};
