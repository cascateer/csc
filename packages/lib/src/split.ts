export const split = (
  values: string,
  separator: string | RegExp = ",",
): string[] => (values.length ? values.split(separator) : []);
