# QuakePay x402

[![CI](https://github.com/kaylia-builder/quakepay-x402/actions/workflows/ci.yml/badge.svg)](https://github.com/kaylia-builder/quakepay-x402/actions/workflows/ci.yml)

QuakePay turns the live [USGS Earthquake Catalog](https://earthquake.usgs.gov/fdsnws/event/1/)
into concise, agent-ready earthquake intelligence paid per request with x402 on
the Kite chain. It is based on Kite's official TypeScript/Express wrapper and
keeps the required lifecycle: **verify payment → call USGS → settle only after a
successful response**.

The service adds value beyond a raw proxy by validating query bounds,
normalizing GeoJSON into a stable response shape, and calculating a transparent,
deterministic risk screen from magnitude, depth, tsunami, and PAGER indicators.

> Risk scores are informational screening only. Always follow official
> emergency-management guidance.

## Endpoints

`GET /healthz` is free. Every route under `/v1/` costs the configured
`PRICE_USD` (default `$0.001`).

| Route | Purpose |
|---|---|
| `GET /v1/earthquakes/recent` | Recent events filtered by hours and magnitude |
| `GET /v1/earthquakes/nearby` | Events around a coordinate and radius |
| `GET /v1/earthquakes/:eventId/risk` | One normalized event plus deterministic risk screening |

Example unpaid request:

```bash
curl -i "http://localhost:8080/v1/earthquakes/recent?hours=24&minMagnitude=4.5&limit=20"
```

It must return `HTTP/1.1 402 Payment Required` and a `PAYMENT-REQUIRED` header.

Example paid requests after deployment:

```bash
kpass agent session execute --method GET \
  --url "$BASE_URL/v1/earthquakes/recent?hours=24&minMagnitude=4.5&limit=20"

kpass agent session execute --method GET \
  --url "$BASE_URL/v1/earthquakes/nearby?latitude=35.6762&longitude=139.6503&radiusKm=250&hours=168"

# Use an id returned by either list endpoint.
kpass agent session execute --method GET \
  --url "$BASE_URL/v1/earthquakes/us7000example/risk"
```

## Local development

Requirements: Node.js 22+ and an EVM receiver address. The server never needs a
private key.

```bash
npm ci
cp .env.example .env
# Edit PAY_TO in .env with the public receiver address.
npm run dev
```

Never commit `.env`, private keys, seed phrases, login codes, payment signatures,
or upstream credentials.

Verification:

```bash
npm run check
npm run build
```

The automated suite verifies unpaid 402 behavior, successful
`verify → upstream → settle` ordering, no settlement after upstream failure,
input validation, normalization, risk scoring, Kite asset amounts, and manifest
schema compatibility.

## Configuration

| Variable | Required | Default | Description |
|---|---:|---|---|
| `PAY_TO` | yes | — | Public EVM address receiving payments |
| `KITE_NETWORK` | no | `testnet` | `testnet` or `mainnet` |
| `PRICE_USD` | no | `0.001` | Positive USD decimal, up to 6 decimal places |
| `PORT` | no | `8080` | HTTP listen port |
| `FACILITATOR_URL` | no | `https://facilitator.pieverse.io/v2` | Keep the `/v2` suffix |
| `UPSTREAM_URL` | no | USGS event API | Fixed HTTPS upstream origin |
| `UPSTREAM_TIMEOUT_MS` | no | `8000` | Abort slow upstream calls |

## Deploy

Build the included container and configure environment variables on any host
that provides a public HTTPS origin:

```bash
docker build -t quakepay-x402 .
docker run --rm -p 8080:8080 --env-file .env quakepay-x402
```

The simplest deployment path is **Vercel Hobby**. Import this GitHub repository
as a new Vercel project and click Deploy. [`vercel.json`](vercel.json) contains
the non-secret testnet service configuration, and `src/server.ts` exports the
Express app as one serverless function. No payment card, private key, or custom
build settings are required.

The repository also retains a [`render.yaml`](render.yaml) Blueprint as an
alternative for an always-running container host. Some Render accounts require
credit-card verification even for free services.

After deployment, verify the live health endpoint and all unpaid challenges:

```bash
BASE_URL=https://your-service.onrender.com npm run verify:deployment
```

Start on Kite testnet (`eip155:2368`, pieUSD). After deployment:

1. Confirm `pay_to` in `service.yaml` matches the dashboard-connected service wallet.
2. Add the HTTPS `base_url` and set `status: testnet`.
3. Confirm every example returns 2xx after payment.
4. Save the 402 response, paid response, transaction hash, CI link, and schema
   validation output in [`docs/SUBMISSION_EVIDENCE.md`](docs/SUBMISSION_EVIDENCE.md).
5. Move to mainnet only after testnet evidence is complete.

## Data source and attribution

Earthquake data is retrieved from the USGS Earthquake Catalog. Review the
[USGS copyrights and credits policy](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits)
and retain source attribution in derived responses. QuakePay is not affiliated
with or endorsed by USGS.

## License and upstream attribution

Apache-2.0. The Kite chain configuration and x402 server setup are derived from
the Apache-2.0-licensed
[`gokite-ai/kite-x402-services`](https://github.com/gokite-ai/kite-x402-services)
TypeScript/Express template. See [`NOTICE`](NOTICE) for details. QuakePay's USGS
query, normalization, risk-screening, validation, testing, deployment, and
evidence code are original additions in this repository.
