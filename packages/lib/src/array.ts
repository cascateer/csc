export type MaybeArray<T> = T | T[];

export const asArray = <T>(array: MaybeArray<T>): T[] =>
  Array.isArray(array) ? array : [array];
