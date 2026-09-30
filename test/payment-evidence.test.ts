import { describe, expect, it } from "vitest";

import { classifyPaymentFailure } from "../src/payment-evidence.js";

describe("paid smoke-test evidence", () => {
  it("records a safe settlement failure code", () => {
    expect(classifyPaymentFailure(
      new Error("Facilitator settle failed: transaction_failed signature=0xsecret")
    )).toEqual({ stage: "settlement", reason: "transaction_failed" });
  });

  it("does not copy unknown error messages into evidence", () => {
    const failure = classifyPaymentFailure(
      new TypeError("authorization=secret-value and a complete signed payload")
    );
    expect(failure).toEqual({ stage: "signing", reason: "TypeError" });
    expect(JSON.stringify(failure)).not.toContain("secret-value");
  });

  it("classifies timeouts as transport failures", () => {
    expect(classifyPaymentFailure(new Error("request timeout"))).toEqual({
      stage: "transport",
      reason: "timeout"
    });
  });
});
