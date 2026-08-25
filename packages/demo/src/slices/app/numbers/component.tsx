import { map } from "rxjs";
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
        onClick={() => void ctx.store.actions.addNumber()}
      >
        Add
      </button>
      <div className={list}>
        {ctx.store.effects.numbers().list((number$) => (
          <div>{number$.pipe(map(({ value }) => "--".repeat(value)))}</div>
        ))}
      </div>
    </>
  ));
