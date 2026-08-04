import { LazyDictionary } from "@cascateer/lib";
import { DerivedSignal } from "@cascateer/lib/observable";
import { Dictionary, Function1 } from "lodash";
import { defer, fromEvent, map, merge } from "rxjs";
import { ApiAdapter, ApiEffect } from "./api";
import { createComponent } from "./component";
import { multicast, MulticastSubject } from "./operators";
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
  key: string;
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
        new Slice({
          key,
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
  private key: string;
  private data: Data;
  private store: StoreAdapter<Data, StoreSignals, StoreActions>;
  private api: ApiAdapter<ApiEffects, ApiActions>;
  private terminal: TerminalAdapter<TerminalEffects, TerminalActions>;

  actions: MulticastSubject;

  constructor({
    key,
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
  >) {
    this.key = key;
    this.data = data;
    this.store = store({
      StoreProvider: ((context) =>
        class extends StoreProvider<Data> {
          constructor() {
            super(context);
          }
        })({
        actions: (this.actions = multicast(key, data)),
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

    merge(
      defer(() => Promise.resolve(document.hasFocus())),
      fromEvent(window, "focus").pipe(map(() => true)),
      fromEvent(window, "blur").pipe(map(() => false)),
    ).subscribe({
      next: (hasFocus) => {
        if (hasFocus) {
          localStorage.setItem(`${this.key}.state`, JSON.stringify(this.data));
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

export class SliceAdapter<
  Slices extends Dictionary<Slice<any, any, any, any, any, any, any>>,
> {
  constructor(public slices: Slices) {}
}

export class LazySliceAdapter<
  Slices extends Dictionary<Slice<any, any, any, any, any, any, any>>,
> {
  complete(): SliceAdapter<Slices> {
    return new SliceAdapter(this.lazySlices.complete());
  }

  constructor(
    private lazySlices: LazyDictionary<
      Slice<any, any, any, any, any, any, any>,
      Slices
    >,
  ) {}

  provideSlices<
    MoreSlices extends Dictionary<Slice<any, any, any, any, any, any, any>>,
  >(
    slices: Function1<
      {
        slice: <
          Data,
          StoreSignals extends Dictionary<DerivedSignal<Data, any>>,
          StoreActions extends Dictionary<Action<any, any>>,
          ApiEffects extends Dictionary<ApiEffect<any, any>>,
          ApiActions extends Dictionary<Action<any, any>>,
          TerminalEffects extends Dictionary<TerminalEffect<any, any>>,
          TerminalActions extends Dictionary<Action<any, any>>,
        >(
          constructor: Function1<
            void,
            SliceConfig<
              Data,
              StoreSignals,
              StoreActions,
              ApiEffects,
              ApiActions,
              TerminalEffects,
              TerminalActions
            >
          >,
        ) => Slice<
          Data,
          StoreSignals,
          StoreActions,
          ApiEffects,
          ApiActions,
          TerminalEffects,
          TerminalActions
        >;
      },
      MoreSlices
    >,
  ) {
    return new LazySliceAdapter(
      this.lazySlices.extend(
        () =>
          ({ property }) =>
            slices({
              slice: (config) => property(() => new Slice(config())),
            }),
      ),
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export class SliceProvider extends LazySliceAdapter<{}> {
  constructor() {
    super(new LazyDictionary({}));
  }
}
