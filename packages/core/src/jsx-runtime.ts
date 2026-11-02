import { asArray, keys, MaybeArray } from "@cascateer/lib";
import {
  asObservable,
  MaybeObservable,
  MaybeObservableTuple,
} from "@cascateer/lib/observable";
import cn from "classnames";
import { htmlTagNames } from "html-tag-names";
import {
  bind,
  camelCase,
  difference,
  Function1,
  isFunction,
  isObject,
  isString,
  tap,
  thru,
} from "lodash";
import React from "react";
import {
  defer,
  distinctUntilChanged,
  filter,
  fromEvent,
  isObservable,
  map,
  Observable,
  Observer,
  shareReplay,
  Subscriber,
  Subscription,
  tap as tapOperator,
} from "rxjs";
import { svgTagNames } from "svg-tag-names";
import { Primitive } from "utility-types";
import { v4 } from "uuid";
import { CSSStyleSheets } from "./css";
import { setStyleProperties, unlink } from "./dom";
import { ObservableFragment } from "./fragment";

const verbose = false;

export class FinalizationObserver {
  static registerCount = 0;
  static registry = new FinalizationRegistry<() => void>((cb) => cb());

  #subscriber?: Subscriber<void>;
  subscribe: (
    observerOrNext?: Partial<Observer<void>> | ((value: void) => void),
  ) => Subscription;

  constructor(key: WeakKey) {
    const id = `value-${v4()}`;
    const token = new WeakRef(key);
    const finalized$ = new Observable<void>((subscriber) => {
      this.#subscriber = subscriber;

      return {
        unsubscribe: () => FinalizationObserver.registry.unregister(token),
      };
    }).pipe(
      tapOperator(
        verbose
          ? {
              subscribe: () =>
                console.debug(
                  `%c[${`${++FinalizationObserver.registerCount}`.toString().padStart(6, "0")}] %cRegistered {${id}}`,
                  null,
                  "color: #e06c75",
                ),
              complete: () =>
                console.debug(
                  `%c[${`${--FinalizationObserver.registerCount}`.toString().padStart(6, "0")}] %cFinalized  {${id}}`,
                  null,
                  "color: #98c379",
                ),
            }
          : void 0,
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    FinalizationObserver.registry.register(
      key,
      () => {
        this.#subscriber?.next();
        this.#subscriber?.complete();

        FinalizationObserver.registry.unregister(token);
      },
      token,
    );

    this.subscribe = finalized$.subscribe.bind(finalized$);
  }
}

// TODO
const fromDocumentEvent = (element: HTMLElement, type: string) =>
  thru(new WeakRef(element), (elementRef) =>
    fromEvent(document, type).pipe(
      filter((event) => event.composedPath()[0] === elementRef.deref()),
      distinctUntilChanged(),
    ),
  );

type DocumentEventListener<EventName extends keyof DocumentEventMap> =
  | Partial<Observer<DocumentEventMap[EventName]>>
  | Function1<DocumentEventMap[EventName], unknown>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type BaseElement = Node | Primitive;

    type Element = MaybeObservable<BaseElement>;

    type ElementLike = Element | PromiseLike<Element> | Observable<Element>;

    type Children = MaybeObservable<MaybeArray<Element>>;

    interface IntrinsicAttributes {
      children?: Children;
    }

    export type CSSCustomPropertyDefinition = Omit<PropertyDefinition, "name">;

    export type CSSCustomIntegerPropertyDefinition =
      CSSCustomPropertyDefinition & { syntax: "<integer>" };

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    export interface CSSCustomPropertyDefinitions extends Record<
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      keyof {},
      CSSCustomPropertyDefinition
    > {}

    type CSSCustomProperties = Record<
      // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
      keyof CSSCustomPropertyDefinitions & `--${string}`,
      string | number
    >;

    type CSSProperties = MaybeObservableTuple<
      React.CSSProperties | Partial<CSSCustomProperties>
    >;

    type IntrinsicElementTagName = keyof (HTMLElementTagNameMap &
      SVGElementTagNameMap);

    type DetailedAttributes<TagName extends IntrinsicElementTagName> = {
      [
        AttributeName in keyof Omit<
          React.JSX.IntrinsicElements[TagName],
          | "children"
          | "dangerouslySetInnerHTML"
          | "ref"
          | "suppressHydrationWarning"
        >
      ]: AttributeName extends `on${infer ReactEventName}`
        ? Lowercase<ReactEventName> extends keyof DocumentEventMap
          ? DocumentEventListener<Lowercase<ReactEventName>>
          : never
        : MaybeObservable<
            AttributeName extends "className"
              ? MaybeArray<string>
              : AttributeName extends "style"
                ? CSSProperties
                : React.JSX.IntrinsicElements[TagName][AttributeName]
          >;
    };

    type IntrinsicElements = {
      [TagName in IntrinsicElementTagName]: IntrinsicAttributes &
        DetailedAttributes<TagName>;
    };

    type Props = object;

    type ComponentProps<P extends Props = Props> = IntrinsicAttributes & P;

    type Component<P extends Props = Props> = (
      props: ComponentProps<P>,
    ) => Element;

    type ComponentLike<P extends Props> = (
      props: ComponentProps<P>,
    ) => ElementLike;
  }
}

