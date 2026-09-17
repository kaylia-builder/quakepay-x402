# Local pre-deployment verification

Verified on 2026-09-17 locally and against the public Vercel deployment.

## Production middleware smoke test

An unpaid request to the production build returned:

```text
HTTP/1.1 402 Payment Required
Content-Type: application/json; charset=utf-8
PAYMENT-REQUIRED: <base64 x402 v2 challenge>
Cache-Control: no-store
```

The decoded challenge contained:

```json
{
  "x402Version": 2,
  "scheme": "exact",
  "network": "eip155:2368",
  "amount": "1000000000000000",
  "asset": "0x38129cf4CE5E183eFF248F42A7D345Bb1B47621A",
  "payTo": "0x1617Ae836b163d055DFa0655D9100f35864953f0",
  "maxTimeoutSeconds": 60,
  "extra": { "name": "pieUSD", "version": "1" }
}
```

The receiver was confirmed against the maintainer's dashboard-connected public
EVM address. No private key is stored or required by the service.

## Real upstream smoke test

The compiled USGS client successfully parsed a live `FeatureCollection` from
the official catalog using a 24-hour, magnitude 4.5, limit 3 query.

## Automated checks

```text
TypeScript typecheck: passed
Tests: 10 passed
Manifest schema validation: passed
Production build: passed
npm audit: 0 vulnerabilities
```

## Public testnet deployment

- Base URL: https://quakepay-x402.vercel.app
- Health check: HTTP 200
- All three paid routes: HTTP 402 without payment
- Challenge version/network: x402 v2 / `eip155:2368`
- Challenge receiver: `0x1617Ae836b163d055DFa0655D9100f35864953f0`
- Challenge resource URL: HTTPS

Paid 2xx calls and settlement evidence remain pending.
