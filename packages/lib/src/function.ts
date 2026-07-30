import { constant, isFunction } from "lodash";

export type MaybeFunction<Args extends unknown[], Result> =
  ((...args: Args) => Result) | Result;

export const asFunction = <Args extends unknown[], Result>(
  func: MaybeFunction<Args, Result>,
) => (isFunction(func) ? func : constant(func));
