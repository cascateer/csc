import { RouteParameters } from "express-serve-static-core";
import { String } from "ts-toolbelt";
import { splitUrl } from "./lib/splitUrl";

export type RawQueryParams<U extends string> = Partial<{
  [
    QueryElement in String.Split<
      String.Split<U, "?">[1],
      "&"
    >[number] as String.Split<QueryElement, "=">[0]
  ]: string | string[];
}>;

export type RouteParams<P extends string> = Partial<
  RouteParameters<String.Split<P, "?">[0]>
>;

export class QueryParams<
  P extends string,
  Q extends RawQueryParams<P> = RawQueryParams<P>,
> {
  constructor(private params: Q) {}

  parseString(key: keyof Q) {
    return this.params[key]?.toString();
  }

  parseNumber(key: keyof Q) {
    const string = this.parseString(key);

    if (string != null) {
      const number = +string;

      if (!Number.isNaN(number)) {
        return number;
      }
    }
  }

  parseInteger(key: keyof Q) {
    const number = this.parseNumber(key);

    if (Number.isInteger(number)) {
      return number;
    }
  }
}

export interface RouteProps<P extends string> {
  path: P;
  component: JSX.ComponentLike<{
    route: RouteParams<P>;
    query: QueryParams<P>;
  }>;
}

export interface RouterTarget {
  hash: string;
  params?: URLSearchParams;
}

export const navigate = (hash: string, params?: URLSearchParams) => {
  const { pathname, search = new URLSearchParams() } = splitUrl(hash) ?? {};

  if (pathname != null) {
    for (const [key, value] of params ?? []) {
      search.set(key, value);
    }

    // TODO simplify using URL constructor
    window.location.hash = `#${pathname}?${search}`.replace(/\?$/, "");
  }
};
