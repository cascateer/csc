import { MaybePromise } from "@cascateer/lib/promise";
import puppeteer, { ElementHandle } from "puppeteer";
import { SampleRegistry } from "../test";

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
SampleRegistry;

const { VITE_HOST, VITE_PORT } = import.meta.env;

export const evaluate = <T>(
  sample: keyof Sample.Components,
  callback: (handle: ElementHandle<Element>) => MaybePromise<T>,
): Promise<T> =>
  puppeteer.launch().then((browser) =>
    browser.newPage().then(async (page) => {
      await page.goto(
        // eslint-disable-next-line  @typescript-eslint/restrict-template-expressions
        `http://${VITE_HOST}:${VITE_PORT}/test/?sample=${sample}`,
      );

      const value = await page.locator("#root").waitHandle().then(callback);

      await browser.close();

      return value;
    }),
  );
