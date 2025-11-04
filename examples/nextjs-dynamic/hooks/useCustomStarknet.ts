import { useCallback, useEffect, useMemo } from "react";
import {
  useUserWallets,
  useDynamicContext,
  dynamicEvents,
  Wallet as DynamicWallet,
} from "@dynamic-labs/sdk-react-core";
import {
  resolveWalletConnectorIcon,
  NetworkWithTokens,
} from "@layerswap/widget";
import { WalletConnectionProvider, Wallet, WalletConnectionProviderProps } from "@layerswap/widget/types"

export default function useStarknet({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
  const name = "Starknet";
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
  // connectWallet: log out existing, show authFlow, wait for event, then resolve
  const connectWallet = useCallback(async (): Promise<Wallet | undefined> => {
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

  const availableConnectors = [{
    id: id,
    name: name,
    icon: logo,
  }]

  return {
    connectWallet,
    switchAccount: async (connector: Wallet, address: string) => {
      throw new Error("Not implemented");
    },
    availableWalletsForConnect: availableConnectors,
    activeWallet: connectedWallets.find((w) => w.isActive),
    connectedWallets,
    asSourceSupportedNetworks: supportedNetworks.asSource,
    autofillSupportedNetworks: supportedNetworks.autofill,
    withdrawalSupportedNetworks: supportedNetworks.withdrawal,
    name,
    id,
    providerIcon: logo,
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
