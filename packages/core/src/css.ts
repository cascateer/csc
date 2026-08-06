import { keyMapBy, property } from "@cascateer/lib";
import { isObject, isString, once } from "lodash";

const cssImports = once(() =>
  Promise.all(
    [
      ...Object.entries(import.meta.glob("/**/*.*css")),
      ...Object.entries(import.meta.glob("/**/*.*css", { query: "?inline" })),
    ].map(([url, load]) =>
      load().then(async (module) => {
        const DEFAULT_KEY = "default";

        return {
          url,
          module,
          styleSheet:
            isObject(module) &&
            DEFAULT_KEY in module &&
            isString(module[DEFAULT_KEY])
              ? await new CSSStyleSheet().replace(module[DEFAULT_KEY])
              : null,
        };
      }),
    ),
  )
    .then((imports) => ({
      urls: keyMapBy(imports, property("module"), property("url")),
      styleSheets: keyMapBy(
        imports,
        property("url"),
        ({ url, styleSheet }, styleSheets): CSSStyleSheet[] =>
          (styleSheets.get(url) ?? []).concat(styleSheet ?? []),
      ),
    }))
    .then((imports) => (console.debug("Imported styles", imports), imports)),
);

export const cssStyleSheets = (modules: unknown[]) =>
  cssImports().then(({ urls, styleSheets }) =>
    modules.flatMap((module) => {
      const url = urls.get(module);

      if (url == null) {
        console.warn(`Style ${url} of`, modules, `could not be resolved.`);

        return [];
      }

      return styleSheets.get(url) ?? [];
    }),
  );
