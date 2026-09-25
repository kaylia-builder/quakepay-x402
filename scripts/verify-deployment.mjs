const expected = {
  network: "eip155:2368",
  asset: "0x8E04D099b1a8Dd20E6caD4b2Ab2B405B98242ec9".toLowerCase(),
  amount: "1000000000000000",
  payTo: "0x1617Ae836b163d055DFa0655D9100f35864953f0".toLowerCase()
};

const rawBaseUrl = (process.env.BASE_URL ?? "").trim().replace(/\/$/, "");
if (!rawBaseUrl) throw new Error("BASE_URL is required, for example https://quakepay-x402.onrender.com");
const baseUrl = new URL(rawBaseUrl);
if (baseUrl.protocol !== "https:" || baseUrl.pathname !== "/") {
  throw new Error("BASE_URL must be an HTTPS origin without a path");
}

const results = [];

const health = await fetch(new URL("/healthz", baseUrl), {
  signal: AbortSignal.timeout(90_000)
});
if (!health.ok) throw new Error(`/healthz returned ${health.status}`);
const healthBody = await health.json();
if (healthBody.network !== expected.network || healthBody.price !== "$0.001") {
  throw new Error(`/healthz has unexpected configuration: ${JSON.stringify(healthBody)}`);
}
results.push({ path: "/healthz", status: health.status, network: healthBody.network });

const paths = [
  "/v1/earthquakes/recent?hours=24&minMagnitude=4.5&limit=3",
  "/v1/earthquakes/nearby?latitude=35.6762&longitude=139.6503&radiusKm=250&hours=168",
  "/v1/earthquakes/us7000example/risk"
];

for (const path of paths) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: "error",
    signal: AbortSignal.timeout(30_000)
  });
  if (response.status !== 402) throw new Error(`${path} returned ${response.status}, expected 402`);
  const encoded = response.headers.get("payment-required");
  if (!encoded) throw new Error(`${path} did not return PAYMENT-REQUIRED`);
  const challenge = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  const accepted = challenge.accepts?.[0];
  if (
    challenge.x402Version !== 2 ||
    accepted?.network !== expected.network ||
    accepted?.asset?.toLowerCase() !== expected.asset ||
    accepted?.amount !== expected.amount ||
    accepted?.payTo?.toLowerCase() !== expected.payTo
  ) {
    throw new Error(`${path} returned an unexpected payment challenge`);
  }
  results.push({
    path,
    status: response.status,
    x402Version: challenge.x402Version,
    network: accepted.network,
    amount: accepted.amount,
    payTo: accepted.payTo
  });
}

console.log(JSON.stringify({ verifiedAt: new Date().toISOString(), baseUrl: rawBaseUrl, results }, null, 2));