export const createFragment = (
  ...params: ConstructorParameters<typeof ObservableFragment>
) => new ObservableFragment(...params);

export const createElement = (
  componentOrTagName: JSX.Component | string,
  attributes: JSX.IntrinsicAttributes | null,
  ...tagContent: JSX.Children[]
): JSX.Element => {
  const { children: rawChildren = tagContent, ...propsWithoutChildren } =
      attributes ?? {},
    children = asArray(rawChildren).map((children) =>
      asObservable(children).pipe(
        map((children) =>
          isObservable(children) || Array.isArray(children)
            ? createFragment({ children })
            : children,
        ),
      ),
    );

  switch (typeof componentOrTagName) {
    case "function": {
      const Component = componentOrTagName;

      return Component({ ...propsWithoutChildren, children });
    }
    case "string": {
      const tagName = componentOrTagName as JSX.IntrinsicElementTagName;
      const namespaceURI = difference(svgTagNames, htmlTagNames).includes(
        tagName,
      )
        ? "http://www.w3.org/2000/svg"
        : null;

      const element =
        namespaceURI != null
          ? document.createElementNS(namespaceURI, tagName)
          : document.createElement(tagName);

      const setAttribute = (
        element: HTMLElement | SVGElement,
        qualifiedName: string,
        value: unknown,
      ) => {
        if (value == null) {
          if (namespaceURI != null) {
            element.removeAttribute(qualifiedName);
          } else {
            element.removeAttributeNS(namespaceURI, qualifiedName);
          }
        } else {
          if (namespaceURI != null) {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            element.setAttribute(qualifiedName, String(value));
          } else {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            element.setAttributeNS(namespaceURI, qualifiedName, String(value));
          }
        }
      };

      for (const [name, value] of Object.entries(propsWithoutChildren)) {
        const eventName = name.match(/^on(.*)$/)?.[1]?.toLowerCase();

        if (eventName != null) {
          fromEvent(element, eventName).subscribe(
            ...(isFunction(value)
              ? [value]
              : isObject(value)
                ? [
                    [...keys(value)].reduce<Partial<Observer<unknown>>>(
                      (observer, key) => {
                        const observerKey = [
                          "next" as const,
                          "error" as const,
                          "complete" as const,
                        ].find((observerKey) => observerKey === key);

                        const observerValue = value[key];

                        if (observerKey != null && isFunction(observerValue)) {
                          observer[observerKey] = bind(observerValue, value);
                        }

                        return observer;
                      },
                      {},
                    ),
                  ]
                : []),
          );
        } else if (name === "style") {
          asObservable(value as JSX.CSSCustomProperties)
            .pipe(setStyleProperties(element))
            .subscribe();
        } else {
          asObservable(value).subscribe({
            next: (propertyValue) => {
              if (name === "className") {
                setAttribute(
                  element,
                  "class",
                  cn(
                    asArray(propertyValue).flatMap((classPart) =>
                      isString(classPart) ? classPart : [],
                    ),
                  ),
                );
              } else if (name.startsWith("data-")) {
                const camelCaseName = camelCase(name.replace(/^data/, ""));

                if (propertyValue == null) {
                  delete element.dataset[camelCaseName];
                } else {
                  const dataKey = camelCase(name.replace(/^data/, ""));

                  if (propertyValue === false) {
                    delete element.dataset[dataKey];
                  } else {
                    element.dataset[dataKey] =
                      // eslint-disable-next-line @typescript-eslint/no-base-to-string
                      String(propertyValue);
                  }
                }
              } else if (name === "disabled" && !propertyValue) {
                element.removeAttribute(name);
              } else if (
                name === "checked" &&
                element instanceof HTMLInputElement &&
                element.type === "checkbox"
              ) {
                element.checked = Boolean(propertyValue);
              } else {
                setAttribute(element, name.toLowerCase(), propertyValue);
              }
            },
          });
        }
      }

      element.append(createFragment({ children }));

      new FinalizationObserver(element).subscribe();

      return element;
    }
  }
};

export const createRoot = (root: Node, ...styles: Promise<unknown>[]) => ({
  render: (children?: JSX.Children) => (
    unlink(...root.childNodes),
    tap(root, (root) =>
      root.appendChild(
        new ObservableFragment({
          children: defer(() =>
            Promise.all(styles)
              .then((styles) => new CSSStyleSheets().of(...styles))
              .then((styles) => document.adoptedStyleSheets.push(...styles)),
          ).pipe(map(() => createFragment({ children }))),
        }),
      ),
    )
  ),
});

export const Fragment = createFragment;
export const jsx = createElement;
export const jsxs = createElement;
