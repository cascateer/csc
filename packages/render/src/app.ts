import { envConfig } from "@cascateer/lib";
import { RedisStore } from "connect-redis";
import cors from "cors";
import express, { json } from "express";
import session from "express-session";
import { createClient } from "redis";

const { REDIS_URL } = envConfig();

const app = express();

const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.connect().catch(console.error);

const redisStore = new RedisStore({
  client: redisClient,
});

app.use(json());
app.use(
  cors({
    credentials: true,
    origin: true,
  }),
);
app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: "secret secret",
    store: redisStore,
  }),
);

app.get("/rubiks/baseMoves", (req, res, next) =>
  res.json({
    Z: [
      { key: "B", action: [{ slice: "B" }] },
      { key: "Bi", action: [{ slice: "B", degree: -1 }] },
      { key: "B2", action: [{ slice: "B", degree: 2 }] },
      {
        key: "Bw",
        action: [{ slice: "B" }, { slice: "S", degree: -1 }],
      },
      { key: "F", action: [{ slice: "F" }] },
      { key: "Fi", action: [{ slice: "F", degree: -1 }] },
      { key: "F2", action: [{ slice: "F", degree: 2 }] },
      { key: "Fw", action: [{ slice: "F" }, { slice: "S" }] },
      { key: "S", action: [{ slice: "S" }] },
      { key: "Si", action: [{ slice: "S", degree: -1 }] },
      { key: "S2", action: [{ slice: "S", degree: 2 }] },
      {
        key: "z",
        action: [{ slice: "B", degree: -1 }, { slice: "S" }, { slice: "F" }],
      },
    ],
    Y: [
      { key: "U", action: [{ slice: "U" }] },
      { key: "Ui", action: [{ slice: "U", degree: -1 }] },
      { key: "U2", action: [{ slice: "U", degree: 2 }] },
      { key: "D", action: [{ slice: "D" }] },
      { key: "Di", action: [{ slice: "D", degree: -1 }] },
      { key: "D2", action: [{ slice: "D", degree: 2 }] },
      { key: "E", action: [{ slice: "E" }] },
      { key: "Ei", action: [{ slice: "E", degree: -1 }] },
      { key: "E2", action: [{ slice: "E", degree: 2 }] },
      {
        key: "Uw",
        action: [{ slice: "U" }, { slice: "E", degree: -1 }],
      },
      { key: "Dw", action: [{ slice: "D" }, { slice: "E" }] },
      {
        key: "y",
        action: [
          { slice: "D", degree: -1 },
          { slice: "E", degree: -1 },
          { slice: "U" },
        ],
      },
    ],
    X: [
      { key: "L", action: [{ slice: "L" }] },
      { key: "Li", action: [{ slice: "L", degree: -1 }] },
      { key: "L2", action: [{ slice: "L", degree: 2 }] },
      { key: "R", action: [{ slice: "R" }] },
      { key: "Ri", action: [{ slice: "R", degree: -1 }] },
      { key: "R2", action: [{ slice: "R", degree: 2 }] },
      {
        key: "x",
        action: [
          { slice: "L", degree: -1 },
          { slice: "M", degree: -1 },
          { slice: "R" },
        ],
      },
      { key: "Lw", action: [{ slice: "L" }, { slice: "M" }] },
      {
        key: "Rw",
        action: [{ slice: "R" }, { slice: "M", degree: -1 }],
      },
      { key: "M", action: [{ slice: "M" }] },
      { key: "Mi", action: [{ slice: "M", degree: -1 }] },
      { key: "M2", action: [{ slice: "M", degree: 2 }] },
    ],
  }),
);

app.get("/rubiks/customMoves", (req, res, next) =>
  res.json([
    {
      key: "Sexy Move",
      action: [
        { slice: "U" },
        { slice: "R" },
        { slice: "U", degree: -1 },
        { slice: "R", degree: -1 },
      ],
    },
  ]),
);

export default app;
