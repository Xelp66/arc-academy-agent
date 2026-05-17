export const LOCAL_IDENTITY_KEY = "arc-academy-identity";

export type IdentityType = "wallet" | "email";

export type SelectedIdentity = {
  identityType: IdentityType;
  walletAddress?: string;
  email?: string;
};

export type IdentityFields = {
  walletAddress?: string | null;
  email?: string | null;
};

const walletPattern = /^0x[a-fA-F0-9]{40}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeWalletAddress(walletAddress: string) {
  return walletAddress.trim().toLowerCase();
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidWalletAddress(walletAddress: string) {
  return walletPattern.test(walletAddress.trim());
}

export function isValidEmail(email: string) {
  return emailPattern.test(email.trim());
}

export function inferIdentityType(
  identity?: IdentityFields | SelectedIdentity | null,
): IdentityType | "guest" {
  if (identity?.email) {
    return "email";
  }

  if (identity?.walletAddress) {
    return "wallet";
  }

  return "guest";
}

export function identityLabel(identity?: IdentityFields | SelectedIdentity | null) {
  if (!identity) {
    return "Guest learning profile";
  }

  const inferredType = inferIdentityType(identity);

  if (inferredType === "wallet") {
    return identity.walletAddress ?? "Wallet profile";
  }

  if (inferredType === "email") {
    return identity.email ?? "Email profile";
  }

  return "Guest learning profile";
}

export function readSelectedIdentity(): SelectedIdentity | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LOCAL_IDENTITY_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SelectedIdentity>;
    const inferredType = inferIdentityType(parsed);

    if (inferredType === "wallet" && parsed.walletAddress && isValidWalletAddress(parsed.walletAddress)) {
      return {
        identityType: "wallet",
        walletAddress: normalizeWalletAddress(parsed.walletAddress),
      };
    }

    if (inferredType === "email" && parsed.email && isValidEmail(parsed.email)) {
      return {
        identityType: "email",
        email: normalizeEmail(parsed.email),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function writeSelectedIdentity(identity: SelectedIdentity) {
  window.localStorage.setItem(LOCAL_IDENTITY_KEY, JSON.stringify(identity));
  window.dispatchEvent(new Event("arc-academy-identity-updated"));
  window.dispatchEvent(new Event("arc-academy-progress-updated"));
}

export function clearSelectedIdentity() {
  window.localStorage.removeItem(LOCAL_IDENTITY_KEY);
  window.dispatchEvent(new Event("arc-academy-identity-updated"));
  window.dispatchEvent(new Event("arc-academy-progress-updated"));
}
