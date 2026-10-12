import { Router } from "@cascateer/core";
import { AppRootComponent } from "./slices/app";

new Router()
  .addRoute({
    path: "{/}",
    component: () => <AppRootComponent />,
  })
  .addRoute({
    path: "/test",
    component: () =>
      void import("@cascateer/core").then(({ loadSample }) => loadSample()),
  })
  .init();
