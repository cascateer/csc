import { property } from "@cascateer/lib";
import { ProxyObservable } from "@cascateer/lib/observable";
import { Dictionary, Function1, tap } from "lodash";
import {
  combineLatest,
  map,
  ReplaySubject,
  scan,
  shareReplay,
  switchMap,
  tap as tapOperator,
} from "rxjs";
import { Observable } from "rxjs/internal/Observable";
import { memoize } from "./lib/memoize";

export type Effect<Args, Result> = Function1<Args, Observable<Result>>;

export type Action<Args, Result> = Function1<Args, Promise<Result>>;

export type ProxyEffect<Args, Result> = Function1<
  Args,
  ProxyObservable<Result>
>;

export type ProxyEffectMap<Effects extends Dictionary<ProxyEffect<any, any>>> =
  {
    [K in keyof Effects]: ReturnType<
      <
        Args extends (Effects[K] extends ProxyEffect<infer Args, infer _>
          ? Args
          : never),
        Result extends (Effects[K] extends ProxyEffect<infer _, infer Result>
          ? Result
          : never),
      >() => ProxyEffect<Args, Result>
    >;
  };

export const combineProxyEffects = <T, Args, Result>({
  intercept,
  project,
  bufferSize = 1,
}: {
  intercept: (
    proxy: <Args, Result>(
      effect: ProxyEffect<Args, Result>,
    ) => ProxyEffect<Args, Result>,
  ) => T;
  project: Function1<T, Effect<Args, Result>>;
  bufferSize: number;
}): ProxyEffect<Args, Result> => {
  const depsUpdateSubject$ = new ReplaySubject<
    Function1<Set<ProxyObservable<any>>, void>
  >();
  const deps$ = depsUpdateSubject$.pipe(
    scan(tap, new Set<ProxyObservable<any>>()),
  );

  const effect = project(
    intercept(<Args, Result>(effect: ProxyEffect<Args, Result>) =>
      memoize(
        (args: Args) =>
          new (class extends ProxyObservable<Result> {
            constructor(source: ProxyObservable<Result>) {
              super(
                source.pipe(
                  tapOperator({
                    subscribe: () =>
                      depsUpdateSubject$.next((subscribers) =>
                        subscribers.add(this),
                      ),
                    unsubscribe: () =>
                      depsUpdateSubject$.next((subscribers) =>
                        subscribers.delete(this),
                      ),
                  }),
                  shareReplay({ bufferSize, refCount: true }),
                ),
                combineLatest([source.finalized, deps$]).pipe(
                  map(([finalized, deps]) => finalized || !deps.has(this)),
                ),
              );
            }
          })(effect(args)),
      ),
    ),
  );

  return (args) =>
    new ProxyObservable(
      effect(args),
      deps$.pipe(
        switchMap((deps) =>
          combineLatest(Array.from(deps, property("finalized"))).pipe(
            map((values) => values.every(Boolean)),
          ),
        ),
      ),
    );
};
