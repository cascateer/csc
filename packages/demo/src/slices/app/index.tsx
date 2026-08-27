import { AppCounterComponent } from "./counter/component";
import { AppIconsComponent } from "./icons/component";
import { AppNumbersComponent } from "./numbers/component";
import { appSlice } from "./slice";

export const AppRootComponent = appSlice
  .createComponent("root")
  .withStyles(import("./styles.module.scss"), import("./styles.scss?inline"))
  .withTemplate((ctx, { button }) => () => (
    <>
      <AppIconsComponent />
      <AppCounterComponent />
      <AppNumbersComponent />
      <button className={button} onClick={() => void ctx.store.actions.reset()}>
        Reset
      </button>
    </>
  ));
