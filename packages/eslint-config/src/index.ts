import eslint from "@eslint/js";
import rxjs from "@smarttools/eslint-plugin-rxjs";
import globals from "globals";
import tseslint, { ConfigWithExtends } from "typescript-eslint";

export const config: ConfigWithExtends = {
  ignores: ["dist"],
  extends: [
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylistic,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          // FIXME tsconfigRootDir: __dirname, https://stackoverflow.com/questions/64383909/dirname-is-not-defined-error-in-node-js-14-version
        },
      },
    },
  ],
  files: ["**/*.{ts,tsx}"],
  plugins: {
    rxjs,
  },
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
  },
  rules: {
    // https://eslint.org/docs/latest/rules/
    // https://typescript-eslint.io/rules/
    "@typescript-eslint/no-unnecessary-condition": "warn",
    "@typescript-eslint/strict-boolean-expressions": "warn",
    "no-useless-rename": "warn",
    "rxjs/suffix-subjects": "warn",
    "rxjs/finnish": "warn",
    "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
  },
};
