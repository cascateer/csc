import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/jsx-runtime.ts",
    "./src/jsx-dev-runtime.ts",
    "./src/multicast.ts",
    "./src/operators/index.ts",
    "./src/test/index.ts",
    "./src/vite.ts",
  ],
  format: "esm",
  dts: {
    sourcemap: true,
  },
  deps: {
    neverBundle: "react",
  },
  exports: {
    legacy: true,
  },
  globImport: true,
});
