import { expect, test } from "vitest";
import { LazyPromise } from "./LazyPromise";

test("LazyPromise rejection", () => {
  type Fruit = "apple" | "banana" | "tomato";

  return expect(
    LazyPromise.concatAll(
      ["apple" as const, "banana" as const, "tomato" as const].map(
        (fruit) =>
          new LazyPromise<void, Fruit>(
            () =>
              new Promise((resolve, reject) => {
                if (fruit === "banana") {
                  return setTimeout(() => reject(new Error(fruit)));
                }

                return resolve(fruit);
              }),
          ),
      ),
    ),
  ).rejects.toEqual(new Error("banana"));
});
