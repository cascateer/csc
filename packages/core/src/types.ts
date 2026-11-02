import { property } from "@cascateer/lib";
import {
  asObservable,
  MaybeObservable,
  ProxyObservable,
} from "@cascateer/lib/observable";
import { Dictionary, Function1, memoize, pick, tap } from "lodash";
import {
  combineLatest,
  map,
  ReplaySubject,
  scan,
  shareReplay,
  startWith,
  switchMap,
  tap as tapOperator,
} from "rxjs";
import { Observable } from "rxjs/internal/Observable";

import objectHash from "object-hash";
import { TerminalEffect } from "./terminal";

export type Effect<Args, Result> = Function1<Args, Observable<Result>>;

export class ReargEffect<
  Args,
  Result,
  DepKeys extends (keyof Args)[] = (keyof Args)[],
> {
  predicate: Function1<Args, Observable<Result>>;
  hash: Function1<Args, string>;

  constructor(
    predicate: (
      ...deps: { -readonly [K in keyof DepKeys]: Args[DepKeys[K]] }
    ) => MaybeObservable<Result>,
    public depKeys: DepKeys,
  ) {
    this.predicate = (args) =>
      asObservable(
        predicate(
          ...(depKeys.map((depKey) => property<Args>(depKey)(args)) as {
            -readonly [K in keyof typeof depKeys]: Args[(typeof depKeys)[K]];
          }),
        ),
      );

    this.hash = (args) => objectHash(pick(args, ...depKeys) ?? null);
  }
}

export type ReargEffectConstructor<Ctx, Args, Result> = <
  DepKeys extends (keyof Args)[],
>(
  predicate: ReargEffectConstructorPredicate<Ctx, Args, Result, DepKeys>,
  ...depKeys: DepKeys
) => TerminalEffect<Args, Result>;

export type ReargEffectConstructorPredicate<
  Ctx,
  Args,
  Result,
  DepKeys extends (keyof Args)[],
> = (
  ctx: Ctx,
  ...deps: { -readonly [K in keyof DepKeys]: Args[DepKeys[K]] }
) => MaybeObservable<Result>;

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
  project: Function1<T, ReargEffect<Args, Result>>;
  bufferSize?: number;
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
                source.hash,
                combineLatest([source.finalized, deps$]).pipe(
                  map(([finalized, deps]) => finalized || !deps.has(this)),
                ),
              );
            }
          })(effect(args)),
        (args) => effect(args).hash,
      ),
    ),
  );

  return (args) =>
    new ProxyObservable(
      effect.predicate(args),
      effect.hash(args),
      deps$.pipe(
        switchMap((deps) =>
          combineLatest(Array.from(deps, property("finalized"))).pipe(
            map((values) => values.every(Boolean)),
          ),
        ),
        startWith(true),
      ),
    );
};
