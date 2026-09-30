export type PaymentFailureStage =
  | "signing"
  | "verification"
  | "settlement"
  | "transport"
  | "payment_request";

export interface SafePaymentFailure {
  stage: PaymentFailureStage;
  reason: string;
}

const SAFE_REASONS = [
  "transaction_failed",
  "settlement_failed",
  "payment_verification_failed",
  "invalid_payment",
  "insufficient_funds",
  "unsupported_network",
  "unsupported_asset",
  "payment_required",
  "timeout"
] as const;

/**
 * Convert an arbitrary SDK/facilitator error into bounded evidence. The result
 * deliberately excludes the original message because it may contain a signed
 * payload, authorization, bearer token, or upstream response body.
 */
export function classifyPaymentFailure(error: unknown): SafePaymentFailure {
  const text = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const stage: PaymentFailureStage =
    /settle|transaction_failed|payment-response/.test(text) ? "settlement" :
      /verif/.test(text) ? "verification" :
        /sign|authorization/.test(text) ? "signing" :
          /fetch|network|timeout|abort/.test(text) ? "transport" :
            "payment_request";
  const reason = SAFE_REASONS.find(candidate => text.includes(candidate))
    ?? (error instanceof Error && error.name ? error.name : "unknown_error");

  return { stage, reason };
}
