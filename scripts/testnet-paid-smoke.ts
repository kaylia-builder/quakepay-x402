import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  decodePaymentResponseHeader,
  wrapFetchWithPayment,
  x402Client
} from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const KITE_TESTNET = "eip155:2368";
const PIE_USD = "0x38129cf4CE5E183eFF248F42A7D345Bb1B47621A";
const PRICE_ATOMIC = "1000000000000000";
const DEFAULT_BASE_URL = "https://quakepay-x402.vercel.app";

type Settlement = {
  success?: boolean;
  transaction?: string;
  network?: string;
  payer?: string;
};

type Earthquake = { id?: string };
type EarthquakeList = { earthquakes?: Earthquake[] };

function requiredPrivateKey(): `0x${string}` {
  const value = process.env.TESTNET_PAYER_PRIVATE_KEY?.trim();
  if (!value || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(
      "TESTNET_PAYER_PRIVATE_KEY must be a 0x-prefixed private key for a dedicated Kite testnet wallet"
    );
  }
  return value as `0x${string}`;
}

function baseUrl(): string {
  const value = (process.env.QUAKEPAY_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("QUAKEPAY_BASE_URL must use HTTPS");
  }
  return url.toString().replace(/\/$/, "");
}

async function paidJson<T>(
  paidFetch: typeof fetch,
  url: string
): Promise<{ body: T; settlement: Settlement }> {
  const response = await paidFetch(url, { method: "GET" });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`paid request failed (${response.status}): ${raw.slice(0, 500)}`);
  }

  const paymentResponse = response.headers.get("payment-response");
  if (!paymentResponse) {
    throw new Error("paid response is missing PAYMENT-RESPONSE settlement evidence");
  }

  const settlement = decodePaymentResponseHeader(paymentResponse) as Settlement;
  if (settlement.success !== true || settlement.network !== KITE_TESTNET) {
    throw new Error(`unexpected settlement: ${JSON.stringify(settlement)}`);
  }

  return { body: JSON.parse(raw) as T, settlement };
}

async function main() {
  const account = privateKeyToAccount(requiredPrivateKey());
  const origin = baseUrl();
  const client = new x402Client()
    .register(KITE_TESTNET, new ExactEvmScheme(account))
    .setSpendControls({
      maxAmountPerPayment: "$0.001",
      allowedAssets: [
        {
          network: KITE_TESTNET,
          asset: PIE_USD,
          maxAmountPerPayment: PRICE_ATOMIC
        }
      ]
    });
  const paidFetch = wrapFetchWithPayment(fetch, client);

  const recentUrl = `${origin}/v1/earthquakes/recent?hours=24&minMagnitude=4.5&limit=3`;
  const nearbyUrl = `${origin}/v1/earthquakes/nearby?latitude=35.6762&longitude=139.6503&radiusKm=250&hours=168&minMagnitude=2.5&limit=3`;

  const recent = await paidJson<EarthquakeList>(paidFetch, recentUrl);
  const nearby = await paidJson<EarthquakeList>(paidFetch, nearbyUrl);
  const eventId = recent.body.earthquakes?.[0]?.id ?? nearby.body.earthquakes?.[0]?.id;
  if (!eventId) {
    throw new Error("list endpoints returned no event id for the risk request");
  }

  const riskUrl = `${origin}/v1/earthquakes/${encodeURIComponent(eventId)}/risk`;
  const risk = await paidJson<Record<string, unknown>>(paidFetch, riskUrl);
  const evidence = {
    verifiedAt: new Date().toISOString(),
    service: origin,
    network: KITE_TESTNET,
    asset: PIE_USD,
    payer: account.address,
    calls: [
      { endpoint: recentUrl, transaction: recent.settlement.transaction },
      { endpoint: nearbyUrl, transaction: nearby.settlement.transaction },
      { endpoint: riskUrl, transaction: risk.settlement.transaction }
    ]
  };

  const outputPath = resolve(process.env.EVIDENCE_OUT ?? "testnet-paid-evidence.json");
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ ...evidence, evidenceFile: outputPath }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
