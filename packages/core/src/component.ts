import { kebabCase } from "@cascateer/lib";
import { defer } from "rxjs";
import { CSSStyleSheets } from "./css";
import { defineCustomElement } from "./dom";
import { createFragment } from "./jsx-runtime";
import { fromComponentLike } from "./operators";

export function createComponent<Context>(
  ns: string,
  ctx: Context,
): (name?: string) => {
  withStyles: <Styles extends Promise<unknown>[]>(
    ...styles: Styles
  ) => {
    withTemplate: <Props extends JSX.Props>(
      constructor: (
        ctx: Context,
        ...classNames: { -readonly [K in keyof Styles]: Awaited<Styles[K]> }
      ) => JSX.ComponentLike<Props>,
    ) => JSX.Component<Props>;
  };
  withTemplate: <Props extends JSX.Props>(
    constructor: (ctx: Context) => JSX.ComponentLike<Props>,
  ) => JSX.Component<Props>;
} {
  return (name?: string) => {
    const withTemplate =
      <Styles extends Promise<unknown>[]>(...styles: Styles) =>
      <Props extends JSX.Props>(
        constructor: (
          ctx: Context,
          ...classNames: { -readonly [K in keyof Styles]: Awaited<Styles[K]> }
        ) => JSX.ComponentLike<Props>,
      ) =>
      (props: Props) =>
        createFragment({
          children: defer(() =>
            Promise.all(styles).then((cssModules) => {
              const element = fromComponentLike(
                constructor(ctx, ...cssModules),
              )(props);

              return name != null
                ? new CSSStyleSheets()
                    .of(...cssModules)
                    .then(
                      (cssStyleSheets) =>
                        new (defineCustomElement(kebabCase(ns, name)))(
                          element,
                          cssStyleSheets,
                        ),
                    )
                : element;
            }),
          ),
        });

    return {
      withStyles: <Styles extends Promise<unknown>[]>(...styles: Styles) => ({
        withTemplate: withTemplate(...styles),
      }),
      withTemplate: withTemplate(),
    };
  };
}

export function createStandaloneComponent(name?: string) {
  return createComponent("html", {})(name);
}
