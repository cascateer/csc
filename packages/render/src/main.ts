import { readFileSync } from "fs";
import { createServer } from "https";
import { envConfig } from "../../../lib/src/envConfig";
import app from "./app";

const { NODE_ENV, PORT, HOST } = envConfig();

const nodeEnv = NODE_ENV?.trim();
const port = +PORT!;
const host = HOST!;

const callback =
  ({ secure }: { secure: boolean }) =>
  () =>
    console.info(
      `Server is running on http${secure ? "s" : ""}://${host}:${port}`,
    );

if (nodeEnv === "development") {
  createServer(
    {
      pfx: readFileSync("./ssl.pfx"),
      passphrase: "passphrase",
    },
    app,
  ).listen(port, host, callback({ secure: true }));
} else {
  app.listen(port, host, callback({ secure: false }));
}
