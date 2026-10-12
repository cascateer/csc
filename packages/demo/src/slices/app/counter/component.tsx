import cn from "classnames";
import { interval, map } from "rxjs";
import { appSlice } from "../slice";

export const AppCounterComponent = appSlice
  .createComponent("counter")
  .withStyles(import("../styles.module.scss"), import("./styles.module.scss"))
  .withTemplate((ctx, { button }, { counterIncrementButton }) => () => (
    <button
      className={cn(button, counterIncrementButton)}
      onClick={() => void ctx.store.actions.incrementCounterValue(1)}
      style={{
        backgroundColor: interval(1e3).pipe(
          map((i) => ["green", "blue", "red"][i % 3]),
        ),
      }}
    >
      {ctx.terminal.effects.counterValue(1)}
    </button>
  ));
