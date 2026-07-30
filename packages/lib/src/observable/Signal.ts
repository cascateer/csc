import { clone, Function1, identity, isEqual, memoize } from "lodash";
import { distinctUntilChanged, map, Observable } from "rxjs";
import {
  asEnumerable,
  EndoFunctionOperator,
  EnumerableItem,
  Enumerator,
  nonNullable,
  property,
} from "..";
import { ProxyObservable } from "./ProxyObservable";

export class Signal<D, T> extends ProxyObservable<T> {
  clone(): Signal<D, T> {
    return this;
  }

  get value(): Observable<T> {
    return this;
  }

  enumerator: Enumerator<T>;
  retract: EndoFunctionOperator<T, D>;

  constructor({
    value,
    enumerator = new Enumerator(),
    retract = identity,
  }: {
    value: Observable<T>;
    enumerator?: Enumerator<T>;
    retract?: EndoFunctionOperator<T, D>;
  }) {
    super(value);

    this.enumerator = enumerator;
    this.retract = retract;
  }

  private map<U>(
    project: Function1<T, U>,
    retract: EndoFunctionOperator<U, T>,
    enumerator?: Enumerator<U>,
  ): Signal<D, U> {
    return new Signal({
      value: this.pipe(map(project), distinctUntilChanged()),
      enumerator,
      retract: (transform) => this.retract(retract(transform)),
    });
  }

  protected property<K extends keyof T>(
    key: K,
    enumerator?: Enumerator<T[K]>,
  ): Signal<D, T[K]> {
    const findProperty: Function1<T, T[K]> = property(key);

    return this.map(
      findProperty,
      (transform) => (value) => {
        value = clone(value);

        value[key] = transform(findProperty(value));

        return value;
      },
      enumerator,
    );
  }

  protected item(
    key: PropertyKey,
    enumerator?: Enumerator<EnumerableItem<T>>,
  ): Signal<D, EnumerableItem<T>> {
    const findIndex = this.enumerator.findIndex(key);
    const findItem: Function1<T, EnumerableItem<T>> = (value) =>
      nonNullable(asEnumerable(value)[findIndex(value)]);

    return this.map(
      findItem,
      (transform) => (value) => {
        if (Array.isArray((value = clone(value)))) {
          value[findIndex(value)] = transform(findItem(value));
        }

        return value;
      },
      enumerator,
    );
  }

  protected collection<K extends keyof EnumerableItem<T>>(
    key: K,
  ): Signal<D, EnumerableItem<T>[K][]> {
    return this.map(
      (value) => asEnumerable(value).map(property(key)),
      (transform) => (value) => {
        if (Array.isArray((value = clone(value)))) {
          value.reduce(
            (property, item, index) => (
              (item[key] = property[index]),
              property
            ),
            transform(value.map(property(key))),
          );
        }

        return value;
      },
    );
  }

  list<U>(
    iteratee: (item: Signal<D, EnumerableItem<T>>, index: number) => U,
  ): Observable<U[]> {
    const memoizedIteratee = memoize<(key: PropertyKey, index: number) => U>(
      (key, index) => iteratee(this.item(key), index),
    );

    return this.pipe(
      map(this.enumerator.enumerate),
      distinctUntilChanged((previous, current) => isEqual(previous, current)),
      map((keys) => keys.map(memoizedIteratee)),
    );
  }
}

export class DerivedSignal<D, T = D> extends Signal<D, T> {
  property<K extends keyof T>(
    key: K,
    enumerator?: Enumerator<T[K]>,
  ): DerivedSignal<D, T[K]> {
    return new DerivedSignal(super.property(key, enumerator));
  }

  item(
    key: PropertyKey,
    enumerator?: Enumerator<EnumerableItem<T>>,
  ): DerivedSignal<D, EnumerableItem<T>> {
    return new DerivedSignal(super.item(key, enumerator));
  }

  collection<K extends keyof EnumerableItem<T>>(
    key: K,
  ): DerivedSignal<D, EnumerableItem<T>[K][]> {
    return new DerivedSignal(super.collection(key));
  }
}
