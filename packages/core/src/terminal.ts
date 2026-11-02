import { LazyDictionary } from "@cascateer/lib";
import { DerivedSignal } from "@cascateer/lib/observable";
import { Dictionary, Function1, mapValues } from "lodash";
import { ApiAdapter, ApiEffect, ApiEffectMap } from "./api";
import { asStoreEffects, StoreAdapter, StoreEffectMap } from "./store";
import {
  Action,
  combineProxyEffects,
  ProxyEffect,
  ProxyEffectMap,
  ReargEffect,
  ReargEffectConstructorPredicate,
} from "./types";

export type TerminalEffect<Args, Result> = ProxyEffect<Args, Result>;

export interface TerminalEffectContext<
  StoreData,
  StoreSignals extends Dictionary<DerivedSignal<StoreData, any>>,
  ApiEffects extends Dictionary<ApiEffect<any, any>>,
  Effects extends Dictionary<TerminalEffect<any, any>>,
> {
  store: {
    effects: StoreEffectMap<StoreData, StoreSignals>;
  };
  api: {
    effects: ApiEffectMap<ApiEffects>;
  };
  terminal: {
    effects: ProxyEffectMap<Effects>;
  };
}

export interface TerminalActionContext<
  StoreData,
  StoreSignals extends Dictionary<DerivedSignal<StoreData, any>>,
  StoreActions extends Dictionary<Action<any, any>>,
  ApiEffects extends Dictionary<ApiEffect<any, any>>,
  ApiActions extends Dictionary<Action<any, any>>,
  Effects extends Dictionary<TerminalEffect<any, any>>,
  Actions extends Dictionary<Action<any, any>>,
> {
  store: {
    effects: StoreEffectMap<StoreData, StoreSignals>;
    actions: StoreActions;
  };
  api: {
    effects: ApiEffects;
    actions: ApiActions;
  };
  terminal: {
    effects: Effects;
    actions: Actions;
  };
}

export class TerminalAdapter<
  Effects extends Dictionary<TerminalEffect<any, any>>,
  Actions extends Dictionary<Action<any, any>>,
> {
  constructor(
    public effects: Effects,
    public actions: Actions,
  ) {}
}

export class LazyTerminalAdapter<
  StoreData,
  StoreSignals extends Dictionary<DerivedSignal<StoreData, any>>,
  StoreActions extends Dictionary<Action<any, any>>,
  ApiEffects extends Dictionary<ApiEffect<any, any>>,
  ApiActions extends Dictionary<Action<any, any>>,
  Effects extends Dictionary<TerminalEffect<any, any>>,
  Actions extends Dictionary<Action<any, any>>,
> {
  complete(): TerminalAdapter<Effects, Actions> {
    return new TerminalAdapter(
      this.lazyEffects.complete(),
      this.lazyActions.complete(),
    );
  }

  constructor(
    private context: {
      store: StoreAdapter<StoreData, StoreSignals, StoreActions>;
      api: ApiAdapter<ApiEffects, ApiActions>;
    },
    private lazyEffects: LazyDictionary<TerminalEffect<any, any>, Effects>,
    private lazyActions: LazyDictionary<Action<any, any>, Actions>,
  ) {}

  provideEffects<MoreEffects extends Dictionary<TerminalEffect<any, any>>>(
    effects: (factory: {
      effect: <Args, Result>() => <DepKeys extends (keyof Args)[]>(
        predicate: ReargEffectConstructorPredicate<
          TerminalEffectContext<StoreData, StoreSignals, ApiEffects, Effects>,
          Args,
          Result,
          DepKeys
        >,
        ...depKeys: DepKeys
      ) => TerminalEffect<Args, Result>;
    }) => MoreEffects,
  ) {
    return new LazyTerminalAdapter(
      this.context,
      this.lazyEffects.extend(
        (currentEffects) => () =>
          effects({
            effect:
              () =>
              (predicate, ...depKeys) =>
                combineProxyEffects({
                  intercept: (proxy) => ({
                    store: {
                      effects: asStoreEffects<StoreData, StoreSignals>(
                        this.context.store.signals,
                      ),
                    },
                    api: {
                      effects: mapValues(this.context.api.effects, proxy),
                    },
                    terminal: {
                      effects: mapValues(currentEffects, proxy),
                    },
                  }),
                  project: (ctx) =>
                    new ReargEffect(
                      (...deps) => predicate(ctx, ...deps),
                      depKeys,
                    ),
                }),
          }),
      ),
      this.lazyActions,
    );
  }

  provideActions<MoreActions extends Dictionary<Action<any, any>>>(
    actions: Function1<
      {
        action: <Args, Result>(
          factory: (
            ctx: TerminalActionContext<
              StoreData,
              StoreSignals,
              StoreActions,
              ApiEffects,
              ApiActions,
              Effects,
              Actions
            >,
            args: Args,
          ) => Promise<Result>,
        ) => Action<Args, Result>;
      },
      MoreActions
    >,
  ) {
    return new LazyTerminalAdapter(
      this.context,
      this.lazyEffects,
      this.lazyActions.extend(
        (currentActions) => () =>
          actions({
            action: (factory) => (args) =>
              factory(
                {
                  store: {
                    effects: asStoreEffects(this.context.store.signals),
                    actions: this.context.store.actions,
                  },
                  api: {
                    effects: this.context.api.effects,
                    actions: this.context.api.actions,
                  },
                  terminal: {
                    effects: this.lazyEffects.currentValue,
                    actions: currentActions,
                  },
                },
                args,
              ),
          }),
      ),
    );
  }
}

export class TerminalProvider<
  StoreData,
  StoreSignals extends Dictionary<DerivedSignal<StoreData, any>>,
  StoreActions extends Dictionary<Action<any, any>>,
  ApiEffects extends Dictionary<ApiEffect<any, any>>,
  ApiActions extends Dictionary<Action<any, any>>,
> extends LazyTerminalAdapter<
  StoreData,
  StoreSignals,
  StoreActions,
  ApiEffects,
  ApiActions,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {},
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {}
> {
  constructor(context: {
    store: StoreAdapter<StoreData, StoreSignals, StoreActions>;
    api: ApiAdapter<ApiEffects, ApiActions>;
  }) {
    super(context, new LazyDictionary({}), new LazyDictionary({}));
  }
}
