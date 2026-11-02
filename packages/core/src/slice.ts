import { DerivedSignal } from "@cascateer/lib/observable";
import { Dictionary, Function1, Function2, tap } from "lodash";
import { ApiAdapter, ApiEffect, ApiProvider } from "./api";
import { createComponent } from "./component";
import {
  asStoreEffects,
  StoreAdapter,
  StoreProvider,
  StoreReducer,
} from "./store";
import { TerminalAdapter, TerminalEffect, TerminalProvider } from "./terminal";
import { Action } from "./types";

type StoreFactory<
  StoreData,
  StoreSignals extends Dictionary<DerivedSignal<StoreData, any>>,
  StoreActions extends Dictionary<Action<any, any>>,
> = Function1<
  {
    StoreProvider: {
      // eslint-disable-next-line  @typescript-eslint/prefer-function-type
      new (): StoreProvider<StoreData>;
    };
  },
  StoreAdapter<StoreData, StoreSignals, StoreActions>
>;

type ApiFactory<
  StoreData,
  StoreSignals extends Dictionary<DerivedSignal<StoreData, any>>,
  StoreActions extends Dictionary<Action<any, any>>,
  ApiClient,
  ApiEffects extends Dictionary<ApiEffect<any, any>>,
  ApiActions extends Dictionary<Action<any, any>>,
> = (_: {
  ApiProvider: {
    // eslint-disable-next-line  @typescript-eslint/prefer-function-type
    new (
      interceptor: Function2<
        StoreAdapter<StoreData, StoreSignals, StoreActions>,
        ApiClient,
        void
      >,
    ): ApiProvider<ApiClient>;
  };
}) => ApiAdapter<ApiEffects, ApiActions>;

type TerminalFactory<
  StoreData,
  StoreSignals extends Dictionary<DerivedSignal<StoreData, any>>,
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
        StoreData,
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
  StoreData,
  StoreSignals extends Dictionary<DerivedSignal<StoreData, any>>,
  StoreActions extends Dictionary<Action<any, any>>,
  ApiClient,
  ApiEffects extends Dictionary<ApiEffect<any, any>>,
  ApiActions extends Dictionary<Action<any, any>>,
  TerminalEffects extends Dictionary<TerminalEffect<any, any>>,
  TerminalActions extends Dictionary<Action<any, any>>,
> {
  storeData: StoreData;
  store: StoreFactory<StoreData, StoreSignals, StoreActions>;
  apiClient: ApiClient;
  api: ApiFactory<
    StoreData,
    StoreSignals,
    StoreActions,
    ApiClient,
    ApiEffects,
    ApiActions
  >;
  terminal: TerminalFactory<
    StoreData,
    StoreSignals,
    StoreActions,
    ApiEffects,
    ApiActions,
    TerminalEffects,
    TerminalActions
  >;
}

export const createStore = <StoreData>(storeData: StoreData) => ({
  from: <
    StoreSignals extends Dictionary<DerivedSignal<StoreData, any>>,
    StoreActions extends Dictionary<Action<any, any>>,
  >(
    store: StoreFactory<StoreData, StoreSignals, StoreActions>,
  ) => ({
    createApi: <ApiClient>(apiClient: ApiClient) => ({
      from: <
        ApiEffects extends Dictionary<ApiEffect<any, any>>,
        ApiActions extends Dictionary<Action<any, any>>,
      >(
        api: ApiFactory<
          StoreData,
          StoreSignals,
          StoreActions,
          ApiClient,
          ApiEffects,
          ApiActions
        >,
      ) => ({
        createSlice: (key: string) => ({
          from: <
            TerminalEffects extends Dictionary<TerminalEffect<any, any>>,
            TerminalActions extends Dictionary<Action<any, any>>,
          >(
            terminal: TerminalFactory<
              StoreData,
              StoreSignals,
              StoreActions,
              ApiEffects,
              ApiActions,
              TerminalEffects,
              TerminalActions
            >,
          ) =>
            new Slice(key, {
              storeData,
              store,
              apiClient,
              api,
              terminal,
            }),
        }),
      }),
    }),
  }),
});

export class Slice<
  StoreData,
  StoreSignals extends Dictionary<DerivedSignal<StoreData, any>>,
  StoreActions extends Dictionary<Action<any, any>>,
  ApiClient,
  ApiEffects extends Dictionary<ApiEffect<any, any>>,
  ApiActions extends Dictionary<Action<any, any>>,
  TerminalEffects extends Dictionary<TerminalEffect<any, any>>,
  TerminalActions extends Dictionary<Action<any, any>>,
> {
  private store: StoreAdapter<StoreData, StoreSignals, StoreActions>;
  private api: ApiAdapter<ApiEffects, ApiActions>;
  private terminal: TerminalAdapter<TerminalEffects, TerminalActions>;

  constructor(
    private key: string,
    {
      storeData,
      store,
      apiClient,
      api,
      terminal,
    }: SliceConfig<
      StoreData,
      StoreSignals,
      StoreActions,
      ApiClient,
      ApiEffects,
      ApiActions,
      TerminalEffects,
      TerminalActions
    >,
  ) {
    this.store = store({
      StoreProvider: new StoreReducer(key, storeData).provider,
    });

    this.api = api({
      ApiProvider: ((store) =>
        class extends ApiProvider<ApiClient> {
          constructor(
            interceptor: Function2<
              StoreAdapter<StoreData, StoreSignals, StoreActions>,
              ApiClient,
              void
            >,
          ) {
            super(tap(apiClient, (apiClient) => interceptor(store, apiClient)));
          }
        })(this.store),
    });

    this.terminal = terminal({
      TerminalProvider: ((context) =>
        class extends TerminalProvider<
          StoreData,
          StoreSignals,
          StoreActions,
          ApiEffects,
          ApiActions
        > {
          constructor() {
            super(context);
          }
        })({ store: this.store, api: this.api }),
    });
  }

  createComponent() {
    return createComponent(`my-${this.key}`, {
      store: {
        effects: asStoreEffects<StoreData, StoreSignals>(this.store.signals),
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
    })();
  }
}
