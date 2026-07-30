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

  complete = () => tap(this.currentValue, this.value.start);

  extend<V extends Dictionary<T>>(
    value: (
      currentValue: U,
    ) => ({
      property,
    }: {
      property: (constructor: UnaryFunction<Promise<string>, T>) => T;
    }) => V,
  ) {
    return new LazyDictionary<T, Extend<U, V>>(
      {
        ...this.currentValue,
        ...value(this.currentValue)({
          property: (constructor) => {
            const property = constructor(
              new Promise<string>(async (resolve, reject) => {
                const value = await this.value;

                for (const key of keys(value)) {
                  if (value[key] === property) {
                    return resolve(key);
                  }
                }

                reject();
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
