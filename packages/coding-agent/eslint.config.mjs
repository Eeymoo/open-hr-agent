import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "max-depth": ["warn", 3],
      "max-lines-per-function": ["warn", 100],
      "max-statements": ["warn", 30],
      "complexity": ["warn", 10]
    }
  }
);