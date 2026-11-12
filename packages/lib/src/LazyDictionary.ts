import { Dictionary, identity, tap } from "lodash";
import { UnaryFunction } from "rxjs";
import { keys } from "./keys";
import { LazyPromise } from "./promise";

export type Extend<T, U> = Omit<T, keyof U> & U;

export class LazyDictionary<T, U extends Dictionary<T>> {
  constructor(
    public baseValue: U,
    private value = new LazyPromise<Dictionary<T>>(identity),
  ) {}

  complete = () => tap(this.baseValue, (value) => void this.value.start(value));

  extend<V extends Dictionary<T>>(
    value: (
      baseValue: U,
    ) => ({
      property,
    }: {
      property: (
        constructor: UnaryFunction<Promise<string | undefined>, T>,
      ) => T;
    }) => V,
  ) {
    return new LazyDictionary<T, Extend<U, V>>(
      {
        ...this.baseValue,
        ...value(this.baseValue)({
          property: (constructor) => {
            const property = constructor(
              this.value.then((value) => {
                for (const key of keys(value)) {
                  if (value[key] === property) {
                    return key;
                  }
                }
              }),
            );

            return property;
          },
        }),
      },
      this.value,
    );
  }
}
