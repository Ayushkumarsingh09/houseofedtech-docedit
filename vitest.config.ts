import react from "@vitejs/plugin-react";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { defineConfig } from "vitest/config";

// `.env` intentionally wins for DATABASE_URL/DIRECT_URL: it points at Neon's
// *unpooled* connection, which is far more stable for a long-running test
// process making many rapid sequential queries than the PgBouncer-pooled
// connection string in `.env.local` (which is optimized for short-lived
// serverless function invocations instead).
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: true });

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    setupFiles: ["./tests/setup.ts"],
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/app/**",
        "src/components/ui/**",
        "src/generated/**",
        "**/*.d.ts",
        "src/config/env.ts",
      ],
    },
  },
});
