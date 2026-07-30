export const createElement = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  props: Partial<HTMLElementTagNameMap[K]>,
) => Object.assign(document.createElement(tagName), props);
