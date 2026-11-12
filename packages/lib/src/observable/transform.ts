import { OperatorFunction, scan } from "rxjs";
import { EndoFunction } from "..";

export const transform =
  <T>(seed: T): OperatorFunction<EndoFunction<T>, T> =>
  (source) =>
    source.pipe(scan((acc, curr) => curr(acc), seed));
