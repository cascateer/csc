import { Function1, Function2, tap } from "lodash";

export const keyMapBy = <T, K, V>(
  collection: T[],
  keyIteratee: Function1<T, K>,
  valueIteratee: Function2<T, Map<K, V>, V>,
) =>
  collection.reduce(
    (map, item) =>
      tap(map, (map) => map.set(keyIteratee(item), valueIteratee(item, map))),
    new Map<K, V>(),
  );
