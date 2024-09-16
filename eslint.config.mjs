import jsLint from "@eslint/js";
import tsESLintPlugin from "@typescript-eslint/eslint-plugin";
import tsESLintParser from "@typescript-eslint/parser";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import tsESLint from 'typescript-eslint';

const customeLintConfig = [
    {
        files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
        ignores: ["dist/", "node_modules/"],
        ...reactPlugin.configs.flat.recommended,
        languageOptions: {
            parser: tsESLintParser,
            ...reactPlugin.configs.flat.recommended.languageOptions,
            parserOptions: {
                tsconfigRootDir: ".",
                project: ["./tsconfig.json"],
            },
            globals: {
                ...globals.serviceworker,
                ...globals.browser,
            },
        },
        plugins: {
            "@typescript-eslint": tsESLintPlugin,
            react: reactPlugin,
        },
        rules: {
            "@typescript-esling/no-require-imports": 0,
            "@typescript-eslint/no-misused-promises": 0,
            "@typescript-eslint/require-await": 0,
            "@typescript-eslint/no-empty-function": 0,
            "@typescript-eslint/no-unsafe-return": 0,
            "@typescript-eslint/no-unused-vars": 0,
            "@typescript-eslint/no-unsafe-argument": 0,
            "@typescript-eslint/no-unsafe-call": 0,
            "@typescript-eslint/no-unsafe-assignment": 0,
            "@typescript-eslint/restrict-plus-operands": 0,
            "@typescript-eslint/no-unsafe-member-access": 0,
            "@typescript-eslint/restrict-template-expressions": 0,
            "@typescript-eslint/no-floating-promises": 0,
            "@typescript-eslint/no-explicit-any": 0,
            "@typescript-eslint/no-unused-expressions": 0,
        },
    },
];

export default tsESLint.config(
    jsLint.configs.recommended,
    ...tsESLint.configs.recommended,
    ...customeLintConfig,
);