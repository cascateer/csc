export const entries = <T>(value: T) => [
  ...{
    *[Symbol.iterator]() {
      for (const key in value) yield [key, value[key]] as const;
    },
  },
];
