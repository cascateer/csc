import { AppCounterComponent } from "./counter/component";
import { AppCubeComponent } from "./cube/component";
import { appSlice } from "./slice";

export const AppRootComponent = appSlice
  .createComponent("root")
  .withStyles(import("./styles.scss?inline"))
  .withTemplate(() => () => (
    <>
      <AppCubeComponent />
      <AppCounterComponent />
    </>
  ));
