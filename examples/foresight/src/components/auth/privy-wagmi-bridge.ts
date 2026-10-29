import {
  connect,
  createConnector,
  disconnect,
  switchAccount,
  type Config,
  type Connector,
} from '@wagmi/core';
import { getAddress, numberToHex, type EIP1193Provider } from 'viem';
import type { ConnectedWallet } from '@privy-io/react-auth';

export type PrivyBridgeWallet = Pick<
  ConnectedWallet,
  'address' | 'meta' | 'walletClientType' | 'getEthereumProvider'
>;

function createSessionConnector(
  wallet: PrivyBridgeWallet,
  provider: EIP1193Provider,
) {
  const id =
    wallet.walletClientType === 'privy'
      ? `${wallet.meta.id}.${wallet.address}`
      : wallet.meta.id;

  return createConnector((config) => {
    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        onDisconnect();
      } else {
        config.emitter.emit('change', {
          accounts: accounts.map((address) => getAddress(address)),
        });
      }
    };
    const onChainChanged = (chainId: string) =>
      config.emitter.emit('change', { chainId: Number(chainId) });
    const onDisconnect = () => {
      removeListeners();
      config.emitter.emit('disconnect');
    };
    const getAccounts = async () =>
      (await provider.request({ method: 'eth_accounts' })).map((address) =>
        getAddress(address),
      );
    const getChainId = async () =>
      Number(await provider.request({ method: 'eth_chainId' }));
    const removeListeners = () => {
      provider.removeListener('accountsChanged', onAccountsChanged);
      provider.removeListener('chainChanged', onChainChanged);
      provider.removeListener('disconnect', onDisconnect);
    };

    return {
      id,
      name: wallet.meta.name,
      type: 'privy-session',
      async connect({ chainId, withCapabilities } = {}) {
        // This wallet is already authenticated. Never request permissions or
        // revoke the host SDK's session when the wagmi connection is removed.
        const accounts = await getAccounts();
        if (
          !accounts.some(
            (address) => address.toLowerCase() === wallet.address.toLowerCase(),
          )
        ) {
          throw new Error(
            'Your signed-in wallet is no longer available. Please reconnect.',
          );
        }
        if (chainId && chainId !== (await getChainId())) {
          await this.switchChain({ chainId });
        }
        removeListeners();
        provider.on('accountsChanged', onAccountsChanged);
        provider.on('chainChanged', onChainChanged);
        provider.on('disconnect', onDisconnect);
        return {
          accounts: (withCapabilities
            ? accounts.map((address) => ({ address, capabilities: {} }))
            : accounts) as never,
          chainId: await getChainId(),
        };
      },
      async disconnect() {
        removeListeners();
      },
      getAccounts,
      getChainId,
      async getProvider() {
        return provider;
      },
      async isAuthorized() {
        return (await getAccounts()).length > 0;
      },
      async switchChain({ chainId }) {
        const chain = config.chains.find(
          (candidate) => candidate.id === chainId,
        );
        if (!chain) {
          throw new Error(`Chain ${chainId} is not configured.`);
        }
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: numberToHex(chainId) }],
        });
        config.emitter.emit('change', { chainId });
        return chain;
      },
      onAccountsChanged,
      onChainChanged,
      onDisconnect,
    };
  });
}

/** Share an already authenticated Privy provider without letting Privy's
 * wagmi integration replace Reown's connector list. Serialize handoffs so a
 * slow provider lookup cannot reconnect a session after logout/account change. */
export function createPrivyWagmiBridge(config: Config) {
  let generation = 0;
  let pending: Promise<void> = Promise.resolve();
  let ownedConnector: Connector | undefined;

  const disconnectOwned = async () => {
    if (ownedConnector && config.state.connections.has(ownedConnector.uid)) {
      await disconnect(config, { connector: ownedConnector });
    } else if (ownedConnector) {
      await ownedConnector.disconnect();
    }
    ownedConnector = undefined;
  };

  return {
    async sync(wallet: PrivyBridgeWallet | null): Promise<void> {
      const requestedGeneration = ++generation;
      // Resolve outside the mutation queue: logout can remove the old
      // connection immediately even when this lookup never settles.
      const provider = wallet ? await wallet.getEthereumProvider() : null;
      if (requestedGeneration !== generation) {
        return;
      }
      const apply = async () => {
        if (requestedGeneration !== generation) {
          return;
        }
        if (!wallet) {
          await disconnectOwned();
          return;
        }

        // Same identity scheme as @privy-io/wagmi, including the address suffix.
        const connectorId =
          wallet.walletClientType === 'privy'
            ? `${wallet.meta.id}.${wallet.address}`
            : wallet.meta.id;
        if (
          ownedConnector?.id === connectorId &&
          config.state.connections.has(ownedConnector.uid)
        ) {
          if (config.state.current !== ownedConnector.uid) {
            await switchAccount(config, { connector: ownedConnector });
          }
          return;
        }

        await disconnectOwned();
        if (requestedGeneration !== generation) {
          return;
        }

        // Privy and viem type event listeners differently, but expose the same
        // EIP-1193 request/on/removeListener contract at runtime.
        ownedConnector = config._internal.connectors.setup(
          createSessionConnector(
            wallet,
            provider as unknown as EIP1193Provider,
          ),
        );
        try {
          await connect(config, { connector: ownedConnector });
        } catch (error) {
          await disconnectOwned();
          throw error;
        }
        if (requestedGeneration !== generation) {
          await disconnectOwned();
        }
      };
      pending = pending.then(apply, apply);
      return pending;
    },
  };
}
