# Local pre-deployment verification

Verified on 2026-09-17 before configuring the maintainer's receiver address.

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
  "maxTimeoutSeconds": 60,
  "extra": { "name": "pieUSD", "version": "1" }
}
```

The receiver used for this local smoke test was a non-secret placeholder. It
must be replaced with the maintainer's public EVM receiver address before
deployment.

## Real upstream smoke test

The compiled USGS client successfully parsed a live `FeatureCollection` from
the official catalog using a 24-hour, magnitude 4.5, limit 3 query.

## Automated checks

```text
TypeScript typecheck: passed
Tests: 9 passed
Manifest schema validation: passed
Production build: passed
npm audit: 0 vulnerabilities
```

Paid 2xx calls and settlement evidence remain pending until a public receiver
address and HTTPS deployment are configured.
