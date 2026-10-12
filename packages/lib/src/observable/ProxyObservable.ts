import { Observable } from "rxjs";

export class ProxyObservable<T> extends Observable<T> {
  constructor(
    target: Observable<T>,
    public finalized: Observable<boolean>,
  ) {
    super((subscriber) => target.subscribe(subscriber));
  }
}
