import { asArray } from "@cascateer/lib";
import { asObservable, flatMap } from "@cascateer/lib/observable";
import { difference, tap } from "lodash";
import {
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  of,
  scan,
  shareReplay,
  startWith,
  Subscription,
  switchMap,
  Unsubscribable,
} from "rxjs";
import { isPrimitive } from "utility-types";
import { insert, unlink } from "./dom";

class AnchorComment extends Comment {
  constructor(public target: AnchorFragment) {
    super("anchor");
  }
}

class AnchorFragment extends DocumentFragment {
  appendAnchor(previous?: Comment) {
    return {
      previous,
      current: this.appendChild(new AnchorComment(this)),
    };
  }

  anchor$ = new Observable<Node[]>((subscriber) => {
    const observer = tap(
      new MutationObserver((records) =>
        subscriber.next(records.flatMap((record) => [...record.removedNodes])),
      ),
      (observer) => observer.observe(this, { childList: true }),
    );

    return {
      unsubscribe: () => observer.disconnect(),
    };
  }).pipe(
    scan((anchor, removedNodes) => {
      if (removedNodes.includes(anchor.current)) {
        if (anchor.previous != null) {
          unlink(anchor.previous);
        }

        return this.appendAnchor(anchor.current);
      }

      return anchor;
    }, this.appendAnchor()),
    flatMap((anchor) => anchor.previous ?? []),
    distinctUntilChanged(),
    shareReplay(1),
  );
}

export class ObservableFragment
  extends AnchorFragment
  implements Unsubscribable
{
  private subscription: Subscription;

  unsubscribe(): void {
    this.subscription.unsubscribe();
  }

  get nodes$(): Observable<Node[]> {
    return asObservable(this.content).pipe(
      map(asArray),
      switchMap((elements) =>
        combineLatest(
          elements.map((element) =>
            asObservable(element).pipe(
              switchMap((element) =>
                element instanceof ObservableFragment
                  ? element.nodes$
                  : of(
                      element == null || element === false
                        ? []
                        : isPrimitive(element)
                          ? new Text(element.toString())
                          : element,
                    ),
              ),
            ),
          ),
        ).pipe(
          startWith([new Comment("child-nodes")]),
          map((nodes) => nodes.flat()),
        ),
      ),
    );
  }

  constructor(private content: JSX.Children = []) {
    super();

    this.subscription = combineLatest([this.anchor$, this.nodes$])
      .pipe(
        scan((currentNodes, [anchor, nextNodes]) => {
          unlink(...currentNodes);

          for (const removedNode of difference(currentNodes, nextNodes)) {
            const walker = document.createTreeWalker(
              removedNode,
              NodeFilter.SHOW_COMMENT,
            );

            while (walker.nextNode()) {
              if (
                walker.currentNode instanceof AnchorComment &&
                walker.currentNode.target instanceof ObservableFragment
              ) {
                walker.currentNode.target.unsubscribe();
              }
            }
          }

          return insert(...nextNodes).before(anchor);
        }, new Array<Node>()),
      )
      .subscribe();
  }
}
