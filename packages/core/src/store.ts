import { EndoFunction, LazyDictionary, Serializable } from "@cascateer/lib";
import {
  DerivedSignal,
  flatMap,
  reduce,
  Signal,
} from "@cascateer/lib/observable";
import { constant, Dictionary, Function1, mapValues, noop, tap } from "lodash";
import {
  combineLatest,
  defer,
  fromEvent,
  map,
  merge,
  mergeMap,
  Observable,
  ReplaySubject,
  shareReplay,
  tap as tapOperator,
} from "rxjs";
import { MulticastAction } from "./operators";
import {
  assertIsMulticastSeedActionMessage,
  isMulticastSeedActionMessage,
  multicast,
  MulticastBaseActionMessage,
  MulticastClientMessage,
  MulticastMessageConstructor,
} from "./operators/multicast";
import { Action } from "./types";

type StoreEffect<Data, Result> = () => Signal<Data, Result>;

export type StoreEffects<
  Data,
  Signals extends Dictionary<DerivedSignal<Data, any>>,
> = {
  [K in keyof Signals]: ReturnType<
    <
      Result extends (Signals[K] extends DerivedSignal<Data, infer Result>
        ? Result
        : never),
    >() => StoreEffect<Data, Result>
  >;
};

export const asStoreEffects = <
  Data,
  Signals extends Dictionary<DerivedSignal<Data, any>>,
>(
  signals: Signals,
): StoreEffects<Data, Signals> =>
  mapValues(signals, (signal) => () => signal.clone());

export class StoreAdapter<
  Data,
  Signals extends Dictionary<DerivedSignal<Data, any>>,
  Actions extends Dictionary<Action<any, any>>,
> {
  constructor(
    public signals: Signals,
    public actions: Actions,
  ) {}
}

export class LazyStoreAdapter<
  Data,
  Signals extends Dictionary<DerivedSignal<Data, any>>,
  Actions extends Dictionary<Action<any, any>>,
> {
  complete(): StoreAdapter<Data, Signals, Actions> {
    return new StoreAdapter(
      this.lazySignals.complete(),
      this.lazyActions.complete(),
    );
  }

  constructor(
    protected reducer: StoreReducer<Data>,
    protected lazySignals: LazyDictionary<DerivedSignal<Data, any>, Signals>,
    protected lazyActions: LazyDictionary<Action<any, any>, Actions>,
  ) {}

  provideEffects<MoreSignals extends Dictionary<DerivedSignal<Data, any>>>(
    effects: Function1<
      {
        effect: <T>(
          constructor: Function1<Signals, DerivedSignal<Data, T>>,
        ) => DerivedSignal<Data, T>;
      },
      MoreSignals
    >,
  ) {
    return new LazyStoreAdapter(
      this.reducer,
      this.lazySignals.extend(
        (currentSignals) => () =>
          effects({
            effect: (constructor) => constructor(currentSignals),
          }),
      ),
      this.lazyActions,
    );
  }

  provideActions<MoreActions extends Dictionary<Action<any, any>>>(
    actions: Function1<
      {
        action: <Args>(
          constructor: Function1<
            {
              [K in keyof Signals]: {
                update: <
                  T extends (Signals[K] extends DerivedSignal<Data, infer T>
                    ? T
                    : never),
                >(
                  predicate: Function1<Args, EndoFunction<T>>,
                  config?: { sameOrigin?: boolean },
                ) => Action<Args, Data>;
              };
            },
            Action<Args, Data>
          >,
        ) => Action<Args, Data>;
      },
      MoreActions
    >,
  ) {
    return new LazyStoreAdapter(
      this.reducer,
      this.lazySignals,
      this.lazyActions.extend(
        () =>
          ({ property }) =>
            actions({
              action: (constructor) =>
                property((actionKey) =>
                  constructor(
                    mapValues(this.lazySignals.currentValue, (target) => ({
                      update: (predicate, config = {}) => {
                        const callbacks = new Map<
                          string,
                          Function1<Data, void>
                        >();

                        this.reducer.subscribe(actionKey, (event) => ({
                          ...event,
                          target,
                          predicate: target.retract(
                            predicate(
                              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                              Serializable.parse(event.data.args ?? null),
                            ),
                          ),
                          callback: callbacks.get(event.id),
                        }));

                        return (args) =>
                          new Promise<Data>((callback) =>
                            this.reducer.next(
                              async ({ id }) => (
                                callbacks.set(id, callback),
                                {
                                  id,
                                  type: "transformAction",
                                  data: {
                                    key: await actionKey,
                                    args: JSON.stringify(args),
                                  },
                                  sameOrigin: config.sameOrigin,
                                }
                              ),
                            ),
                          );
                      },
                    })),
                  ),
                ),
            }),
      ),
    );
  }
}

export class StoreReducer<Data> {
  value: Observable<Data>;

  next: Function1<MulticastMessageConstructor<MulticastClientMessage>, void>;

  subscribe: (
    key: Promise<string>,
    parse: (
      action: MulticastBaseActionMessage<any, "transformAction">,
    ) => MulticastAction<Data, "transformAction">,
  ) => void;

  constructor(key: string, data: Data) {
    const actions$ = multicast(key, data);

    const transformActionSubject$ = new ReplaySubject<
      MulticastAction<Data, "transformAction">
    >();

    const seedActions$ = actions$.pipe(
      flatMap((event) =>
        isMulticastSeedActionMessage(event)
          ? {
              ...event,
              predicate: constant(Serializable.parse(event.data.seed)),
            }
          : [],
      ),
    );

    this.next = (action) => actions$.next(action);

    this.subscribe = (key, parse) =>
      actions$
        .pipe(
          mergeMap(async (event) => {
            if (
              event.type === "transformAction" &&
              event.data.key === (await key)
            ) {
              return parse(event);
            }
          }),
          flatMap((action) => action ?? []),
        )
        .subscribe(transformActionSubject$);

    this.value = merge(seedActions$, transformActionSubject$).pipe(
      tapOperator((action) => console.debug(action)),
      reduce<MulticastAction<Data>, Data>(
        (previousState, action, previousAction) => {
          if (isMulticastSeedActionMessage(action)) {
            return action.predicate();
          }

          if (action.previousId !== previousAction?.id) {
            throw new Error();
          }

          return tap(action.predicate(previousState), action.callback ?? noop);
        },
        (action) => (
          assertIsMulticastSeedActionMessage(action),
          action.predicate()
        ),
      ),
      shareReplay(1),
    );

    combineLatest([
      merge(
        defer(() => Promise.resolve(document.hasFocus())),
        fromEvent(window, "focus").pipe(map(() => true)),
        fromEvent(window, "blur").pipe(map(() => false)),
      ),
      this.value,
    ]).subscribe({
      next: ([hasFocus, data]) => {
        if (hasFocus) {
          localStorage.setItem(`${key}.state`, JSON.stringify({ data }));
        }

        document.title = document.title.replace(
          /^(~?)(.*)/,
          `${hasFocus ? "~" : ""}$2`,
        );
      },
    });
  }

  get provider(): new () => StoreProvider<Data> {
    const self = this;

    return class extends StoreProvider<Data> {
      constructor() {
        super(self);
      }
    };
  }
}

export class StoreProvider<Data> extends LazyStoreAdapter<
  Data,
  { data: DerivedSignal<Data> },
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {}
> {
  constructor(protected reducer: StoreReducer<Data>) {
    super(
      reducer,
      new LazyDictionary({
        data: new DerivedSignal<Data>({
          value: reducer.value,
        }),
      }),
      new LazyDictionary({}),
    );
  }
}
