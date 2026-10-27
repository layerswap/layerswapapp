import type { Connection, GetAccountReturnType } from '@wagmi/core';

export function areWalletAddressesEqual(
  first: string | null | undefined,
  second: string | null | undefined,
): boolean {
  return Boolean(first && second && first.toLowerCase() === second.toLowerCase());
}

export function getReownAddress(
  account: Pick<GetAccountReturnType, 'address' | 'isConnected' | 'connector'>,
  connections: readonly Connection[],
): `0x${string}` | null {
  // Ownership is independent of branding: a Privy session may bridge an
  // external wallet and deliberately retain its external connector ID.
  if (account.isConnected && account.connector?.type !== 'privy-session') {
    return account.address ?? null;
  }
  return (
    connections.find(
      connection => connection.connector.type !== 'privy-session',
    )?.accounts[0] ?? null
  );
}
