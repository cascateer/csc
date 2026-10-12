import { flatMap } from "@cascateer/lib/observable";
import { appSlice } from "../slice";

export const AppNumbersComponent = appSlice
  .createComponent("numbers")
  .withStyles(
    import("../styles.module.scss"),
    import("./styles.module.scss"),
    import("./styles.scss?inline"),
  )
  .withTemplate((ctx, { button }, { numbersList }) => () => {
    return (
      <>
        <button
          className={button}
          onClick={() => void ctx.store.actions.addNumber()}
        >
          Add
        </button>
        <div className={numbersList}>
          {ctx.store.effects.numbers().list((number$) => (
            <code onTeardown={() => console.log("done")}>
              {number$.pipe(
                flatMap((item) =>
                  item != null
                    ? `[--${item.value.toString().padStart(3, "0")}--]`
                    : [],
                ),
              )}
            </code>
          ))}
        </div>
      </>
    );
  });
