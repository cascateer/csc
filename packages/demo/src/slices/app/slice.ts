import { createSlice } from "@cascateer/core";
import { map } from "rxjs";

export const appSlice = await createSlice("app")
  .withStore(import("./store"))
  .withApi(import("./api"))
  .withTerminal(({ TerminalProvider }) =>
    new TerminalProvider()
      .provideEffects(({ effect }) => ({
        counterValue: effect<number, number>(
          ({ store }) =>
            (offset) =>
              store.effects.counterValue().pipe(map((value) => value + offset)),
        ),
      }))
      .complete(),
  );
