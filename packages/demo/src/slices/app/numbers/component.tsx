import { property } from "@cascateer/lib";
import { map } from "rxjs";
import { v4 } from "uuid";
import { appSlice } from "../slice";

export const AppNumbersComponent = appSlice
  .createComponent("numbers")
  .withStyles(
    import("../styles.module.scss"),
    import("./styles.module.scss"),
    import("./styles.scss?inline"),
  )
  .withTemplate((ctx, { button }, { list }) => () => (
    <>
      <button
        className={button}
        onClick={() => ctx.store.actions.addNumber(v4())}
      >
        Add
      </button>
      <div className={list}>
        {ctx.store.effects.numbers().list((number) => (
          <div>{number.pipe(map(property("id")))}</div>
        ))}
      </div>
    </>
  ));
