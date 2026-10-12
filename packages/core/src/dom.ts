import { isObject, memoize, tap } from "lodash";
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

export const registerCustomProperties = (
  definitions: Partial<JSX.CSSCustomPropertyDefinitions>,
) => {
  for (const [name, definition] of Object.entries(definitions)) {
    if (isObject(definition) && "inherits" in definition) {
      CSS.registerProperty({
        ...definition,
        inherits: Boolean(definition.inherits),
        name,
      });
    }
  }
};
