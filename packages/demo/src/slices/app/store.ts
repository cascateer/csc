import { createStore } from "@cascateer/core";
import { Enumerator, property } from "@cascateer/lib";
import { AppState } from "./types";

export default createStore<AppState>({
  counter: { value: 0 },
  numbers: [],
}).with(({ StoreProvider }) =>
  new StoreProvider()
    .provideEffects(({ effect }) => ({
      counterValue: effect(({ data }) => data.prop("counter").prop("value")),
      numbers: effect(({ data }) =>
        data.prop("numbers", new Enumerator(property("id"))),
      ),
    }))
    .provideActions(({ action }) => ({
      reset: action<void>(({ data }) =>
        data.update(() => () => ({ counter: { value: 0 }, numbers: [] })),
      ),
      incrementCounterValue: action<number>(({ counterValue }) =>
        counterValue.update(
          (increment) => (counterValue) => counterValue + increment,
        ),
      ),
      addNumber: action<void>(({ data }) =>
        data.update(() => (data) => ({
          ...data,
          numbers: data.numbers.concat({
            id: data.numbers.length,
            value: data.counter.value + 1,
          }),
        })),
      ),
    }))
    .complete(),
);
