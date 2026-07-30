import { expect, test } from "vitest";
import { Snippet } from "./Snippet";

test("Snippet.parse", () => {
  expect(Snippet.parse({ name: "abc" }, "$.name")).toEqual("abc");
  expect(Snippet.parse({ name: "abacab" }, "$.name/^(a)(ba)/$1")).toEqual(
    "acab",
  );
  expect(Snippet.parse({ name: "foo / bar" }, "$.name/\\\\//|/g")).toEqual(
    "foo | bar",
  );
});

test("Snippet.parseAll", () => {
  expect(Snippet.parseAll({ name: "Alba" }, "${$.name}tros")).toEqual(
    "Albatros",
  );
  expect(
    Snippet.parseAll(
      { name: "Aalbaaa" },
      "${${$.name/(a+)/a/gi}tros/(al|ba)/$1-/g}",
    ),
  ).toEqual("al-ba-tros");
  expect(
    Snippet.parseAll(
      { name: "Shadow Heart (Hp Hoeger & Rusty Egan Remix)" },
      "${$.name/(?:\((Hp Hoeger & Rusty Egan Remix)\))/$1 /}",
    ),
  ).toEqual("Shadow Heart (Hp Hoeger & Rusty Egan Remix )");
});
