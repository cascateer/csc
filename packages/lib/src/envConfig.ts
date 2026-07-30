import { configDotenv } from "dotenv";

export const envConfig = () =>
  configDotenv({
    path: [".env.local", ".env"],
  }).parsed ?? {};
