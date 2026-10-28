// Runs on staged files only, from .husky/pre-commit.
export default {
  '*.{ts,tsx,js,mjs}': ['prettier --write', 'eslint --max-warnings 0 --fix'],
  '*.{json,css,yml,yaml}': ['prettier --write'],
};
