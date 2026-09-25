import { createPublicClient, createWalletClient, formatEther, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem/utils";

const PYUSD = "0x8E04D099b1a8Dd20E6caD4b2Ab2B405B98242ec9";
const RPC_URL = "https://rpc-testnet.gokite.ai";

const kiteTestnet = defineChain({
  id: 2368,
  name: "Kite Testnet",
  nativeCurrency: { name: "KITE", symbol: "KITE", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "KiteScan", url: "https://testnet.kitescan.ai" } },
  testnet: true
});

const abi = [
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

function requiredPrivateKey(): `0x${string}` {
  const value = process.env.TESTNET_PAYER_PRIVATE_KEY?.trim();
  if (!value || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(
      "TESTNET_PAYER_PRIVATE_KEY must be a 0x-prefixed key for a dedicated Kite testnet wallet"
    );
  }
  return value as `0x${string}`;
}

async function main() {
  const account = privateKeyToAccount(requiredPrivateKey());
  const transport = http(RPC_URL);
  const publicClient = createPublicClient({ chain: kiteTestnet, transport });
  const walletClient = createWalletClient({ account, chain: kiteTestnet, transport });

  const nativeBalance = await publicClient.getBalance({ address: account.address });
  if (nativeBalance === 0n) {
    throw new Error(`${account.address} has no testnet KITE for claim gas`);
  }

  const before = await publicClient.readContract({
    address: PYUSD,
    abi,
    functionName: "balanceOf",
    args: [account.address]
  });
  const hash = await walletClient.writeContract({
    address: PYUSD,
    abi,
    functionName: "claim"
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`claim transaction reverted: ${hash}`);

  const after = await publicClient.readContract({
    address: PYUSD,
    abi,
    functionName: "balanceOf",
    args: [account.address]
  });
  console.log(JSON.stringify({
    network: "eip155:2368",
    account: account.address,
    asset: PYUSD,
    before: formatEther(before),
    after: formatEther(after),
    transaction: hash,
    explorer: `https://testnet.kitescan.ai/tx/${hash}`
  }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
