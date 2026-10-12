import { asArray, keys, MaybeArray } from "@cascateer/lib";
import {
  asObservable,
  MaybeObservable,
  MaybeObservableInputTuple,
  reduce,
} from "@cascateer/lib/observable";
import {
  bind,
  camelCase,
  Dictionary,
  fromPairs,
  Function1,
  isFunction,
  isObject,
  kebabCase,
  tap,
  thru,
} from "lodash";
import React, { CSSProperties } from "react";
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  fromEvent,
  ignoreElements,
  isObservable,
  map,
  Observable,
  Observer,
  of,
  shareReplay,
  Subscriber,
  Subscription,
  switchMap,
  tap as tapOperator,
} from "rxjs";
import { Primitive } from "utility-types";
import { v4 } from "uuid";
import { unlink } from "./dom";
import { ObservableFragment } from "./fragment";

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
      tapOperator({
        subscribe: () =>
          console.info(
            `%c[${`${++FinalizationObserver.registerCount}`.toString().padStart(6, "0")}] %cRegistered {${id}}`,
            null,
            "color: #e06c75",
          ),
        complete: () =>
          console.info(
            `%c[${`${--FinalizationObserver.registerCount}`.toString().padStart(6, "0")}] %cFinalized  {${id}}`,
            null,
            "color: #98c379",
          ),
      }),
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

const fromDocumentEvent = (element: HTMLElement, type: string) =>
  thru(new WeakRef(element), (elementRef) =>
    fromEvent(document, type).pipe(
      filter((event) => event.composedPath()[0] === elementRef.deref()),
      distinctUntilChanged(),
    ),
  );

type DocumentEventListener<EventName extends keyof DocumentEventMap> =
  | Partial<Observer<DocumentEventMap[EventName]>>
  | Function1<DocumentEventMap[EventName], void>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type Element = MaybeObservable<Node | Primitive>;

    type Children = MaybeObservable<MaybeArray<Element>>;

    interface IntrinsicAttributes {
      children?: Children;
      onTeardown?: () => void;
    }

    type IntrinsicElements = {
      [TagName in keyof HTMLElementTagNameMap]: IntrinsicAttributes & {
        [
          AttributeName in keyof Omit<
            React.JSX.IntrinsicElements[TagName],
            "children" | "dangerouslySetInnerHTML" | "ref"
          >
        ]: AttributeName extends `on${infer ReactEventName}`
          ? Lowercase<ReactEventName> extends keyof DocumentEventMap
            ? DocumentEventListener<Lowercase<ReactEventName>>
            : never
          : MaybeObservable<
              AttributeName extends "className"
                ? MaybeArray<string>
                : AttributeName extends "style"
                  ? MaybeObservableInputTuple<
                      CSSProperties | CSSCustomProperties
                    >
                  : React.JSX.IntrinsicElements[TagName][AttributeName]
            >;
      };
    };

    type Props = Record<string, unknown>;

    type Component<P extends Props = Props> = (
      props: IntrinsicAttributes & P,
    ) => Element;

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
  }
}

export const createFragment = (
  ...params: ConstructorParameters<typeof ObservableFragment>
) => new ObservableFragment(...params);

export const createElement = (
  component: JSX.Component | string,
  attributes: JSX.IntrinsicAttributes | null,
  ...tagContent: JSX.Children[]
): JSX.Element => {
  const {
      children: rawChildren = tagContent,
      onTeardown,
      ...propsWithoutChildren
    } = attributes ?? {},
    children = asArray(rawChildren).map((children) =>
      asObservable(children).pipe(
        map((children) =>
          isObservable(children) || Array.isArray(children)
            ? createFragment({ children })
            : children,
        ),
      ),
    );

  switch (typeof component) {
    case "function":
      return component({ ...propsWithoutChildren, children });
    case "string": {
      const element = document.createElement(component);

      for (const [name, value] of Object.entries(propsWithoutChildren)) {
        const eventName = name.match(/^on(.*)$/)?.[1]?.toLowerCase();

        if (eventName != null) {
          fromDocumentEvent(element, eventName).subscribe(
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
        } else {
          asObservable(value)
            .pipe(
              switchMap((propertyValue) => {
                const assignStyles = (
                  target: HTMLElement,
                  source: Dictionary<unknown>,
                ) => {
                  for (const [name, value] of Object.entries(source)) {
                    target.style.setProperty(
                      name.startsWith("--") ? name : kebabCase(name),
                      String(value),
                    );
                  }

                  return source;
                };

                return name === "style" && isObject(propertyValue)
                  ? combineLatest(
                      fromPairs(
                        Object.entries(propertyValue).map(([key, value]) => [
                          key,
                          asObservable(value),
                        ]),
                      ),
                    )
                      .pipe(
                        reduce(
                          (previousStyle, style) => {
                            for (const name in previousStyle) {
                              element.style.removeProperty(name);
                            }

                            return assignStyles(element, style);
                          },
                          (style) => assignStyles(element, style),
                        ),
                      )
                      .pipe(ignoreElements())
                  : of(propertyValue);
              }),
            )
            .subscribe({
              next: (propertyValue) => {
                if (name === "className") {
                  element.setAttribute(
                    "class",
                    String(propertyValue).replaceAll(",", " "),
                  );
                } else if (name.startsWith("data-")) {
                  const camelCaseName = camelCase(name.replace(/^data/, ""));

                  if (propertyValue == null) {
                    delete element.dataset[camelCaseName];
                  } else {
                    element.dataset[camelCase(name.replace(/^data/, ""))] =
                      // eslint-disable-next-line @typescript-eslint/no-base-to-string
                      String(propertyValue);
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
                  element.setAttribute(name, String(propertyValue));
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

export const createRoot = (root: Node) => ({
  render: (children?: JSX.Children) => (
    unlink(...root.childNodes),
    tap(root, (root) =>
      root.appendChild(
        createFragment({
          children,
        }),
      ),
    )
  ),
});

export const Fragment = createFragment;
export const jsx = createElement;
export const jsxs = createElement;
