import { FACILITATOR_URL, kiteChainByName, type KiteChain } from "./kite.js";

export interface AppConfig {
  payTo: string;
  chain: KiteChain;
  price: string;
  facilitatorUrl: string;
  upstreamUrl: URL;
  upstreamTimeoutMs: number;
  serviceDescription: string;
}

const env = (key: string, fallback = ""): string =>
  (process.env[key] ?? "").trim() || fallback;

function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function loadConfig(): AppConfig {
  const payTo = env("PAY_TO");
  if (!/^0x[0-9a-fA-F]{40}$/.test(payTo)) {
    throw new Error("PAY_TO is required and must be a 20-byte EVM address");
  }

  const upstreamUrl = new URL(
    env("UPSTREAM_URL", "https://earthquake.usgs.gov/fdsnws/event/1/")
  );
  if (upstreamUrl.protocol !== "https:") {
    throw new Error("UPSTREAM_URL must use https");
  }

  const priceRaw = env("PRICE_USD", "0.001");
  if (!/^\d+(\.\d{1,6})?$/.test(priceRaw) || Number(priceRaw) <= 0) {
    throw new Error("PRICE_USD must be a positive decimal with at most 6 fractional digits");
  }

  return {
    payTo,
    chain: kiteChainByName(env("KITE_NETWORK", "testnet")),
    price: `$${priceRaw}`,
    facilitatorUrl: env("FACILITATOR_URL", FACILITATOR_URL),
    upstreamUrl,
    upstreamTimeoutMs: positiveInteger(env("UPSTREAM_TIMEOUT_MS", "8000"), "UPSTREAM_TIMEOUT_MS"),
    serviceDescription: env(
      "SERVICE_DESCRIPTION",
      "Agent-ready earthquake intelligence from the USGS catalog"
    )
  };
}
