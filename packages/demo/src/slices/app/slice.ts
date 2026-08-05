import { createSlice } from "@cascateer/core";
import { modulo } from "@cascateer/lib/math";
import { combineLatest, map } from "rxjs";
import { add } from "./cube/math";
import { Cube } from "./cube/types";

export const appSlice = await createSlice("app")
  .withStore(import("./store"))
  .withApi(import("./api"))
  .withTerminal(({ TerminalProvider }) =>
    new TerminalProvider()
      .provideEffects(({ effect }) => ({
        counter__value: effect<number, number>(
          ({ store }) =>
            (offset) =>
              store.effects.counter__value().pipe(map(add(offset))),
        ),
        cube__currentBaseActionParity: effect<void, Cube.BaseActionParity>(
          ({ store }) =>
            () =>
              store.effects
                .cube__currentBaseActionIndex()
                .pipe(
                  map((index) => (modulo(index, 2) === 1 ? "odd" : "even")),
                ),
        ),
        cube__currentBaseAction: effect<void, Cube.BaseAction | undefined>(
          ({ store }) =>
            () =>
              combineLatest([
                store.effects.cube__baseActionQueue(),
                store.effects.cube__currentBaseActionIndex(),
              ]).pipe(map(([queue, index]) => queue[index])),
        ),
        cube__currentSliceActions: effect<void, Cube.SliceAction[]>(
          ({ store }) =>
            () =>
              combineLatest([
                store.effects.cube__baseActionQueue(),
                store.effects.cube__currentBaseActionIndex(),
              ]).pipe(map(([queue, index]) => queue.slice(0, index).flat())),
        ),
      }))
      .provideEffects(({ effect }) => ({
        cube__layout: effect<void, Cube.Layout>(
          ({ terminal }) =>
            () =>
              terminal.effects
                .cube__currentSliceActions()
                .pipe(map((actions) => new Cube.Layout().apply(...actions))),
        ),
      }))
      .complete(),
  );
