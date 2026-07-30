import { fromEvent, Observable } from "rxjs";
import { flatMap } from ".";

export const eventListener = <
  T extends Node,
  K extends keyof HTMLElementEventMap,
>(
  target: T,
  type: K,
): Observable<{ type: K; target: T }> =>
  fromEvent(target, type).pipe(
    flatMap((event) => {
      const { currentTarget } = event;

      if (currentTarget instanceof Node && target.isEqualNode(currentTarget)) {
        return {
          type,
          target,
        };
      }

      return [];
    }),
  );
