import * as lodash from "lodash";

export const kebabCase = (...words: string[]) =>
  lodash.kebabCase(words.join("-"));
