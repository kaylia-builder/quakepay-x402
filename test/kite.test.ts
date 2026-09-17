import { describe, expect, it } from "vitest";
import { KITE_MAINNET, KITE_TESTNET, kiteChainByName, kiteMoneyParser } from "../src/kite.js";

describe("Kite network configuration", () => {
  it("maps supported network names", () => {
    expect(kiteChainByName("mainnet")).toBe(KITE_MAINNET);
    expect(kiteChainByName("testnet")).toBe(KITE_TESTNET);
    expect(() => kiteChainByName("base")).toThrow(/unknown KITE_NETWORK/);
  });

  it("converts decimal prices without floating-point rounding", async () => {
    const mainnet = await kiteMoneyParser(KITE_MAINNET)("0.001", KITE_MAINNET.network);
    const testnet = await kiteMoneyParser(KITE_TESTNET)("0.001", KITE_TESTNET.network);
    expect(mainnet).toMatchObject({ amount: "1000", asset: KITE_MAINNET.assetAddress });
    expect(testnet).toMatchObject({ amount: "1000000000000000", asset: KITE_TESTNET.assetAddress });
  });

  it("rejects the wrong network and over-precise mainnet prices", async () => {
    await expect(kiteMoneyParser(KITE_MAINNET)("0.001", KITE_TESTNET.network)).resolves.toBeNull();
    await expect(kiteMoneyParser(KITE_MAINNET)("0.0000001", KITE_MAINNET.network)).rejects.toThrow(/more than 6 decimals/);
  });
});
