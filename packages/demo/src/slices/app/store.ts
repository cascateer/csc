import { createStore } from "@cascateer/core";

export default createStore({ counter: { value: 0 } }).with(
  ({ StoreProvider }) =>
    new StoreProvider()
      .provideEffects(({ effect }) => ({
        counterValue: effect(({ data }) =>
          data.property("counter").property("value"),
        ),
      }))
      .provideActions(({ action }) => ({
        incrementCounterValue: action<number>(({ counterValue }) =>
          counterValue.update((increment) => (value) => value + increment),
        ),
      }))
      .complete(),
);
