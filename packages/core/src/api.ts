import { asArray, LazyDictionary, MaybeArray } from "@cascateer/lib";
import {
  asObservable,
  MaybeObservable,
  ProxyObservable,
} from "@cascateer/lib/observable";
import { Dictionary, Function1, intersection, memoize } from "lodash";
import {
  BehaviorSubject,
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
import {
  Action,
  ProxyEffect,
  ReargEffect,
  ReargEffectConstructorPredicate,
} from "./types";

type ApiTags = MaybeArray<string>;

export interface ApiEffectResult<Result> {
  data: Result;
  providesTags?: ApiTags;
  invalidatesTags?: ApiTags;
}

interface ApiEffectConfig {
  resetOnRefCountZero?: boolean;
}

const subscribe = <Args, Result>(
  predicate: ReargEffect<Args, ApiEffectResult<Result>>,
  invalidatesTagsSubject$: Subject<string[]>,
  { resetOnRefCountZero = false }: ApiEffectConfig = {},
): ApiEffect<Args, Result> => {
  const memoizedEffect: ApiEffect<Args, Result> = memoize(
    (args) =>
      new (class extends ProxyObservable<ApiEffectResult<Result>> {
        constructor() {
          const finalizedSubject$ = new BehaviorSubject(true);

          super(
            predicate.predicate(args).pipe(
              tap({
                next: ({ invalidatesTags }) => {
                  if (invalidatesTags != null) {
                    invalidatesTagsSubject$.next(asArray(invalidatesTags));
                  }
                },
                subscribe: () => finalizedSubject$.next(false),
                unsubscribe: () => finalizedSubject$.next(true),
              }),
              finalize(() => finalizedSubject$.next(true)),
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
            predicate.hash(args),
            finalizedSubject$,
          );
        }
      })(),
    predicate.hash,
  );

  return memoizedEffect;
};

interface ApiActionResult<Result> {
  data: Result;
  invalidatesTags?: ApiTags;
}

type ApiActionPredicate<Args, Result> = Function1<
  Args,
  MaybeObservable<ApiActionResult<Result>>
>;

const share =
  <Args, Result>(
    predicate: ApiActionPredicate<Args, Result>,
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
  Client,
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
      client: Client;
      invalidatedTagsSubject$: Subject<string[]>;
    },
    private lazyEffects: LazyDictionary<ApiEffect<any, any>, Effects>,
    private lazyActions: LazyDictionary<Action<any, any>, Actions>,
  ) {}

  provideEffects<MoreEffects extends Dictionary<ApiEffect<any, any>>>(
    effects: Function1<
      {
        effect: <Args, Result>(
          config?: ApiEffectConfig,
        ) => <DepKeys extends (keyof Args)[]>(
          predicate: ReargEffectConstructorPredicate<
            Client,
            Args,
            ApiEffectResult<Result>,
            DepKeys
          >,
          ...depKeys: DepKeys
        ) => ApiEffect<Args, Result>;
      },
      MoreEffects
    >,
  ) {
    return new LazyApiAdapter(
      this.context,
      this.lazyEffects.extend(
        () => () =>
          effects({
            effect:
              (config) =>
              (predicate, ...depKeys) =>
                subscribe(
                  new ReargEffect(
                    (...deps) => predicate(this.context.client, ...deps),
                    depKeys,
                  ),
                  this.context.invalidatedTagsSubject$,
                  config,
                ),
          }),
      ),
      this.lazyActions,
    );
  }

  provideActions<MoreActions extends Dictionary<Action<any, any>>>(
    actions: Function1<
      {
        action: <Args, Result>(
          predicate: (
            client: Client,
            args: Args,
          ) => MaybeObservable<ApiActionResult<Result>>,
        ) => Action<Args, Result>;
      },
      MoreActions
    >,
  ) {
    return new LazyApiAdapter(
      this.context,
      this.lazyEffects,
      this.lazyActions.extend(
        () => () =>
          actions({
            action: (predicate) =>
              share(
                (args) => predicate(this.context.client, args),
                this.context.invalidatedTagsSubject$,
              ),
          }),
      ),
    );
  }
}

export class ApiProvider<
  ApiClient,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
> extends LazyApiAdapter<ApiClient, {}, {}> {
  constructor(client: ApiClient) {
    super(
      {
        client,
        invalidatedTagsSubject$: new Subject(),
      },
      new LazyDictionary({}),
      new LazyDictionary({}),
    );
  }
}
