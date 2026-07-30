import { Function1, identity } from "lodash";

export const findDupeBy = <T, U>(
  items: T[],
  iteratee: Function1<T, U> = identity,
): T | undefined =>
  items[
    items
      .map(iteratee)
      .findIndex((item, index, items) => index !== items.lastIndexOf(item))
  ];
