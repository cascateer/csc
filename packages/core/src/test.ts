import { keys } from "@cascateer/lib";
import { createRoot } from ".";
import { splitUrl } from "./lib/splitUrl";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Sample {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    type Component = JSX.Component<{}>;

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    export interface Components extends Record<keyof {}, Component> {}
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

export const loadSample = async (
  sampleQuery: string | undefined | null = splitUrl(
    window.location.hash,
  )?.search.get("sample"),
) => {
  const samples = import.meta.glob("/**/*.samples.tsx");

  for (const url in samples) {
    await samples[url]?.call(null);
  }

  const sample = keys(SampleRegistry.components).find(
    (key) => key === sampleQuery,
  );

  const root = Object.assign(document.createElement("div"), { id: "root" });

  document.body.replaceChildren(root);

  if (sample != null) {
    createRoot(root).render(
      // eslint-disable-next-line
      SampleRegistry.components[sample]
        // @ts-expect-error Property 'call' does not exist on type 'never'
        ?.call(null, {}),
    );
  }
};
