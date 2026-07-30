import { map, OperatorFunction, scan } from "rxjs";

export const reduce =
  <Event, Result = Event>(
    predicate: (output: Result, event: Event, previousEvent?: Event) => Result,
    seed: (event: Event) => Result,
  ): OperatorFunction<Event, Result> =>
  (source) =>
    source.pipe(
      scan(
        ({ outputs, previousEvent }, event) => ({
          outputs: [
            0 in outputs
              ? predicate(outputs[0], event, previousEvent)
              : seed(event),
          ],
          previousEvent: event,
        }),
        <{ outputs: Result[]; previousEvent?: Event }>{
          outputs: [],
        },
      ),
      map(({ outputs }) => {
        if (0 in outputs) {
          return outputs[0];
        }

        throw new Error();
      }),
    );
