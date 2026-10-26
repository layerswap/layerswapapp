import { useCallback, useSyncExternalStore } from 'react';
import type { Config } from 'wagmi';
import { getAccount, watchAccount } from 'wagmi/actions';
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
      return watchAccount(config, { onChange });
    },
    [config],
  );
  const getSnapshot = useCallback((): HostWalletStatus => {
    return config ? resolveHostWalletStatus(getAccount(config)) : 'other';
  }, [config]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
