import { Dictionary, identity, tap } from "lodash";
import { UnaryFunction } from "rxjs";
import { keys } from "./keys";
import { LazyPromise } from "./promise";

export type Extend<T, U> = Omit<T, keyof U> & U;

export class LazyDictionary<T, U extends Dictionary<T>> {
  constructor(
    public currentValue: U,
    private value = new LazyPromise<Dictionary<T>>(identity),
  ) {}

  complete = () =>
    tap(this.currentValue, (value) => void this.value.start(value));

  extend<V extends Dictionary<T>>(
    value: (
      currentValue: U,
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
        ...this.currentValue,
        ...value(this.currentValue)({
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
