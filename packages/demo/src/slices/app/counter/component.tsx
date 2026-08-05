import { appSlice } from "../slice";

export const AppCounterComponent = appSlice
  .createComponent("counter")
  .withStyles(import("./styles.module.scss"))
  .withTemplate((ctx, { incrementButton }) => () => (
    <button
      className={incrementButton}
      onClick={() => ctx.store.actions.counter__incrementValue(1)}
    >
      {ctx.terminal.effects.counter__value(1)}
    </button>
  ));
