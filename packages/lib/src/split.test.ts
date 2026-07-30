import { expect, test } from "vitest";
import { split } from "./split";

test("split", () => {
  expect(split("1#2#3", "#")).toEqual(["1", "2", "3"]);
});

test("split with default separator", () => {
  expect(split(`${[1, 2, 3]}`)).toEqual(["1", "2", "3"]);
});

test("empty split", () => {
  const emptyString = "";
  const separator = "no matter";

  expect(emptyString.split(separator)).toEqual([""]);
  expect(split(emptyString, separator)).toEqual([]);
});
