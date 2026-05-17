"use client";

import { useEffect, useState } from "react";
import {
  clearSelectedIdentity,
  identityLabel,
  isValidEmail,
  isValidWalletAddress,
  normalizeEmail,
  normalizeWalletAddress,
  readSelectedIdentity,
  type SelectedIdentity,
  writeSelectedIdentity,
} from "@/lib/identity";

type IdentityCardProps = {
  compact?: boolean;
  onIdentityChange?: (identity: SelectedIdentity | null) => void;
};

export function IdentityCard({ compact = false, onIdentityChange }: IdentityCardProps) {
  const [mounted, setMounted] = useState(false);
  const [identity, setIdentity] = useState<SelectedIdentity | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    function syncIdentity() {
      const saved = readSelectedIdentity();
      setIdentity(saved);
      setWalletAddress(saved?.walletAddress ?? "");
      setEmail(saved?.email ?? "");
      setMounted(true);
      onIdentityChange?.(saved);
    }

    const timer = window.setTimeout(syncIdentity, 0);

    function handleIdentityChange() {
      syncIdentity();
    }

    window.addEventListener("storage", handleIdentityChange);
    window.addEventListener("arc-academy-identity-updated", handleIdentityChange);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleIdentityChange);
      window.removeEventListener("arc-academy-identity-updated", handleIdentityChange);
    };
  }, [onIdentityChange]);

  function saveIdentity(nextIdentity: SelectedIdentity) {
    writeSelectedIdentity(nextIdentity);
    setMessage("");
  }

  function continueWithWallet() {
    if (!isValidWalletAddress(walletAddress)) {
      setMessage("Enter a valid EVM wallet address.");
      return;
    }

    saveIdentity({
      identityType: "wallet",
      walletAddress: normalizeWalletAddress(walletAddress),
    });
  }

  function continueWithEmail() {
    if (!isValidEmail(email)) {
      setMessage("Enter a valid email address.");
      return;
    }

    saveIdentity({
      identityType: "email",
      email: normalizeEmail(email),
    });
  }

  function resetIdentity() {
    clearSelectedIdentity();
    setMessage("");
    setWalletAddress("");
    setEmail("");
    onIdentityChange?.(null);
  }

  return (
    <section
      className={`rounded-lg border border-white/10 bg-white/[0.04] ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Identity
          </p>
          <p className="mt-2 break-all text-sm text-slate-300">
            {mounted && identity ? identityLabel(identity) : "Choose how to continue."}
          </p>
        </div>
        {mounted && identity ? (
          <button
            type="button"
            onClick={resetIdentity}
            className="min-h-9 rounded-md border border-white/10 px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/5"
          >
            Change
          </button>
        ) : null}
      </div>

      {!identity ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-300">
            Wallet address
            <input
              value={walletAddress}
              onChange={(event) => setWalletAddress(event.target.value)}
              placeholder="0x..."
              spellCheck={false}
              className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-black/35 px-3 font-mono text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/60"
            />
            <button
              type="button"
              onClick={continueWithWallet}
              className="mt-2 min-h-10 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              Continue with Wallet
            </button>
          </label>

          <label className="block text-sm font-medium text-slate-300">
            Email address
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              spellCheck={false}
              className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-black/35 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/60"
            />
            <button
              type="button"
              onClick={continueWithEmail}
              className="mt-2 min-h-10 rounded-md border border-cyan-200/30 px-4 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/10"
            >
              Continue with Email
            </button>
          </label>
        </div>
      ) : null}

      {mounted && message ? (
        <p className="mt-3 rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
          {message}
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-500">
        MVP note: wallet and email ownership are not verified yet. No private
        keys are requested and no transactions are sent.
      </p>
    </section>
  );
}
