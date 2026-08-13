import { AppCounterComponent } from "./counter/component";
import { AppNumbersComponent } from "./numbers/component";
import { appSlice } from "./slice";

export const AppRootComponent = appSlice
  .createComponent("root")
  .withStyles(import("./styles.scss?inline"))
  .withTemplate(() => () => (
    <>
      <AppCounterComponent />
      <AppNumbersComponent />
    </>
  ));
