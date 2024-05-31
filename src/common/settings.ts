import fs from "node:fs";
import z from "zod";

const SENSITIVE_KEYS = [
  "TELEGRAM_BOT_TOKEN",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "SECRET_SALT",
  "FUNDING_WALLET_ID",
];
const FILE_SUFFIX = "_FILE";
function preProcessEnv() {
  const environment = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(process.env)) {
    if (
      !key.endsWith(FILE_SUFFIX) ||
      !SENSITIVE_KEYS.includes(
        key.substring(0, key.length - FILE_SUFFIX.length),
      ) ||
      !value
    ) {
      environment[key] = value;
      continue;
    }
    environment[key.substring(0, key.length - FILE_SUFFIX.length)] =
      fs.readFileSync(value, "utf8");
  }
  return environment;
}

const booleanString = z.preprocess(
  (val) => (val === "true" ? true : val === "false" ? false : val),
  z.boolean(),
);

const Settings = z.object({
  IS_TESTNET: booleanString,
  ARBITRUM_RPC_URL: z.string().optional(),
  EMBER_CORE_URL: z.string().url().default("http://ember-core"),
  PORT: z.coerce.number().int().default(3000),
  TELEGRAM_BOT_USERNAME: z.string(),
  TELEGRAM_BOT_TOKEN: z.string(),
  SECRET_SALT: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().int().default(5432),
  FUNDING_WALLET_ID: z.string().optional(),
  FRONTEND_URL: z.string(),

  // Feature flag for using's ember custom wallet implementation
  FF_EMBER_WALLET: booleanString.default(false),
});

export const ENVIRONMENT = Settings.parse(preProcessEnv());
