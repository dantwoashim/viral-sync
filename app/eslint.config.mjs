import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated native/web build artifacts:
    "android/**",
    "ios/**",
  ]),
]);

export default eslintConfig;
