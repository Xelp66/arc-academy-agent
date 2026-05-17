import { inferIdentityType } from "@/lib/identity";

export const ARCHIE_LOG_KEY = "arc-academy-archie-log";
export const ARCHIE_LOG_UPDATED_EVENT = "arc-academy-archie-log-updated";

export type ArchieActionType =
  | "level_started"
  | "questions_selected"
  | "checked_answer"
  | "answer_checked"
  | "level_passed"
  | "level_failed"
  | "badge_awarded"
  | "next_level_unlocked"
  | "mission_recommended"
  | "mission_verified"
  | "reward_eligibility_prepared";

export type ArchieLogEntry = {
  id: string;
  type: ArchieActionType;
  label: string;
  detail?: string;
  createdAt: string;
};

const maxEntries = 8;

export function maskWalletAddress(walletAddress?: string) {
  if (!walletAddress) {
    return "Wallet identity";
  }

  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

export function maskEmail(email?: string) {
  if (!email) {
    return "Email identity";
  }

  const [local, domain] = email.split("@");

  if (!domain) {
    return "Email identity";
  }

  const localPrefix = local.slice(0, 2);
  return `${localPrefix}...@${domain}`;
}

export function maskIdentity(identity?: { walletAddress?: string; email?: string } | null) {
  if (!identity) {
    return "Guest session";
  }

  return inferIdentityType(identity) === "wallet"
    ? maskWalletAddress(identity.walletAddress)
    : maskEmail(identity.email);
}

function readEntries(): ArchieLogEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(ARCHIE_LOG_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ArchieLogEntry[];

    return Array.isArray(parsed) ? parsed.slice(0, maxEntries) : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: ArchieLogEntry[]) {
  window.localStorage.setItem(ARCHIE_LOG_KEY, JSON.stringify(entries.slice(0, maxEntries)));
  window.dispatchEvent(new Event(ARCHIE_LOG_UPDATED_EVENT));
}

export function getArchieLogEntries() {
  return readEntries();
}

export function appendArchieLogEntry(
  type: ArchieActionType,
  label: string,
  detail?: string,
) {
  if (typeof window === "undefined") {
    return;
  }

  const entry: ArchieLogEntry = {
    id: crypto.randomUUID(),
    type,
    label,
    detail,
    createdAt: new Date().toISOString(),
  };

  writeEntries([entry, ...readEntries()]);
}
