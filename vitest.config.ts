import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts"],
    globals: true
  },
  resolve: {
    alias: {
      "@kf/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)),
      "@kf/costing-engine": fileURLToPath(new URL("./packages/costing-engine/src/index.ts", import.meta.url)),
      "@kf/importers": fileURLToPath(new URL("./packages/importers/src/index.ts", import.meta.url))
    }
  }
});
