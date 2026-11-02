import { isObject, isString, once, tap } from "lodash";

export class CSSStyleSheets {
  private static readonly lookup = once(() =>
    Promise.all(
      [
        ...Object.entries(import.meta.glob("/**/*.module.*css")),
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
    ).then((imports) =>
      imports.reduce(
        (imports, { url, module, styleSheet }) =>
          tap(imports, ({ urls, styleSheets }) => {
            urls.set(module, url);
            styleSheets.set(
              url,
              (styleSheets.get(url) ?? []).concat(styleSheet ?? []),
            );
          }),
        {
          urls: new Map<unknown, string>(),
          styleSheets: new Map<string, CSSStyleSheet[]>(),
        },
      ),
    ),
  );

  of(...modules: unknown[]): Promise<CSSStyleSheet[]> {
    return Promise.all(
      modules.map((module) =>
        CSSStyleSheets.lookup().then(({ urls, styleSheets }) => {
          const url = urls.get(module);

          if (url == null) {
            console.error(`URL ${url} of`, module, `could not be resolved.`);

            return [];
          }

          return styleSheets.get(url) ?? [];
        }),
      ),
    ).then((styleSheets) => styleSheets.flat());
  }
}
