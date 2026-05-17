export const missionErrorMessages = {
  invalidWallet: "Please enter a valid wallet address.",
  invalidTxHash: "Please enter a valid transaction hash.",
  txNotFound: "Transaction was not found on Arc Testnet.",
  alreadyVerified: "This mission is already verified for this identity.",
  reusedTxHash: "This transaction hash was already used.",
  internal: "Verification failed. Please try again later.",
} as const;

const safeMessages = new Set<string>(Object.values(missionErrorMessages));

export function safeMissionMessage(message?: string) {
  if (!message) {
    return missionErrorMessages.internal;
  }

  if (safeMessages.has(message)) {
    return message;
  }

  if (message.includes("invalid wallet")) {
    return missionErrorMessages.invalidWallet;
  }

  if (message.includes("valid wallet address")) {
    return missionErrorMessages.invalidWallet;
  }

  if (message.includes("valid transaction hash")) {
    return missionErrorMessages.invalidTxHash;
  }

  if (message.includes("not found on Arc Testnet")) {
    return missionErrorMessages.txNotFound;
  }

  if (message.includes("already verified for this identity")) {
    return missionErrorMessages.alreadyVerified;
  }

  if (message.includes("already used")) {
    return missionErrorMessages.reusedTxHash;
  }

  return missionErrorMessages.internal;
}
