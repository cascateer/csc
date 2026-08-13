import {
  identity,
  lastValueFrom,
  of,
  ReplaySubject,
  scan,
  startWith,
  toArray,
} from "rxjs";
import { expect, test } from "vitest";
import { DerivedSignal } from ".";
import { EndoFunction, Enumerator } from "..";

test("prop projection", () => {
  const signal = new DerivedSignal({
    value: of({ number: 1 }, { number: 2 }, { number: 3 }),
  }).prop("number");

  return lastValueFrom(signal.pipe(toArray())).then((numbers) =>
    expect(numbers).toEqual([1, 2, 3]),
  );
});

test("transform retraction", () => {
  const transforms = new ReplaySubject<EndoFunction<{ number: number }>>();
  const signal = new DerivedSignal<{ number: number }>({
    value: transforms.pipe(
      startWith(identity),
      scan((state, transform) => transform(state), { number: 1 }),
    ),
  }).prop("number");

  transforms.next(signal.retract((number) => number + 1));
  transforms.next(signal.retract((number) => number + 2));
  transforms.complete();

  return lastValueFrom(signal.pipe(toArray())).then((numbers) =>
    expect(numbers).toEqual([1, 2, 4]),
  );
});

test("item projection", () => {
  const signal = new DerivedSignal({
    value: of({
      values: [{ id: 1 }, { id: 2 }, { id: 3 }],
    }),
  }).prop("values", new Enumerator((item) => item.id));

  return lastValueFrom(signal.item(1)).then((item) =>
    expect(item).toEqual({ id: 1 }),
  );
});

test("collection/enumeration", () => {
  const signal = new DerivedSignal({
    value: of({
      values: [{ id: 1 }, { id: 2 }, { id: 3 }],
    }),
  }).prop("values", new Enumerator((item) => item.id));

  return lastValueFrom(signal.coll("id")).then((coll) =>
    expect(coll).toEqual([1, 2, 3]),
  );
});
