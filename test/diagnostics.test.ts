import { describe, expect, it } from "vitest";

import {
  EXPECTED_KITE_PAYMENT,
  analyzeDiagnostics,
  sanitizeForReport
} from "../src/diagnostics.js";

const challenge = {
  x402Version: 2,
  accepts: [{
    scheme: "exact",
    network: EXPECTED_KITE_PAYMENT.network,
    asset: EXPECTED_KITE_PAYMENT.asset,
    amount: EXPECTED_KITE_PAYMENT.amount
  }]
};

describe("facilitator diagnostics", () => {
  it("passes read-only capability checks without claiming settlement success", () => {
    const result = analyzeDiagnostics({
      healthStatus: 200,
      challengeStatus: 402,
      paymentRequired: challenge,
      supportedStatus: 200,
      supported: {
        kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:2368" }]
      }
    });

    expect(result.outcome).toBe("pass");
    expect(result.checks.at(-1)).toMatchObject({
      name: "settlement_compatibility",
      status: "not_tested"
    });
  });

  it("fails when the facilitator does not advertise Kite support", () => {
    const result = analyzeDiagnostics({
      healthStatus: 200,
      challengeStatus: 402,
      paymentRequired: challenge,
      supportedStatus: 200,
      supported: { kinds: [{ scheme: "exact", network: "eip155:8453" }] }
    });

    expect(result.outcome).toBe("fail");
    expect(result.checks).toContainEqual(expect.objectContaining({
      name: "facilitator_capability",
      status: "fail"
    }));
  });

  it("redacts signing material recursively", () => {
    expect(sanitizeForReport({
      signature: "0xsecret",
      nested: { authorization: { from: "0x123" }, asset: EXPECTED_KITE_PAYMENT.asset }
    })).toEqual({
      signature: "[REDACTED]",
      nested: { authorization: "[REDACTED]", asset: EXPECTED_KITE_PAYMENT.asset }
    });
  });
});
