import { ApiProvider, createApi } from "@cascateer/core";
import {
  AppApi,
  AppControllerGetIconsRequest,
  AppControllerPostIconRequest,
} from "@cascateer/server/api";

export default createApi(
  new ApiProvider(new AppApi())
    .provideEffects(({ effect }) => ({
      icons: effect<AppControllerGetIconsRequest, string[]>((api) => ({
        predicate: (req) => api.appControllerGetIcons(req),
      })),
    }))
    .provideActions(({ action }) => ({
      addIcon: action<AppControllerPostIconRequest, string[]>((api) => ({
        predicate: (req) => api.appControllerPostIcon(req),
      })),
    }))
    .complete(),
);
