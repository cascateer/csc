import { SampleRegistry } from "@cascateer/core";
import { scan, Subject } from "rxjs";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Sample {
    interface Components {
      sample1: Sample.Component;
      sample2: Sample.Component;
      sample3: Sample.Component;
    }
  }
}

SampleRegistry.register({
  sample1() {
    return <>{"sample1"}</>;
  },
  sample2() {
    return <input type="text" />;
  },
  sample3() {
    const toggleSubject$ = new Subject<void>();

    return (
      <>
        <button type="button" onClick={() => toggleSubject$.next()}></button>
        <input
          type="checkbox"
          checked={toggleSubject$.pipe(scan((acc) => !acc, false))}
        />
      </>
    );
  },
});
