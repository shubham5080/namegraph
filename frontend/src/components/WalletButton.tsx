"use client";

import { usePrivy } from "@privy-io/react-auth";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function PrivyWalletButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const address = user?.wallet?.address;

  if (!ready) {
    return (
      <button type="button" className="connect-btn" disabled>
        Loading…
      </button>
    );
  }

  if (authenticated && address) {
    return (
      <button type="button" className="connect-btn" onClick={logout}>
        {shortAddress(address)} · Disconnect
      </button>
    );
  }

  return (
    <button type="button" className="connect-btn" onClick={login}>
      Connect wallet
    </button>
  );
}

/** Call only when `NEXT_PUBLIC_PRIVY_APP_ID` is set (inside PrivyProvider). */
export function useConnectedWalletAddress(): string | null {
  const { authenticated, user } = usePrivy();
  if (!authenticated) return null;
  return user?.wallet?.address ?? null;
}

export function hasPrivyConfig(): boolean {
  return Boolean(PRIVY_APP_ID);
}

export default function WalletButton() {
  if (!PRIVY_APP_ID) {
    return (
      <button
        type="button"
        className="connect-btn"
        disabled
        title="Set NEXT_PUBLIC_PRIVY_APP_ID in frontend/.env.local"
      >
        Connect wallet
      </button>
    );
  }
  return <PrivyWalletButton />;
}
