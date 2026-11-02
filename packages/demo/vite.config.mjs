import { defineConfig, loadEnv } from "vite";
import mkcert from "vite-plugin-mkcert";
import sassDts from "vite-plugin-sass-dts";

export default defineConfig(({ mode }) => {
  const { VITE_HOST, VITE_PORT, VITE_DEV_API_PATH } = loadEnv(
    mode,
    process.cwd(),
  );

  return {
    plugins: [
      mkcert(),
      sassDts({
        legacyFileFormat: true,
      }),
      {
        name: "css-inline",
        enforce: "pre",
        resolveId(id, importer) {
          if (id.match(/(?<!\.module)\.s?css$/)) {
            return this.resolve(`${id}?inline`, importer);
          }
        },
      },
    ],

    css: {
      modules: {
        scopeBehaviour: "local",
        localsConvention: "camelCaseOnly",
      },
    },

    build: {
      minify: false,
    },

    server: {
      host: VITE_HOST,
      port: VITE_PORT != null ? +VITE_PORT : void 0,
      https: true,
      proxy: {
        "/api": {
          target: VITE_DEV_API_PATH,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          secure: false,
        },
      },
    },
  };
});
