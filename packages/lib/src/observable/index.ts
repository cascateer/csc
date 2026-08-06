import { isObservable, Observable, ObservableInput, of } from "rxjs";

export { eventListener } from "./eventListener";
export { exchangeMessages } from "./exchangeMessages";
export { flatMap } from "./flatMap";
export { NextObservable } from "./NextObservable";
export { ProxyObservable } from "./ProxyObservable";
export { reduce } from "./reduce";
export { DerivedSignal, Signal } from "./Signal";

export const asObservable = <T>(value: MaybeObservable<T>): Observable<T> =>
  isObservable(value) ? value : of(value);

export type MaybeObservable<T> = T | Observable<T>;

export type MaybeObservableInput<T> = T | ObservableInput<T>;

export type MaybeObservableInputTuple<T> = {
  [K in keyof T]: MaybeObservableInput<T[K]>;
};
