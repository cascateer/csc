import { EndoFunction, keys } from "@cascateer/lib";
import { flatMap, transform } from "@cascateer/lib/observable";
import { Dictionary, Function1, mapValues, once, pick } from "lodash";
import objectHash from "object-hash";
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  identity,
  interval,
  Observable,
  of,
  startWith,
  switchMap,
  take,
} from "rxjs";
import { Effect, EffectFibers } from "../types";

class MissingDependencyError extends Error {
  constructor(public deps: Dictionary<Observable<unknown>>) {
    super();
  }
}

export const combine = <Effects extends Dictionary<Effect<any, any>>, T>(
  effects: Effects,
  predicate: Function1<EffectFibers<Effects>, T>,
): Observable<T> => {
  const depsTransformSubject$ = new BehaviorSubject<
    EndoFunction<Dictionary<Observable<unknown>>>
  >(() => ({}));

  return depsTransformSubject$.pipe(
    transform<Dictionary<Observable<unknown>>>({}),
    switchMap((deps) => combineLatest(deps)),
    startWith({} as Dictionary<unknown>),
    distinctUntilChanged((prevDepsState, currDepsState) =>
      keys(currDepsState).every(
        (depKey) =>
          depKey in prevDepsState &&
          currDepsState[depKey] === prevDepsState[depKey],
      ),
    ),
    switchMap(async (depsState) => {
      const visitedDepKeys = new Set<string>();

      const toEffectFiber = <Args, Result>(
        effect: Effect<Args, Result>,
        name: string,
      ) =>
        once((args: Args) => {
          const depKey = `${name}.${objectHash(args ?? null)}`;

          visitedDepKeys.add(depKey);

          if (depKey in depsState) {
            return depsState[depKey];
          }

          throw new MissingDependencyError({ [depKey]: effect(args) });
        });

      try {
        const result = await predicate(
          mapValues(effects, toEffectFiber) as EffectFibers<typeof effects>,
        );

        for (const depKey in depsState) {
          if (!visitedDepKeys.has(depKey)) {
            depsTransformSubject$.next((deps) => pick(deps, ...visitedDepKeys));

            return [];
          }
        }

        return [result];
      } catch (error) {
        if (error instanceof MissingDependencyError) {
          depsTransformSubject$.next((deps) => ({ ...deps, ...error.deps }));

          return [];
        }

        throw error;
      }
    }),
    flatMap(identity),
  );
};

combine(
  {
    flag: (x: boolean) => of(x),
    num: () => interval(1e3).pipe(take(5)),
    word: (x: string) => of(x),
  },
  async ({ flag, num, word }) => {
    if (await Promise.resolve(flag(true))) {
      return `${word("foo")} - ${num() * num()}`;
    } else {
      return num() * num();
    }
  },
).subscribe();
