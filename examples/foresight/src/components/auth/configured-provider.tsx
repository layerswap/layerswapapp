'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createAppKit } from '@reown/appkit/react';
import {
  base,
  mainnet,
  polygon,
  arbitrum,
  optimism,
} from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import {
  createConfig,
  http,
  WagmiProvider,
  useAccount,
  useConnections,
} from 'wagmi';
import { disconnect as disconnectWagmi } from '@wagmi/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { WalletContext } from './context';
import { getAppOrigin } from '@/lib/app-origin';
import { createPrivyWagmiBridge, isPrivyConnector } from './privy-wagmi-bridge';

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;
const privyId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const networks = [base, polygon, mainnet, arbitrum, optimism] as [
  typeof base,
  ...Array<typeof polygon | typeof mainnet | typeof arbitrum | typeof optimism>,
];
const adapter = projectId
  ? new WagmiAdapter({ projectId, networks, ssr: true })
  : null;
// One instance for the lifetime of the page, including changes between Reown
// and Privy. The widget's EVM adapter adopts this config once.
const wagmiConfig =
  adapter?.wagmiConfig ??
  createConfig({
    chains: networks,
    transports: {
      [base.id]: http(),
      [polygon.id]: http(),
      [mainnet.id]: http(),
      [arbitrum.id]: http(),
      [optimism.id]: http(),
    },
    connectors: [],
    ssr: true,
  });
const privyWalletBridge = createPrivyWagmiBridge(wagmiConfig);
const appUrl = getAppOrigin();
const modal =
  adapter && projectId
    ? createAppKit({
        adapters: [adapter],
        projectId,
        networks,
        defaultNetwork: base,
        // Layerswap selects the chain when funding.
        allowUnsupportedChain: true,
        metadata: {
          name: 'Foresight',
          description: 'Foresight prediction market demo',
          url: appUrl,
          icons: [new URL('/icon.svg', appUrl).href],
        },
        themeMode: 'light',
        themeVariables: {
          '--w3m-accent': '#7655e8',
          '--w3m-border-radius-master': '2px',
        },
        features: {
          analytics: false,
          email: false,
          socials: false,
          swaps: false,
          onramp: false,
        },
      })
    : null;
