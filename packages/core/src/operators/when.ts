import { asArray } from "@cascateer/lib";
import {
  asObservable,
  flatMap,
  ProxyObservable,
} from "@cascateer/lib/observable";
import { Function1 } from "lodash";
import { combineLatest, startWith, switchMap } from "rxjs";

export const when = <T>(
  source: ProxyObservable<T>,
  finalizedResult: Function1<T, JSX.Element>,
  notFinalizedResult: Function1<void, JSX.Element> = () => "Loading...",
): JSX.Element =>
  combineLatest([source.pipe(startWith(new Array<T>())), source.finalized])
    .pipe(
      flatMap(([value, finalized]) =>
        finalized ? asArray(value).map(finalizedResult) : notFinalizedResult(),
      ),
    )
    .pipe(switchMap(asObservable));
