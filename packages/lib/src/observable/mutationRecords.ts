import { tap } from "lodash";
import { Observable } from "rxjs";

export const mutationRecords = (target: Node, options?: MutationObserverInit) =>
  new Observable<MutationRecord[]>((subscriber) => {
    const observer = tap(
      new MutationObserver((records) => subscriber.next(records)),
      (observer) => observer.observe(target, options),
    );

    return {
      unsubscribe: () => observer.disconnect(),
    };
  });
