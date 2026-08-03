import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/database/index.ts",
    "src/math/index.ts",
    "src/observable/index.ts",
    "src/promise/index.ts",
  ],
  format: "esm",
  dts: {
    sourcemap: true,
  },
  exports: {
    legacy: true,
  },
});
