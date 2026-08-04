import { AppCounterComponent } from "./counter/component";
import { appSlice } from "./slice";

export const AppRootComponent = appSlice
  .createComponent("root")
  .withStyles(import("./styles.scss"))
  .withTemplate(() => () => <AppCounterComponent />);
