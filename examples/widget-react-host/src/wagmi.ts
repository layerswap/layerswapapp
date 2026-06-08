import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  // Wagmi v2 enables EIP-6963 auto-discovery by default. With both a bare
  // `injected()` connector AND an auto-discovered MetaMask connector in the
  // config, wagmi's reconnect() restores *both* against the same wallet on
  // refresh — the widget then shows two "Connected wallets" entries for one
  // physical wallet. Opt out here for the single-connector case, or remove
  // `injected()` and rely on the discovered connectors instead.
  multiInjectedProviderDiscovery: false,
  transports: {
    [mainnet.id]: http(),
  },
});
