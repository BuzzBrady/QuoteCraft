// functions/eslint.config.js
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    languageOptions: {
      globals: { ...globals.node },
      parser: tseslint.parser,
      parserOptions: { project: "./tsconfig.json", sourceType: "module", ecmaVersion: 2022 },
    },
    files: ["src/**/*.ts"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-expressions": "off",
      "quotes": ["error", "double"],
      "semi": ["error", "always"],
      "indent": ["error", 2],
      "max-len": ["warn", { "code": 120, "ignoreStrings": true, "ignoreTemplateLiterals": true, "ignoreComments": true }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off", 
      "import/no-unresolved": "off", 
    },
  },
  { 
    ignores: ["lib/", "node_modules/", "eslint.config.js", "*.json", "*.md"] 
  }
];