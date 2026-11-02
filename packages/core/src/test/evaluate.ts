import { MaybePromise } from "@cascateer/lib/promise";
import puppeteer, { ElementHandle } from "puppeteer";

const { VITE_HOST, VITE_PORT } = import.meta.env;

export const evaluate = <T>(
  sample: keyof Sample.Components,
  callback: (handle: ElementHandle<Element>) => MaybePromise<T>,
): Promise<T> =>
  puppeteer
    .launch({
      headless: false,
      acceptInsecureCerts: true,
      devtools: true,
      browser: "firefox",
    })
    .then((browser) =>
      browser.newPage().then(async (page) => {
        await page.goto(
          `https://${VITE_HOST}:${VITE_PORT}/#/test?sample=${sample}`,
        );

        const value = await page.locator("#root").waitHandle().then(callback);

        await browser.close();

        return value;
      }),
    );
