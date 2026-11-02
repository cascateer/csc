import { asObservable } from "@cascateer/lib/observable";
import { defer, switchMap } from "rxjs";

export const fromComponentLike =
  <P extends JSX.Props>(component: JSX.ComponentLike<P>): JSX.Component<P> =>
  (props) =>
    defer(async () => component(props)).pipe(
      switchMap(asObservable),
      switchMap(asObservable),
    );
