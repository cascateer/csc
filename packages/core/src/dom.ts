import { kebabCase } from "@cascateer/lib";
import { asObservable, reduce } from "@cascateer/lib/observable";
import { Dictionary, fromPairs, memoize, tap } from "lodash";
import { MonoTypeOperatorFunction, combineLatest, switchMap } from "rxjs";
import { createFragment } from "./jsx-runtime";

export const unlink = <T extends Node>(...nodes: T[]) => {
  for (const node of nodes) {
    node.parentNode?.removeChild(node);
  }
};

export class CustomElement extends HTMLElement {
  constructor(children?: JSX.Children, styles: CSSStyleSheet[] = []) {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });

    shadowRoot.adoptedStyleSheets.push(...styles);
    shadowRoot.append(createFragment({ children }));
  }
}

export const defineCustomElement = memoize((key: string) =>
  tap(class extends CustomElement {}, (constructor) =>
    customElements.define(key, constructor),
  ),
);

/**
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/API/CSS/registerProperty_static
 */
export const registerCustomProperty = (
  name: keyof JSX.CSSCustomPropertyDefinitions,
  definition: JSX.CSSCustomPropertyDefinition,
) =>
  CSS.registerProperty({
    ...definition,
    inherits: Boolean(definition.inherits),
    name,
  });

export const setStyleProperties =
  <T extends HTMLElement | SVGElement>(
    element: T,
  ): MonoTypeOperatorFunction<JSX.CSSProperties> =>
  (source) =>
    source.pipe(
      switchMap((propertyValue) => {
        const assign = (
          target: T,
          source: Dictionary<
            string | number | (string & {}) | (number & {}) | undefined
          >,
        ) => {
          for (const [name, value] of Object.entries(source)) {
            if (value != null) {
              target.style.setProperty(
                name.startsWith("--") ? name : kebabCase(name),
                value.toString(),
              );
            }
          }

          return source;
        };

        return combineLatest(
          fromPairs(
            Object.entries(propertyValue).map(([key, value]) => [
              key,
              asObservable(value),
            ]),
          ),
        ).pipe(
          reduce(
            (previousStyle, style) => {
              for (const name in previousStyle) {
                element.style.removeProperty(name);
              }

              return assign(element, style);
            },
            (style) => assign(element, style),
          ),
        );
      }),
    );
