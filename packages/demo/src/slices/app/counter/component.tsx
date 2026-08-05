import { appSlice } from "../slice";

export const AppCounterComponent = appSlice
  .createComponent("counter")
  .withStyles(import("./styles.module.scss"))
  .withTemplate((ctx, { incrementButton }) => () => (
    <button
      className={incrementButton}
      onClick={() => ctx.store.actions.incrementCounterValue(1)}
    >
      {ctx.terminal.effects.counterValue(1)}
    </button>
  ));
