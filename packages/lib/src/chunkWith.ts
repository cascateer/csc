import { Comparator, uniqWith } from "lodash";

export const chunkWith = <T>(items: T[], comparator?: Comparator<T>): T[][] => [
  ...{
    *[Symbol.iterator]() {
      const chunk = new Array<T>();

      if (items.length == 0) {
        return;
      }

      for (const item of items) {
        if (uniqWith([...chunk, item], comparator).length === 1) {
          chunk.push(item);
        } else {
          yield chunk.splice(0, chunk.length, item);
        }
      }

      yield chunk;
    },
  },
];
