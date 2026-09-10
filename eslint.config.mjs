import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      ".codex/**",
      ".codex-reports/**",
      "packages/auth/src/**/*.js",
      "packages/auth/src/**/*.d.ts",
      "packages/auth/src/**/*.map",
      "packages/database/src/**/*.js",
      "packages/database/src/**/*.d.ts",
      "packages/database/src/**/*.map",
      "packages/commercial/src/**/*.js",
      "packages/commercial/src/**/*.d.ts",
      "packages/commercial/src/**/*.map",
      "packages/database/src/business-persistence.ts",
      "packages/database/src/business-persistence.test.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  {
    files: ["**/*.config.*", "**/next.config.ts", "**/vitest.config.ts"],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
  {
    files: ["apps/api/test/**/*.ts", "apps/api/vitest.config.ts"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: {
        project: ["apps/api/tsconfig.eslint.json"],
        projectService: false,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["packages/commercial/scripts/**/*.mjs", "scripts/**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
];
