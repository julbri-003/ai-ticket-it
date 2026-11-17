import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/coverage/**",
    "**/.expo/**",
    "**/dist/**",
    "**/uploads/**",
  ]),
  {
    files: ["packages/backend/**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["packages/backend/tests/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
  {
    files: [
      "packages/frontend/src/**/*.{js,jsx,mjs,cjs}",
      "packages/frontend/App.jsx",
      "packages/frontend/__tests__/**/*.{js,jsx}",
      "packages/frontend/pruebas/**/*.{js,jsx}",
    ],
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: { ...globals.browser, process: "readonly" },
    },
    settings: { react: { version: "detect" } },
  },
  {
    files: [
      "packages/frontend/src/**/*.{js,jsx,mjs,cjs}",
      "packages/frontend/App.jsx",
      "packages/frontend/__tests__/**/*.{js,jsx}",
      "packages/frontend/pruebas/**/*.{js,jsx}",
    ],
    plugins: { "react-hooks": pluginReactHooks },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  {
    files: [
      "packages/frontend/**/__tests__/**/*.{js,jsx}",
      "packages/frontend/**/*.test.{js,jsx}",
      "packages/frontend/pruebas/**/*.{js,jsx}",
      "packages/frontend/jest.setup.js",
    ],
    languageOptions: { globals: { ...globals.jest } },
  },
]);
