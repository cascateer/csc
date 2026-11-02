import { AppCounter } from "./counter/component";
import { AppIcons } from "./icons/component";
import { AppNumbers } from "./numbers/component";
import { appSlice } from "./slice";

export const AppRoot = appSlice
  .createComponent("root")
  .withStyles(
    import("./styles.module.scss"),
    import("../../styles.inline.scss"),
    import("./styles.inline.scss"),
  )
  .withTemplate((ctx, { button }) => () => (
    <>
      <AppIcons />
      <AppCounter />
      <AppNumbers />
      <button className={button} onClick={() => ctx.store.actions.reset()}>
        Reset
      </button>
    </>
  ));
