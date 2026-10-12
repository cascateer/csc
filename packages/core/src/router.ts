import { nonNullable } from "@cascateer/lib";
import { RouteParameters } from "express-serve-static-core";
import { Function1, fromPairs } from "lodash";
import { match as matchFunction } from "path-to-regexp";
import { String } from "ts-toolbelt";
import { createRoot } from "./jsx-runtime";
import { splitUrl } from "./lib/splitUrl";

type QueryParams<U extends string> = Partial<{
  [
    QueryElement in String.Split<
      String.Split<U, "?">[1],
      "&"
    >[number] as String.Split<QueryElement, "=">[0]
  ]: string | string[];
}>;

type RouteParams<P extends string> = Partial<
  RouteParameters<String.Split<P, "?">[0]>
>;

interface Route<P extends string> {
  path: P;
  component: (params: {
    route: RouteParams<P>;
    query: QueryParams<P>;
  }) => JSX.Element;
}

export class Router {
  handlers = new Array<
    Function1<
      { pathname: string; search: URLSearchParams },
      JSX.Component | undefined
    >
  >();

  addRoute<Path extends string>(route: Route<Path>): this {
    this.handlers.push(({ pathname, search }) => {
      const match = matchFunction(nonNullable(splitUrl(route.path)?.pathname))(
        pathname,
      );

      if (match !== false) {
        return () =>
          route.component({
            route: match.params as RouteParams<Path>,
            query: fromPairs(Array.from(search.entries())) as QueryParams<Path>,
          });
      }
    });

    return this;
  }

  init(): this {
    navigation.addEventListener("navigate", (event) => {
      if (event.hashChange) {
        this.handleRouteChange(new URL(event.destination.url).hash);
      }
    });

    this.handleRouteChange(window.location.hash);

    return this;
  }

  navigate(hash: string, params?: URLSearchParams) {
    const { pathname, search = new URLSearchParams() } = splitUrl(hash) ?? {};

    if (pathname != null) {
      for (const [key, value] of params ?? []) {
        search.set(key, value);
      }

      window.location.hash = `#/${pathname}?${search}`.replace(/\?$/, "");
    }
  }

  matchRoute(hash: string): JSX.Component {
    const url = splitUrl(hash);

    if (url != null) {
      for (const handler of this.handlers) {
        try {
          const element = handler(url);

          if (element != null) {
            return element;
          }
        } catch (err) {
          console.error(err);

          continue;
        }
      }
    }

    return () => "Not found";
  }

  handleRouteChange(hash: string) {
    createRoot(document.body).render(this.matchRoute(hash)({}));
  }
}
