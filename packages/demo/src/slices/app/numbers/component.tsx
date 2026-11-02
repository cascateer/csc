import { flatMap } from "@cascateer/lib/observable";
import { appSlice } from "../slice";

export const AppNumbers = appSlice
  .createComponent("numbers")
  .withStyles(
    import("../styles.module.scss"),
    import("./styles.module.scss"),
    import("./styles.inline.scss"),
  )
  .withTemplate((ctx, { button }, { numbersList }) => () => {
    return (
      <>
        <button
          className={button}
          onClick={() => ctx.store.actions.addNumber()}
        >
          Add
        </button>
        <div className={numbersList}>
          {ctx.store.effects.numbers().list((number$) => (
            <code>
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
