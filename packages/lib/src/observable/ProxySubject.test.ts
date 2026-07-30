import { lastValueFrom, map, of, ReplaySubject, toArray } from "rxjs";
import { expect, test } from "vitest";
import { ProxySubject } from "./ProxySubject";

test("ProxySubject", () => {
  const squareNumber = new ProxySubject(new ReplaySubject<number>(), (target) =>
    target.pipe(map((x) => x ** 2)),
  );

  of(1, 2, 3, 4).subscribe(squareNumber);

  return lastValueFrom(squareNumber.pipe(toArray())).then((squareNumbers) =>
    expect(squareNumbers).toEqual([1, 4, 9, 16]),
  );
});
