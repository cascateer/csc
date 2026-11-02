import { Observable, of } from "rxjs";

export class ProxyObservable<T> extends Observable<T> {
  constructor(
    target: Observable<T>,
    public hash: string,
    public finalized = of(true),
  ) {
    super((subscriber) => target.subscribe(subscriber));
  }
}
