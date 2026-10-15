'use client';
import { createContext, useContext } from 'react';
import type { Config } from 'wagmi';

export type WalletSession = {
  address: `0x${string}` | null;
  email: string | null;
  authenticated: boolean;
  method: 'wallet' | 'privy' | null;
  ready: boolean;
  reownConfigured: boolean;
  privyConfigured: boolean;
  wagmiConfig?: Config;
  connectWallet: () => Promise<void>;
  login: () => Promise<void>;
  disconnect: () => Promise<void>;
};
export const WalletContext = createContext<WalletSession | null>(null);
export function useWalletSession() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('WalletProvider is missing');
  return context;
}
