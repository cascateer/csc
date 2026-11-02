import { entries } from "@cascateer/lib";
import { createRoot } from "./jsx-runtime";
import { QueryParams } from "./router";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Sample {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    type Component = JSX.Component<{}>;

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    export interface Components extends Record<
      keyof {
        __no_empty_object_sample__: Component;
      },
      Component
    > {}
  }
}

export class SampleRegistry {
  static components: Partial<Sample.Components> = {};

  static register(components: Partial<Sample.Components>) {
    this.components = {
      ...this.components,
      ...components,
    };
  }
}

export const loadSample = async ({
  query,
}: {
  query: QueryParams<"/test?sample">;
}) => {
  const samples = import.meta.glob("/**/*.samples.tsx");

  for (const url in samples) {
    await samples[url]?.call(null);
  }

  for (const [key, SampleComponent] of entries(SampleRegistry.components)) {
    if (key === query.parseString("sample")) {
      return createRoot(
        Object.assign(document.createElement("div"), { id: "root" }),
      ).render(SampleComponent?.call(null, {}));
    }
  }
};
