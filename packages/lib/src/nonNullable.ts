export const nonNullable = <T>(value: T): NonNullable<T> => {
  if (value == null) {
    throw new Error(`${value} is nil`);
  }

  return value;
};
