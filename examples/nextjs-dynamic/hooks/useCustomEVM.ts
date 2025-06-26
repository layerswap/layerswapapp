import { useAccount, useSwitchAccount } from "wagmi";
import { useCallback, useEffect, useMemo } from "react";
import {
  useUserWallets,
  useDynamicContext,
  dynamicEvents,
  Wallet as DynamicWallet,
} from "@dynamic-labs/sdk-react-core";
import {
  WalletProvider,
  Wallet,
  resolveWalletConnectorIcon,
  useSettingsState,
  NetworkWithTokens,
  NetworkType,
} from "@layerswap/widget";

export default function useEVM(): WalletProvider {
  const name = "EVM";
  const id = "evm";

  // wagmi
  const { connectors: activeConnectors } = useSwitchAccount();
  const { connector: activeConnector, address: activeAddress } = useAccount();
  // Dynamic SDK
  const { setShowAuthFlow, handleLogOut } = useDynamicContext();
  const userWallets = useUserWallets();
  // Layerswap settings
  const { networks } = useSettingsState();

  // Gather the EVM‐type network names
  const evmNetworkNames = useMemo(
    () => networks.filter((n) => n.type === NetworkType.EVM).map((n) => n.name),
    [networks],
  );

  // Supported-networks
  const supportedNetworks = useMemo(
    () => ({
      asSource: evmNetworkNames,
      autofill: evmNetworkNames,
      withdrawal: evmNetworkNames,
    }),
    [evmNetworkNames],
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
      activeConnection:
        activeConnector && activeAddress ? { id: activeConnector.id, address: activeAddress } : undefined,
      networks,
      supportedNetworks,
      disconnect: handleLogOut,
      providerName: name,
    });
  }, [userWallets, handleLogOut, setShowAuthFlow, activeConnector, activeAddress, networks, supportedNetworks]);

  // Logout
  const disconnectWallets = useCallback(async () => {
    await handleLogOut();
  }, [handleLogOut]);

  // Map wagmi connectors → Dynamic SDK wallets → our Wallet shape
  const connectedWallets: Wallet[] = useMemo(
    () =>
      activeConnectors
        .map(() => {
          const dyn = userWallets.find(() => true);
          if (!dyn) return;
          return resolveWallet({
            connection: dyn,
            activeConnection:
              activeConnector && activeAddress ? { id: activeConnector.id, address: activeAddress } : undefined,
            networks,
            supportedNetworks,
            disconnect: disconnectWallets,
            providerName: name,
          });
        })
        .filter(Boolean) as Wallet[],
    [activeConnectors, userWallets, activeConnector, activeAddress, networks, supportedNetworks, disconnectWallets],
  );

  const logo = networks.find((n) => n.name.toLowerCase().includes("linea"))?.logo;

  return {
    connectWallet,
    connectConnector: connectWallet,
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
  activeConnection?: { id: string; address: string };
  networks: NetworkWithTokens[];
  supportedNetworks: {
    asSource: string[];
    autofill: string[];
    withdrawal: string[];
  };
  disconnect: () => Promise<void>;
  providerName: string;
}): Wallet | undefined {
  const { connection, activeConnection, networks, supportedNetworks, disconnect, providerName } = props;

  const connectorName = connection.connector.name;
  const address = connection.address;
  if (!connectorName || !address) return;

  const isActive = activeConnection?.address === address;
  const displayName = `${connectorName} – ${providerName}`;
  const networkIcon = networks.find((n) => n.name.toLowerCase().includes("linea"))?.logo;

  return {
    id: connectorName,
    isActive,
    address,
    addresses: [address],
    displayName,
    providerName,
    icon: resolveWalletConnectorIcon({ connector: connectorName, address }),
    disconnect: () => disconnect(),
    asSourceSupportedNetworks: supportedNetworks.asSource,
    autofillSupportedNetworks: supportedNetworks.autofill,
    withdrawalSupportedNetworks: supportedNetworks.withdrawal,
    networkIcon,
  };
}