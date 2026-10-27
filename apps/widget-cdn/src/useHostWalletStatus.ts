import { useCallback, useSyncExternalStore } from 'react';
import type { Config } from 'wagmi';
import { getAccount, getConnections, watchAccount, watchConnections } from 'wagmi/actions';
import { resolveHostWalletStatus, type HostWalletStatus } from './hostWallet';

const getServerSnapshot = (): HostWalletStatus => 'loading';

/** Read the supplied host config directly, before wallet-provider hydration.
 * Returning a primitive keeps the external-store snapshot stable. */
export function useHostWalletStatus(
  config: Config | undefined,
): HostWalletStatus {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!config) return () => {};
      const stopAccount = watchAccount(config, { onChange });
      const stopConnections = watchConnections(config, { onChange });
      return () => { stopAccount(); stopConnections(); };
    },
    [config],
  );
  const getSnapshot = useCallback((): HostWalletStatus => {
    // Connecting a funding wallet changes wagmi's active account. The embedded
    // login still owns this session until its connection is actually removed.
    return config ? resolveHostWalletStatus(getAccount(config), getConnections(config)) : 'other';
  }, [config]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
