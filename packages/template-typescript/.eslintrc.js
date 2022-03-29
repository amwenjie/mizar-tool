module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.json"],
    },
    rules: {
        "@typescript-eslint/no-unused-vars": 0,
        "@typescript-eslint/no-unsafe-argument": 0,
        "@typescript-eslint/no-unsafe-call": 0,
        "@typescript-eslint/no-unsafe-assignment": 0,
        "@typescript-eslint/restrict-plus-operands": 0,
        "@typescript-eslint/no-unsafe-member-access": 0,
    },
    plugins: [
        "@typescript-eslint",
    ],
    extends: [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
    ],
    overrides: [{
        "files": [
            "webpack.config/*.js",
            ".eslintrc.js",
        ],
        "env": {
            "node": true,
            "browser": false,
        },
    }],
    settings: {
        "react": {
            "version": "detect",
        },
    },
};