import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/modules/*/*",
                "!@/modules/*/index",
                "!@/modules/*/components",
                "@/modules/*/components/*",
                "!@/modules/*/components/index",
              ],
              message:
                "Otro módulo solo se importa desde index.ts o components/index.ts.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".impeccable/**",
    ".next/**",
    "build/**",
    "next-env.d.ts",
    "out/**",
    "playwright-report/**",
    // Generado por shadcn/ui junto con Sidebar; CLAUDE.md prohíbe modificarlo sin aprobación.
    "src/hooks/use-mobile.ts",
    "test-results/**",
  ]),
]);

export default eslintConfig;
