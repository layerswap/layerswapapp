export { useConnectModal } from "@/components/Wallet/WalletModal"
import KnownInternalNames from "@/lib/knownIds"
export { KnownInternalNames }
import NetworkSettings from "@/lib/NetworkSettings"
export { NetworkSettings }
export { insertIfNotExists } from "../lib/balances/helpers"
export * from "../lib/retry"
export { fetchWithTimeout } from "../lib/fetchWithTimeout"
export * from "../lib/wallets/utils";
export { default as AppSettings } from "../lib/AppSettings";
export { usePersistedState } from "../hooks/usePersistedState";
export { useSettingsState } from "../context/settings";
export * from "../components/Icons"
export { ImageWithFallback } from "../components/Common/ImageWithFallback"
export * from "../components/shadcn"
export { default as WalletMessage } from "../components/Pages/Swap/Withdraw/messages/Message"
export * from "../components/Buttons"
export * from "../components/Pages/Swap/Withdraw/Wallet/Common/buttons"
export * from "../components/Pages/Swap/Withdraw/Wallet/Common/actionMessage"
export { default as ClickTooltip } from "../components/Common/ClickTooltip"
export { useSelectedAccount, useSelectSwapAccount, useSwapAccounts, useLatestSourceAccount, useNetworkBalance } from "@/context/swapAccounts";
export { default as useWallet } from "@/hooks/useWallet"
export * from "../lib/apiClients"
export * from "../lib/formatUnits"
// Explicit re-exports (not `export * from "../stores"`): the wildcard meant any
// store added to ../stores/index.ts was silently published to every consuming
// wallet package, turning incidental store-shape changes into cross-package
// breaking changes. Keep this list intentional and minimal. Today only
// `useWalletStore` is consumed by wallet-package source (Fuel/Paradex); the
// rest are exposed for host-app integrations. Prefer adding stable accessor
// functions over widening this surface.
export { useWalletStore } from "../stores/walletStore"
export { useSlippageStore } from "../stores/slippageStore"
export { useSwapTransactionStore, useSwapDepositHintClicked, type SwapTransaction } from "../stores/swapTransactionStore"
export { useRecentNetworksStore, type RoutesHistory } from "../stores/recentRoutesStore"
export { useBalanceStore, selectResolvedSortingBalances, getKey, type BalanceEntry } from "../stores/balanceStore"
export { useRouteTokenSwitchStore } from "../stores/routeTokenSwitchStore"
export { useManualDestAddressesStore, type ManualDestAddress } from "../stores/manualDestAddressesStore"
export { default as ShortenString } from "../components/utils/ShortenString"
export { Address } from "../lib/address/Address"
export { getExplorerUrl } from "../lib/address/explorerUrl"
export * from "../context/swap"
export { useWalletProvidersList } from "../components/Wallet/WalletProviders"
export { ErrorHandler } from '../lib/ErrorHandler';
export type { ErrorEventType } from '../types/logEvents';
export { useRpcHealth } from "../context/rpcHealthContext";
export * from "../lib/walletConnect"