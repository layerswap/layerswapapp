import { useCallback, useEffect, useMemo } from "react";
import {
  useUserWallets,
  useDynamicContext,
  dynamicEvents,
  Wallet as DynamicWallet,
} from "@dynamic-labs/sdk-react-core";
import { resolveWalletConnectorIcon, createReactHookConnectionAdapter } from "@layerswap/widget/internal"
import { NetworkType, type InternalConnector, type NetworkWithTokens, type Wallet } from "@layerswap/widget-types"
import type { WalletConnectionProvider, WalletConnectionProviderProps } from "@layerswap/widget/types"

const DYNAMIC_CONNECTOR_ID = "dynamic-starknet"
const STARKNET_PROVIDER_NAME = "Starknet"

export const customStarknetNetworkAdapter: WalletConnectionProviderProps["networkAdapter"] = {
  getId: network => network.name,
  getDisplayName: network => network.display_name,
  getChainId: network => network.chain_id,
  getRpcUrls: network => network.nodes?.length
    ? network.nodes
    : [network.node_url].filter((url): url is string => Boolean(url)),
  getIcon: network => network.logo,
  getTransactionExplorerUrl: network => network.transaction_explorer_template,
  getAccountExplorerUrl: network => network.account_explorer_template,
  getNativeCurrency: network => network.token && {
    symbol: network.token.symbol,
    decimals: network.token.decimals,
  },
  getMulticallAddress: network => network.metadata?.evm_multicall_contract ?? undefined,
  isEvmNetwork: network => network.type === NetworkType.EVM,
  isSolanaNetwork: network => network.type === NetworkType.Solana,
  isStarknetNetwork: network => network.type === NetworkType.Starknet,
  isTronNetwork: network => network.type === NetworkType.Tron,
  isBitcoinNetwork: network => network.type === NetworkType.Bitcoin,
  isTonNetwork: network => network.type === NetworkType.TON,
  isFuelNetwork: network => network.type === NetworkType.Fuel,
}

function useStarknet({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
  const name = STARKNET_PROVIDER_NAME;
  const id = "starknet";

  // Dynamic SDK
  const { setShowAuthFlow, handleLogOut } = useDynamicContext();
  const userWallets = useUserWallets();

  // Starknet network names
  const starknetNetworkNames = [
    "STARKNET_MAINNET",
    "STARKNET_SEPOLIA",
  ]

  // Supported-networks
  const supportedNetworks = useMemo(
    () => ({
      asSource: starknetNetworkNames,
      autofill: starknetNetworkNames,
      withdrawal: starknetNetworkNames,
    }),
    [starknetNetworkNames],
  );

  // Clean up dynamicEvents listeners on unmount
  useEffect(() => {
    return () => {
      dynamicEvents.removeAllListeners("walletAdded");
      dynamicEvents.removeAllListeners("authFlowCancelled");
    };
  }, []);
  // The connector tile represents the handoff to Dynamic; Dynamic's own UI
  // performs the actual Starknet wallet selection.
  const connectWallet = useCallback(async ({ connector }: { connector: InternalConnector }): Promise<Wallet | undefined> => {
    if (connector.id !== DYNAMIC_CONNECTOR_ID) {
      throw new Error(`Unsupported Dynamic connector: ${connector.id}`)
    }

    if (userWallets.length) {
      await handleLogOut();
    }

    const newDynWallet = await new Promise<DynamicWallet>((resolve, reject) => {
      setShowAuthFlow(true);

      const onAdded = (w: DynamicWallet) => {
        cleanup();
        resolve(w);
      };
      const onCancelled = () => {
        cleanup();
        reject(new Error("User cancelled the connection"));
      };
      const cleanup = () => {
        dynamicEvents.off("walletAdded", onAdded);
        dynamicEvents.off("authFlowCancelled", onCancelled);
      };

      dynamicEvents.on("walletAdded", onAdded);
      dynamicEvents.on("authFlowCancelled", onCancelled);
    });

    return resolveWallet({
      connection: newDynWallet,
      networks,
      supportedNetworks,
      disconnect: handleLogOut,
      providerName: name,
    });
  }, [userWallets, handleLogOut, setShowAuthFlow, networks, supportedNetworks]);

  // Logout
  const disconnectWallets = useCallback(async () => {
    await handleLogOut();
  }, [handleLogOut]);

  // Map wagmi connectors → Dynamic SDK wallets → our Wallet shape
  const connectedWallets: Wallet[] = useMemo(
    () =>
      userWallets
        .map((dyn) => {
          if (!dyn) return;
          return resolveWallet({
            connection: dyn,
            networks,
            supportedNetworks,
            disconnect: disconnectWallets,
            providerName: name,
          });
        })
        .filter(Boolean) as Wallet[],
    [userWallets, networks, supportedNetworks, disconnectWallets],
  );

  const logo = networks.find((n) => n.name.toLowerCase().includes("starknet"))?.logo;
  // Keep one connector available even while logged out. The concrete Argent,
  // Braavos, etc. connector is only known after Dynamic finishes authentication.
  const availableConnectors = useMemo<InternalConnector[]>(() => [{
    id: DYNAMIC_CONNECTOR_ID,
    name: "Dynamic",
    providerName: STARKNET_PROVIDER_NAME,
    icon: logo,
    type: "other",
    source: "configured",
    hasBrowserExtension: false,
    isMobileSupported: true,
  }], [logo])

  return {
    connectWallet,
    availableConnectors,
    activeWallet: connectedWallets.find((w) => w.isActive),
    connectedWallets,
    asSourceSupportedNetworks: supportedNetworks.asSource,
    autofillSupportedNetworks: supportedNetworks.autofill,
    withdrawalSupportedNetworks: supportedNetworks.withdrawal,
    name,
    id,
    providerIcon: logo,
    ready: true,
  };
}

/** Reusable helper to turn a DynamicWallet + context into our `Wallet` shape */
function resolveWallet(props: {
  connection: DynamicWallet;
  networks: NetworkWithTokens[];
  supportedNetworks: {
    asSource: string[];
    autofill: string[];
    withdrawal: string[];
  };
  disconnect: () => Promise<void>;
  providerName: string;
}): Wallet | undefined {
  const { connection, networks, supportedNetworks, disconnect, providerName } = props;

  const connectorName = connection.connector.name;
  const address = connection.address;
  if (!connectorName || !address) return;

  const displayName = `${connectorName} – ${providerName}`;
  const networkIcon = networks.find((n) => n.name.toLowerCase().includes("starknet"))?.logo;

  return {
    id: connectorName,
    isActive: true,
    address,
    addresses: [address],
    displayName,
    providerName,
    icon: resolveWalletConnectorIcon({ iconUrl: connection.connector.metadata.icon }),
    disconnect: () => disconnect(),
    asSourceSupportedNetworks: supportedNetworks.asSource,
    autofillSupportedNetworks: supportedNetworks.autofill,
    withdrawalSupportedNetworks: supportedNetworks.withdrawal,
    networkIcon,
  };
}

export default useStarknet
export const customStarknetAdapter = createReactHookConnectionAdapter(useStarknet)
