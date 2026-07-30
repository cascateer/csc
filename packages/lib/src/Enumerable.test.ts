import { expect, test } from "vitest";
import { Enumerable, Enumerator } from "./Enumerable";

test("enumerator", () => {
  const array = [{ id: 2 }, { id: 3 }, { id: 5 }];
  const enumerator = new Enumerator<typeof array>((item, index) =>
    [index, item.id].join("-"),
  );

  expect(enumerator.enumerate(array)).toEqual(["0-2", "1-3", "2-5"]);
});

test("enumerable", () => {
  expect(new Enumerable([2, 3, 5])).toEqual([2, 3, 5]);
  expect(new Enumerable({ a: 2, b: 3, c: 5 })).toEqual([]);
});
