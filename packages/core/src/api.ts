import { asArray, LazyDictionary, MaybeArray } from "@cascateer/lib";
import {
  asObservable,
  MaybeObservable,
  ProxyObservable,
} from "@cascateer/lib/observable";
import { Dictionary, Function1, intersection } from "lodash";
import {
  combineLatest,
  filter,
  finalize,
  lastValueFrom,
  NextObserver,
  repeat,
  shareReplay,
  Subject,
  tap,
} from "rxjs";
import { memoize } from "./lib/memoize";
import { Action, ProxyEffect } from "./types";

type ApiTags = MaybeArray<string>;

export interface ApiEffectResult<Result> {
  data: Result;
  providesTags?: ApiTags;
  invalidatesTags?: ApiTags;
}

interface ApiActionResult<Result> {
  data: Result;
  invalidatesTags?: ApiTags;
}

interface ApiEffectConfig<Args, Result> {
  predicate: Function1<Args, MaybeObservable<ApiEffectResult<Result>>>;
  resetOnRefCountZero?: boolean;
}

interface ApiActionConfig<Args, Result> {
  predicate: Function1<Args, MaybeObservable<ApiActionResult<Result>>>;
}

const subscribe = <Args, Result>(
  { predicate, resetOnRefCountZero = false }: ApiEffectConfig<Args, Result>,
  invalidatesTagsSubject$: Subject<string[]>,
): ApiEffect<Args, Result> => {
  const memoizedEffect: ApiEffect<Args, Result> = memoize(
    (args) =>
      new ProxyObservable((pending) =>
        asObservable(predicate(args)).pipe(
          tap({
            next: ({ invalidatesTags }) => {
              if (invalidatesTags != null) {
                invalidatesTagsSubject$.next(asArray(invalidatesTags));
              }
            },
            subscribe: () => pending.next(true),
          }),
          finalize(() => pending.next(false)),
          repeat({
            delay: () =>
              combineLatest([
                memoizedEffect(args),
                invalidatesTagsSubject$,
              ]).pipe(
                filter(
                  ([{ providesTags }, invalidatedTags]) =>
                    intersection(providesTags, invalidatedTags).length > 0,
                ),
              ),
          }),
          shareReplay({ bufferSize: 1, refCount: resetOnRefCountZero }),
        ),
      ),
  );

  return memoizedEffect;
};

const share =
  <Args, Result>(
    { predicate }: ApiActionConfig<Args, Result>,
    invalidatesTagsObserver: NextObserver<string[]>,
  ): Action<Args, Result> =>
  (args) =>
    lastValueFrom(asObservable(predicate(args))).then(
      ({ data, invalidatesTags }) => {
        if (invalidatesTags != null) {
          invalidatesTagsObserver.next(asArray(invalidatesTags));
        }

        return data;
      },
    );

export type ApiEffect<Args, Result> = ProxyEffect<
  Args,
  ApiEffectResult<Result>
>;

export type ApiEffectMap<Effects extends Dictionary<ApiEffect<any, any>>> = {
  [K in keyof Effects]: ReturnType<
    <
      Args extends (Effects[K] extends ApiEffect<infer Args, infer _>
        ? Args
        : never),
      Result extends (Effects[K] extends ApiEffect<infer _, infer Result>
        ? Result
        : never),
    >() => ApiEffect<Args, Result>
  >;
};

type ApiAdapterEffectConstructor<Source> = <Args, Result>(
  config: Function1<Source, ApiEffectConfig<Args, Result>>,
) => ApiEffect<Args, Result>;

type ApiAdapterActionConstructor<Source> = <Args, Result>(
  config: Function1<Source, ApiActionConfig<Args, Result>>,
) => Action<Args, Result>;

export class ApiAdapter<
  Effects extends Dictionary<ApiEffect<any, any>>,
  Actions extends Dictionary<Action<any, any>>,
> {
  constructor(
    public effects: Effects,
    public actions: Actions,
  ) {}
}

export class LazyApiAdapter<
  Source,
  Effects extends Dictionary<ApiEffect<any, any>>,
  Actions extends Dictionary<Action<any, any>>,
> {
  complete(): ApiAdapter<Effects, Actions> {
    return new ApiAdapter(
      this.lazyEffects.complete(),
      this.lazyActions.complete(),
    );
  }

  constructor(
    public context: {
      source: Source;
      invalidatedTagsSubject$: Subject<string[]>;
    },
    private lazyEffects: LazyDictionary<ApiEffect<any, any>, Effects>,
    private lazyActions: LazyDictionary<Action<any, any>, Actions>,
  ) {}

  provideEffects<MoreEffects extends Dictionary<ApiEffect<any, any>>>(
    effects: Function1<
      { effect: ApiAdapterEffectConstructor<Source> },
      MoreEffects
    >,
  ) {
    return new LazyApiAdapter(
      this.context,
      this.lazyEffects.extend(
        () => () =>
          effects({
            effect: (config) =>
              subscribe(
                config(this.context.source),
                this.context.invalidatedTagsSubject$,
              ),
          }),
      ),
      this.lazyActions,
    );
  }

  provideActions<MoreActions extends Dictionary<Action<any, any>>>(
    actions: Function1<
      { action: ApiAdapterActionConstructor<Source> },
      MoreActions
    >,
  ) {
    return new LazyApiAdapter(
      this.context,
      this.lazyEffects,
      this.lazyActions.extend(
        () => () =>
          actions({
            action: (config) =>
              share(
                config(this.context.source),
                this.context.invalidatedTagsSubject$,
              ),
          }),
      ),
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export class ApiProvider<Source> extends LazyApiAdapter<Source, {}, {}> {
  constructor(source: Source) {
    super(
      {
        source,
        invalidatedTagsSubject$: new Subject(),
      },
      new LazyDictionary({}),
      new LazyDictionary({}),
    );
  }
}
