import path from "path"
import { defineConfig } from "vitest/config"

// Plasmo's bundler resolves asset imports via custom schemes (e.g.
// `data-base64:`, `url:`). Vite/Vitest don't understand them, so stub any such
// import to an empty string for the test environment.
const plasmoSchemeStub = {
  name: "plasmo-scheme-stub",
  enforce: "pre" as const,
  resolveId(id: string) {
    if (id.startsWith("data-base64:") || id.startsWith("url:")) {
      return `\0plasmo-scheme-stub:${id}`
    }
  },
  load(id: string) {
    if (id.startsWith("\0plasmo-scheme-stub:")) {
      return 'export default ""'
    }
  },
}

export default defineConfig({
  plugins: [plasmoSchemeStub],
  resolve: {
    alias: {
      "~lib": path.resolve(__dirname, "src/lib"),
      "~components": path.resolve(__dirname, "src/components"),
      "~hooks": path.resolve(__dirname, "src/hooks"),
    },
  },
  // Use the React 17+ automatic JSX runtime so test files (and the source
  // files they import) don't need an explicit `import React`.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    // Vitest picks up *.spec.ts by default; explicitly exclude the Playwright
    // suite under tests/e2e so `pnpm test` only runs unit tests, and ignore
    // agent-session dirs (.claude worktrees/scratchpads, .codex-agent-view
    // repo mirrors) that would otherwise be collected.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "tests/e2e/**",
      "**/.claude/**",
      "**/.codex-agent-view/**",
    ],
    // Load jest-dom matchers for every spec.
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/contents/overlay.tsx",
        "src/contents/use-overlay.ts",
        "src/contents/use-annotations.ts",
        "src/contents/use-picking.ts",
        "src/contents/overlay-helpers.ts",
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
