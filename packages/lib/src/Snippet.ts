import { get, sortBy } from "lodash";
import { nonNullable } from "./nonNullable";
import { property } from "./property";
import { split } from "./split";

/**
 * @link https://macromates.com/manual/en/snippets
 *  */
export class Snippet {
  static parse = <T>(item: T, predicate: string): string => {
    const separator = "(?<!\\\\)/";
    const [value, pattern = "^$", replacement = "", flags] = split(
      predicate,
      new RegExp(separator),
    );

    if (value != null) {
      return (
        value.startsWith("$.")
          ? `${get({ $: item }, value)}`.replaceAll(
              new RegExp(separator, "g"),
              "\\/",
            )
          : value
      ).replace(new RegExp(pattern, flags), replacement);
    }

    return "";
  };

  static parseAll = <T>(item: T, predicate: string): string => {
    const leftBrackets = Array.from(
      predicate.matchAll(new RegExp(RegExp.escape("${"), "g")),
      ({ index }) => ({ index, left: true }),
    );

    const rightBrackets = Array.from(
      predicate.matchAll(new RegExp(RegExp.escape("}"), "g")),
      ({ index }) => ({ index, left: false }),
    );

    const indexStack = [];

    for (const bracket of sortBy(
      leftBrackets.concat(rightBrackets),
      property("index"),
    )) {
      if (bracket.left) {
        indexStack.push(bracket.index);
      } else {
        const [start, end] = [
          nonNullable(indexStack.pop()),
          bracket.index,
        ] as const;

        return Snippet.parseAll(
          item,
          [
            predicate.slice(0, start),
            Snippet.parse(item, predicate.slice(start + 2, end)),
            predicate.slice(end + 1),
          ].join(""),
        );
      }
    }

    return predicate;
  };
}
