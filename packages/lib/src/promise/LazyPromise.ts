import { once } from "lodash";
import {
  AsyncSubject,
  identity,
  mergeAll,
  OperatorFunction,
  startWith,
  UnaryFunction,
} from "rxjs";
import { MaybePromise } from ".";
import { reduce } from "../observable";

export class LazyPromise<Args, Result = Args> {
  private readonly resultSubject = new AsyncSubject<MaybePromise<Result>>();

  public readonly result = new Promise<Result>((resolve, reject) =>
    this.resultSubject.subscribe({
      next: async (result) => {
        try {
          resolve(await result);
        } catch (error) {
          reject(error);
        }
      },
      error: reject,
    }),
  );

  then = this.result.then.bind(this.result);
  catch = this.result.catch.bind(this.result);
  finally = this.result.finally.bind(this.result);

  start: (args: Args) => Promise<Result>;

  constructor(predicate: UnaryFunction<Args, MaybePromise<Result>>) {
    this.start = once((args) => {
      this.resultSubject.next(predicate(args));
      this.resultSubject.complete();

      return this.result;
    });
  }

  static concatAll = async <T extends readonly unknown[]>(
    inputs: [
      ...{
        [K in keyof T]: LazyPromise<void, T[K]>;
      },
    ],
  ) => {
    for (const input of inputs) {
      try {
        await input.start();
      } catch {}
    }

    return Promise.all(inputs);
  };

  static reduce =
    <T>(seed: LazyPromise<void, T>): OperatorFunction<LazyPromise<T>, T> =>
    (source) =>
      source.pipe(
        startWith(new LazyPromise<T, T>(identity)),
        reduce(
          (value, { start }) => value.then(start),
          async () => seed.start(),
        ),
        mergeAll(),
      );
}
