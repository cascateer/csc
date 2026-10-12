import { asArray } from "@cascateer/lib";
import {
  asObservable,
  flatMap,
  mutationRecords,
} from "@cascateer/lib/observable";
import { difference, tap } from "lodash";
import {
  combineLatest,
  distinctUntilChanged,
  map,
  scan,
  shareReplay,
  startWith,
  switchMap,
} from "rxjs";
import { isPrimitive } from "utility-types";
import { unlink } from "./dom";
import { FinalizationObserver } from "./jsx-runtime";

class SlotComment extends Comment {
  constructor(public target: SlotFragment) {
    super("slot");
  }
}

class SlotFragment extends DocumentFragment {
  updateSlot(previous?: Comment) {
    return {
      previous,
      current: this.appendChild(new SlotComment(this)),
    };
  }

  slot$ = mutationRecords(this, { childList: true }).pipe(
    map((records) => records.flatMap((record) => [...record.removedNodes])),
    scan((slot, removedNodes) => {
      if (removedNodes.includes(slot.current)) {
        if (slot.previous != null) {
          unlink(slot.previous);
        }

        return this.updateSlot(slot.current);
      }

      return slot;
    }, this.updateSlot()),
    flatMap((slot) => slot.previous ?? []),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

export class ObservableFragment extends SlotFragment {
  unlink() {
    new DocumentFragment().append(this);
  }

  constructor({ children = [] }: JSX.IntrinsicAttributes = {}) {
    super();

    const nodes$ = asObservable(children).pipe(
      map(asArray),
      switchMap((elements) =>
        combineLatest(
          elements.map((element) =>
            asObservable(element).pipe(
              map((element) =>
                element == null || element === false
                  ? []
                  : isPrimitive(element)
                    ? new Text(element.toString())
                    : element,
              ),
            ),
          ),
        ).pipe(
          startWith([new Comment("placeholder")]),
          map((nodes) => nodes.flat()),
        ),
      ),
    );

    combineLatest([this.slot$, nodes$])
      .pipe(
        scan((previousNodes, [slot, nodes]) => {
          for (const node of difference(previousNodes, nodes)) {
            if (node instanceof ObservableFragment) {
              node.unlink();
            } else {
              node.parentElement?.removeChild(node);
            }
          }

          slot.parentNode?.insertBefore(
            tap(new DocumentFragment(), (content) => content.append(...nodes)),
            slot,
          );

          return nodes;
        }, new Array<Node>()),
      )
      .subscribe();

    new FinalizationObserver(this).subscribe();
  }
}
