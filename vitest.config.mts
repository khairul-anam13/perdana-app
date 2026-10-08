import "dotenv/config";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tes integrasi memakai database terpisah `perdana_test` (dibuat otomatis oleh global setup).
const base =
  process.env.DATABASE_URL ?? "postgresql://perdana:perdana_dev_local@localhost:5432/perdana";
const testUrl = base.replace(/\/[^/?]+(\?|$)/, "/perdana_test$1");

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["./vitest.global-setup.ts"],
    env: { DATABASE_URL: testUrl },
    fileParallelism: false, // semua tes DB berbagi satu database
    testTimeout: 20_000,
  },
});
