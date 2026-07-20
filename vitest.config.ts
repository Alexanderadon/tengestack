import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@scripts": path.resolve(__dirname, "scripts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Windows+антивирус убивает форк-воркеры (V8 crash в tinypool) —
    // однопоточный threads-пул стабилен и для нашего объёма не медленнее.
    pool: "threads",
    poolOptions: {
      threads: { singleThread: true },
    },
  },
});
