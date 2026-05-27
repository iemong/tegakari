import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "~lib": path.resolve(__dirname, "src/lib"),
      "~components": path.resolve(__dirname, "src/components"),
    },
  },
  // Use the React 17+ automatic JSX runtime so test files (and the source
  // files they import) don't need an explicit `import React`.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    // Vitest picks up *.spec.ts by default; explicitly exclude the Playwright
    // suite under tests/e2e so `pnpm test` only runs unit tests.
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    // Load jest-dom matchers for every spec.
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/contents/overlay.tsx",
        "src/components/**",
        "src/lib/types.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
})
