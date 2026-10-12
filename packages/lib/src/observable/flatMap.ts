import { OperatorFunction, from, mergeMap } from "rxjs";
import { MaybePromise } from "../promise";

export const flatMap =
  <T, U>(
    project: (value: T, index: number) => MaybePromise<U | U[]>,
  ): OperatorFunction<T, U> =>
  (source) =>
    source.pipe(
      mergeMap(async (value, index) => project(value, index)),
      mergeMap((value) => from(Array.isArray(value) ? value : [value])),
    );
