import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "~lib": path.resolve(__dirname, "src/lib"),
    },
  },
  test: {
    environment: "jsdom",
    // Vitest picks up *.spec.ts by default; explicitly exclude the Playwright
    // suite under tests/e2e so `pnpm test` only runs unit tests.
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/contents/overlay.tsx",
        "src/components/**",
        "src/lib/types.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
