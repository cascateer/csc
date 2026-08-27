import {
  AppControllerGetIconsGroupEnum,
  AppControllerPostIconGroupEnum,
} from "@cascateer/server/api";
import { map } from "rxjs";
import { appSlice } from "../slice";

export const AppIconsComponent = appSlice
  .createComponent("icons")
  .withStyles(import("../styles.module.scss"))
  .withTemplate((ctx, { button }) => () => (
    <>
      <button
        className={button}
        onClick={() =>
          void ctx.api.actions.addIcon({
            group: AppControllerPostIconGroupEnum.Insects,
            requestBody: ["🪰"],
          })
        }
      >
        {ctx.api.effects
          .icons({
            group: AppControllerGetIconsGroupEnum.Insects,
          })
          .pipe(map(({ data }) => data.join("")))}
      </button>
    </>
  ));
