import { createPublicClient, http, type Hash } from "viem";

export const ARC_TESTNET = {
  chainId: 5042002,
  name: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
} as const;

const arcTestnetChain = {
  id: ARC_TESTNET.chainId,
  name: ARC_TESTNET.name,
  nativeCurrency: ARC_TESTNET.nativeCurrency,
  rpcUrls: {
    default: {
      http: [ARC_TESTNET.rpcUrl],
    },
  },
} as const;

const arcPublicClient = createPublicClient({
  chain: arcTestnetChain,
  transport: http(ARC_TESTNET.rpcUrl),
});

const txHashPattern = /^0x[a-fA-F0-9]{64}$/;

export type ArcTxVerificationResult = {
  valid: boolean;
  txHash: string;
  blockNumber?: bigint;
  from?: string;
  to?: string | null;
  error?: string;
};

export async function verifyArcTestnetTx(
  txHash: `0x${string}`,
): Promise<ArcTxVerificationResult> {
  const normalizedTxHash = txHash.trim() as `0x${string}`;

  if (!txHashPattern.test(normalizedTxHash)) {
    return {
      valid: false,
      txHash: normalizedTxHash,
      error: "Please enter a valid transaction hash.",
    };
  }

  try {
    const transaction = await arcPublicClient.getTransaction({
      hash: normalizedTxHash as Hash,
    });

    return {
      valid: true,
      txHash: transaction.hash,
      blockNumber: transaction.blockNumber ?? undefined,
      from: transaction.from,
      to: transaction.to,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const notFound =
      message.toLowerCase().includes("not found") ||
      message.toLowerCase().includes("could not find");

    return {
      valid: false,
      txHash: normalizedTxHash,
      error: notFound
        ? "Transaction was not found on Arc Testnet."
        : "Verification failed. Please try again later.",
    };
  }
}
