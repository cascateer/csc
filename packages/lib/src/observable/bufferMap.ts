import { Function1 } from "lodash";
import {
  audit,
  combineLatest,
  ignoreElements,
  Observable,
  OperatorFunction,
  scan,
  startWith,
} from "rxjs";

export interface BufferMapSubscriber<T, U> {
  payload: T;
  resolve: Function1<U, void>;
  reject: Function1<any, void>;
}

export const bufferMap =
  <T, U>(
    project: Function1<T, Promise<U>>,
  ): OperatorFunction<BufferMapSubscriber<T, U>, never> =>
  (source$) =>
    combineLatest([
      source$,
      new Observable<{ resolve?: U; reject?: any }>((subscriber) =>
        source$
          .pipe(
            audit(async ({ payload }) => {
              try {
                subscriber.next({ resolve: await project(payload) });
              } catch (error) {
                subscriber.next({ reject: error });
              }
            }),
          )
          .subscribe(),
      ).pipe(startWith(void 0)),
    ]).pipe(
      scan((acc, [curr, { resolve, reject } = {}]) => {
        if (reject != null) {
          return acc.flatMap((subscriber) => (subscriber.reject(reject), []));
        }

        if (resolve != null) {
          return acc.flatMap((subscriber) => (subscriber.resolve(resolve), []));
        }

        return acc.concat(curr);
      }, new Array<BufferMapSubscriber<T, U>>()),
      ignoreElements(),
    );
