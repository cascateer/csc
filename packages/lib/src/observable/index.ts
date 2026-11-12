import { isObservable, Observable, of } from "rxjs";

export { bufferMap, BufferMapSubscriber } from "./bufferMap";
export { eventListener } from "./eventListener";
export { exchangeMessages } from "./exchangeMessages";
export { flatMap } from "./flatMap";
export { mutationRecords } from "./mutationRecords";
export { NextObservable } from "./NextObservable";
export { ProxyObservable } from "./ProxyObservable";
export { reduce } from "./reduce";
export { DerivedSignal, Signal } from "./Signal";
export { transform } from "./transform";

export const asObservable = <T>(value: MaybeObservable<T>): Observable<T> =>
  isObservable(value) ? value : of(value);

export type MaybeObservable<T> = T | Observable<T>;

export type MaybeObservableTuple<T> = {
  [K in keyof T]: MaybeObservable<T[K]>;
};
