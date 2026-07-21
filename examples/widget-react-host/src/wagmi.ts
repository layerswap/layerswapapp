import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';

export const wagmiConfig = createConfig({
  chains: [mainnet],
  // Rely on wagmi's default EIP-6963 multi-injected provider discovery. The
  // widget identifies specific extension wallets (MetaMask, Rabby, …) by the
  // rdns of their discovered connector; without discovery the widget can only
  // show them as registry cards and reports "not detected" on click.
  //
  // We deliberately do NOT also add a bare `injected()` connector: pairing it
  // with the discovered MetaMask connector made wagmi's reconnect() restore
  // *both* against the same wallet, surfacing two "Connected wallets" entries
  // for one physical wallet. Discovery alone gives one connector per wallet.
  transports: {
    [mainnet.id]: http(),
  },
});
