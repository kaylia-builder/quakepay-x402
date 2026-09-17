# Submission evidence

Complete this file after the public testnet deployment. Do not include private
keys, seed phrases, login codes, bearer tokens, or complete payment signatures.

## Identity and revision

- Repository: https://github.com/kaylia-builder/quakepay-x402
- Commit SHA: `PENDING`
- Maintainer: `kaylia-builder`
- Contribution direction: `x402-service`

## Deployment

- Public HTTPS base URL: `PENDING`
- Network: `eip155:2368` (Kite testnet)
- Receiver address: `PENDING_PUBLIC_ADDRESS`
- Price: `$0.001` per request
- Health check: `PENDING/healthz`

## Automated verification

- CI run: `PENDING`
- `npm run check` output: `PENDING`
- Manifest validation: `PENDING`

## Unpaid request evidence

Record the timestamp, request URL, HTTP 402 status, and decoded
`PAYMENT-REQUIRED` challenge. Redact the payment signature if one is present.

```text
PENDING
```

## Paid 2xx examples

Record one successful paid request for every endpoint. Include the response,
timestamp, and transaction hash or Kite Passport activity identifier.

### Recent earthquakes

```text
PENDING
```

### Nearby earthquakes

```text
PENDING
```

### Event risk

```text
PENDING
```

## Failure and no-settlement evidence

Attach the automated test result showing that an upstream error returns 502 and
does not invoke settlement. If a controlled deployed failure test is performed,
record it here without exposing credentials.

```text
PENDING
```

## Changelog

- Initial TypeScript/Express x402 service.
- USGS recent and nearby earthquake queries.
- Deterministic event risk screen.
- Input bounds, upstream timeout, normalized responses, tests, CI, container,
  schema-validated manifest, and submission checklist.
