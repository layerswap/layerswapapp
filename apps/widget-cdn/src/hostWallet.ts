/** SDK connector IDs, rather than branding: both Privy and Dynamic can also
 * connect external wallets, which must retain the normal funding options. */
export function isEmbeddedHostConnector(
  connector: { id: string } | undefined,
): boolean {
  const id = connector?.id.toLowerCase();
  if (!id) return false;

  return (
    id === 'io.privy.wallet' ||
    /^io\.privy\.wallet\.0x[0-9a-f]{40}$/.test(id) ||
    id === 'io.privy.smart_wallet' ||
    /^dynamic-(turnkey|turnkeyhd|dynamicwaas)-\d+$/.test(id)
  );
}

export type HostWalletStatus = 'loading' | 'embedded' | 'other';

export function resolveHostWalletStatus(account: {
  status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
  connector?: { id: string };
}, connections: readonly { connector: { id: string } }[] = []): HostWalletStatus {
  if (account.status === 'connecting' || account.status === 'reconnecting') {
    return 'loading';
  }
  return account.status === 'connected' &&
    (isEmbeddedHostConnector(account.connector) ||
      connections.some(connection => isEmbeddedHostConnector(connection.connector)))
    ? 'embedded'
    : 'other';
}

/** An embedded EVM login excludes the entire EVM funding ecosystem. */
export const isEvmFundingAllowed = (
  connections: readonly { connector: { id: string } }[],
): boolean => !connections.some(connection => isEmbeddedHostConnector(connection.connector));
