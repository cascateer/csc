import { DerivedSignal } from "@cascateer/lib/observable";
import { Dictionary, Function1 } from "lodash";
import { combineLatest, defer, fromEvent, map, merge, Subject } from "rxjs";
import { ApiAdapter, ApiEffect } from "./api";
import { createComponent } from "./component";
import { multicast, MulticastObservable } from "./operators";
import { asStoreEffects, StoreAdapter, StoreProvider } from "./store";
import { TerminalAdapter, TerminalEffect, TerminalProvider } from "./terminal";
import { Action } from "./types";

type StoreFactory<
  Data,
  StoreSignals extends Dictionary<DerivedSignal<Data, any>>,
  StoreActions extends Dictionary<Action<any, any>>,
> = Function1<
  {
    StoreProvider: {
      // eslint-disable-next-line  @typescript-eslint/prefer-function-type
      new (): StoreProvider<Data>;
    };
  },
  StoreAdapter<Data, StoreSignals, StoreActions>
>;

type TerminalFactory<
  Data,
  StoreSignals extends Dictionary<DerivedSignal<Data, any>>,
  StoreActions extends Dictionary<Action<any, any>>,
  ApiEffects extends Dictionary<ApiEffect<any, any>>,
  ApiActions extends Dictionary<Action<any, any>>,
  TerminalEffects extends Dictionary<TerminalEffect<any, any>>,
  TerminalActions extends Dictionary<Action<any, any>>,
> = Function1<
  {
    TerminalProvider: {
      // eslint-disable-next-line  @typescript-eslint/prefer-function-type
      new (): TerminalProvider<
        Data,
        StoreSignals,
        StoreActions,
        ApiEffects,
        ApiActions
      >;
    };
  },
  TerminalAdapter<TerminalEffects, TerminalActions>
>;

interface SliceConfig<
  Data,
  StoreSignals extends Dictionary<DerivedSignal<Data, any>>,
  StoreActions extends Dictionary<Action<any, any>>,
  ApiEffects extends Dictionary<ApiEffect<any, any>>,
  ApiActions extends Dictionary<Action<any, any>>,
  TerminalEffects extends Dictionary<TerminalEffect<any, any>>,
  TerminalActions extends Dictionary<Action<any, any>>,
> {
  data: Data;
  store: StoreFactory<Data, StoreSignals, StoreActions>;
  api: ApiAdapter<ApiEffects, ApiActions>;
  terminal: TerminalFactory<
    Data,
    StoreSignals,
    StoreActions,
    ApiEffects,
    ApiActions,
    TerminalEffects,
    TerminalActions
  >;
}

export const createStore = <Data>(data: Data) => ({
  with: <
    StoreSignals extends Dictionary<DerivedSignal<Data, any>>,
    StoreActions extends Dictionary<Action<any, any>>,
  >(
    store: StoreFactory<Data, StoreSignals, StoreActions>,
  ) => ({ data, store }),
});

export const createApi = <
  ApiEffects extends Dictionary<ApiEffect<any, any>>,
  ApiActions extends Dictionary<Action<any, any>>,
>(
  api: ApiAdapter<ApiEffects, ApiActions>,
) => ({ api });

export const createSlice = (key: string) => ({
  withStore: <
    Data,
    StoreSignals extends Dictionary<DerivedSignal<Data, any>>,
    StoreActions extends Dictionary<Action<any, any>>,
  >(
    dataAndStore: Promise<{
      default: {
        data: Data;
        store: StoreFactory<Data, StoreSignals, StoreActions>;
      };
    }>,
  ) => ({
    withApi: <
      ApiEffects extends Dictionary<ApiEffect<any, any>>,
      ApiActions extends Dictionary<Action<any, any>>,
    >(
      api: Promise<{
        default: { api: ApiAdapter<ApiEffects, ApiActions> };
      }>,
    ) => ({
      withTerminal: async <
        TerminalEffects extends Dictionary<TerminalEffect<any, any>>,
        TerminalActions extends Dictionary<Action<any, any>>,
      >(
        terminal: TerminalFactory<
          Data,
          StoreSignals,
          StoreActions,
          ApiEffects,
          ApiActions,
          TerminalEffects,
          TerminalActions
        >,
      ) =>
        new Slice(key, {
          data: (await dataAndStore).default.data,
          store: (await dataAndStore).default.store,
          api: (await api).default.api,
          terminal,
        }),
    }),
  }),
});

export class Slice<
  Data,
  StoreSignals extends Dictionary<DerivedSignal<Data, any>>,
  StoreActions extends Dictionary<Action<any, any>>,
  ApiEffects extends Dictionary<ApiEffect<any, any>>,
  ApiActions extends Dictionary<Action<any, any>>,
  TerminalEffects extends Dictionary<TerminalEffect<any, any>>,
  TerminalActions extends Dictionary<Action<any, any>>,
> {
  private store: StoreAdapter<Data, StoreSignals, StoreActions>;
  private api: ApiAdapter<ApiEffects, ApiActions>;
  private terminal: TerminalAdapter<TerminalEffects, TerminalActions>;

  actions$: MulticastObservable;

  constructor(
    private key: string,
    {
      data,
      store,
      api,
      terminal,
    }: SliceConfig<
      Data,
      StoreSignals,
      StoreActions,
      ApiEffects,
      ApiActions,
      TerminalEffects,
      TerminalActions
    >,
  ) {
    const dataSubject$ = new Subject<Data>();

    this.store = store({
      StoreProvider: ((context) =>
        class extends StoreProvider<Data> {
          constructor() {
            super(context);
          }
        })({
        actions$: (this.actions$ = multicast(key, data)),
        dataObserver: {
          next: (value: Data) => dataSubject$.next(value),
        },
      }),
    });

    this.api = api;

    this.terminal = terminal({
      TerminalProvider: ((context) =>
        class extends TerminalProvider<
          Data,
          StoreSignals,
          StoreActions,
          ApiEffects,
          ApiActions
        > {
          constructor() {
            super(context);
          }
        })({ api, store: this.store }),
    });

    combineLatest([
      merge(
        defer(() => Promise.resolve(document.hasFocus())),
        fromEvent(window, "focus").pipe(map(() => true)),
        fromEvent(window, "blur").pipe(map(() => false)),
      ),
      dataSubject$,
    ]).subscribe({
      next: ([hasFocus, data]) => {
        if (hasFocus) {
          localStorage.setItem(`${this.key}.state`, JSON.stringify({ data }));
        }

        document.title = document.title.replace(
          /^(~?)(.*)/,
          `${hasFocus ? "~" : ""}$2`,
        );
      },
    });
  }

  createComponent(customElement?: string) {
    return createComponent(this.key, {
      store: {
        effects: asStoreEffects<Data, StoreSignals>(this.store.signals),
        actions: this.store.actions,
      },
      api: {
        effects: this.api.effects,
        actions: this.api.actions,
      },
      terminal: {
        effects: this.terminal.effects,
        actions: this.terminal.actions,
      },
    })(customElement);
  }
}