type Address = `0x${string}` | null;
type PrivyState = {
  address: Address;
  email: string | null;
  authenticated: boolean;
  ready: boolean;
  error: string | null;
};
type Actions = {
  login?: () => void;
  logout?: () => Promise<void>;
  disconnect?: () => Promise<void>;
};
function ReownBridge({
  onAddress,
  actions,
}: {
  onAddress: (a: Address) => void;
  actions: React.RefObject<Actions>;
}) {
  const { address, isConnected, connector } = useAccount();
  const connections = useConnections();
  // A bridged Privy account also appears in wagmi; never report it as a Reown
  // login. Retain a separately connected external account when Privy is active.
  const externalAddress =
    isConnected && !isPrivyConnector(connector)
      ? address
      : connections.find(
          (connection) => !isPrivyConnector(connection.connector),
        )?.accounts[0];
  useEffect(
    () => onAddress(externalAddress ?? null),
    [externalAddress, onAddress],
  );
  useEffect(() => {
    actions.current.disconnect = async () => {
      await privyWalletBridge.sync(null);
      for (const connection of [...wagmiConfig.state.connections.values()]) {
        await disconnectWagmi(wagmiConfig, { connector: connection.connector });
      }
    };
  }, [actions]);
  return null;
}
function PrivyBridge({
  onState,
  actions,
  active,
}: {
  onState: (s: PrivyState) => void;
  actions: React.RefObject<Actions>;
  active: boolean;
}) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const sessionWallet =
    wallets.find((wallet) => wallet.walletClientType === 'privy') ?? wallets[0];
  const address = (sessionWallet?.address ||
    user?.wallet?.address ||
    null) as Address;
  const email = user?.email?.address || null;
  const [bridgedAddress, setBridgedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setBridgedAddress(null);
    setError(null);
    const wallet =
      active && authenticated && walletsReady ? sessionWallet : null;
    void privyWalletBridge
      .sync(wallet ?? null)
      .then(() => {
        if (!cancelled) {
          setBridgedAddress(wallet?.address ?? null);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Your wallet connection could not be prepared. Please reconnect.',
          );
        }
      });
    return () => {
      cancelled = true;
      void privyWalletBridge.sync(null).catch(() => {});
    };
  }, [active, authenticated, walletsReady, sessionWallet]);
  const connectionReady =
    !active || !authenticated || Boolean(address && bridgedAddress === address);
  useEffect(
    () =>
      onState({
        address,
        email,
        authenticated,
        ready: ready && (!authenticated || walletsReady) && connectionReady,
        error,
      }),
    [
      address,
      email,
      authenticated,
      ready,
      walletsReady,
      connectionReady,
      error,
      onState,
    ],
  );
  useEffect(() => {
    actions.current.login = login;
    actions.current.logout = logout;
  }, [actions, login, logout]);
  return null;
}
function Session({ children }: { children: React.ReactNode }) {
  const activeAccount = useAccount();
  const [reownAddress, setReownAddress] = useState<Address>(null);
  const [privy, setPrivy] = useState<PrivyState>({
    address: null,
    email: null,
    authenticated: false,
    ready: !privyId,
    error: null,
  });
  const [method, setMethod] = useState<'wallet' | 'privy' | null>(null);
  const actions = useRef<Actions>({});
  const connectWallet = useCallback(async () => {
    if (!modal) {
      throw new Error(
        'Set NEXT_PUBLIC_REOWN_PROJECT_ID to enable WalletConnect.',
      );
    }
    setMethod('wallet');
    await modal.open({ view: 'Connect' });
  }, []);
  const login = useCallback(async () => {
    if (!privyId) {
      throw new Error(
        'Set NEXT_PUBLIC_PRIVY_APP_ID to enable email and social login.',
      );
    }
    if (!actions.current.login || !privy.ready) {
      throw new Error('Login is getting ready. Please try again in a moment.');
    }
    setMethod('privy');
    actions.current.login();
  }, [privy.ready]);
  const disconnect = useCallback(async () => {
    await actions.current.disconnect?.();
    if (privy.authenticated) {
      await actions.current.logout?.();
    }
    setReownAddress(null);
    setMethod(null);
  }, [privy.authenticated]);
  const activeMethod =
    method || (reownAddress ? 'wallet' : privy.authenticated ? 'privy' : null);
  const address = activeMethod === 'privy' ? privy.address : reownAddress;
  const connectionReady =
    activeAccount.isConnected && activeAccount.address === address;
  const value = useMemo(
    () => ({
      address,
      email: activeMethod === 'privy' ? privy.email : null,
      authenticated:
        Boolean(address) || (activeMethod === 'privy' && privy.authenticated),
      method: activeMethod,
      ready: activeMethod === 'privy' ? privy.ready && connectionReady : true,
      connectionError: activeMethod === 'privy' ? privy.error : null,
      wagmiConfig,
      reownConfigured: Boolean(projectId),
      privyConfigured: Boolean(privyId),
      connectWallet,
      login,
      disconnect,
    }),
    [
      address,
      activeMethod,
      privy,
      connectionReady,
      connectWallet,
      login,
      disconnect,
    ],
  );
  return (
    <WalletContext.Provider value={value}>
      <ReownBridge onAddress={setReownAddress} actions={actions} />
      {privyId ? (
        <PrivyBridge
          onState={setPrivy}
          actions={actions}
          active={activeMethod === 'privy'}
        />
      ) : null}
      {children}
    </WalletContext.Provider>
  );
}
export default function ConfiguredProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  let content = <Session>{children}</Session>;
  content = (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
    </WagmiProvider>
  );
  if (privyId) {
    content = (
      <PrivyProvider
        appId={privyId}
        clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || undefined}
        config={{
          loginMethods: ['email', 'google'],
          appearance: {
            theme: 'light',
            accentColor: '#7655e8',
            logo: '/icon.svg',
          },
          defaultChain: base,
          supportedChains: [base, polygon, mainnet, arbitrum, optimism],
          embeddedWallets: {
            ethereum: { createOnLogin: 'users-without-wallets' },
          },
        }}
      >
        {content}
      </PrivyProvider>
    );
  }
  return content;
}
