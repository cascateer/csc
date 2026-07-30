import { nthArg } from "./nthArg";

export class Enumerable<T> extends Array<
  T extends readonly (infer Item)[] ? Item : never
> {
  constructor(value: T) {
    super();

    this.push(...(Array.isArray(value) ? value : []));
  }
}

export type EnumerableItem<
  T,
  Index extends number = number,
> = Enumerable<T>[Index];

export class Enumerator<T> {
  constructor(
    public predicate: <Index extends number>(
      item: EnumerableItem<T, Index>,
      index: Index,
    ) => PropertyKey = nthArg(1),
  ) {}

  findIndex = (key: PropertyKey) => (value: T) =>
    asEnumerable(value).map(this.predicate).indexOf(key);

  enumerate = (value: T) => asEnumerable(value).map(this.predicate);
}

export const asEnumerable = <T>(value: T) => new Enumerable<T>(value);
