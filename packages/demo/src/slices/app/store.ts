import { createStore } from "@cascateer/core";
import { add } from "./cube/math";
import { Cube } from "./cube/types";

export default createStore({
  counter: { value: 0 },
  cube: {
    baseActionQueue: new Array<Cube.BaseAction>(),
    currentBaseActionIndex: 0,
  },
}).with(({ StoreProvider }) =>
  new StoreProvider()
    .provideEffects(({ effect }) => ({
      counter__value: effect(({ data }) =>
        data.property("counter").property("value"),
      ),
      cube__baseActionQueue: effect(({ data }) =>
        data.property("cube").property("baseActionQueue"),
      ),
      cube__currentBaseActionIndex: effect(({ data }) =>
        data.property("cube").property("currentBaseActionIndex"),
      ),
    }))
    .provideActions(({ action }) => ({
      counter__incrementValue: action<number>((effects) =>
        effects.counter__value.update(add),
      ),
      cube__incrementCurrentBaseActionIndex: action<void>((effects) =>
        effects.cube__currentBaseActionIndex.update(() => add(1), {
          sameOrigin: true,
        }),
      ),
    }))
    .complete(),
);
