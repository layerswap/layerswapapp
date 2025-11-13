import { WalletProvider } from "@layerswap/widget/types";
import { TonBalanceProvider } from "./tonBalanceProvider";
import { TonGasProvider } from "./tonGasProvider";
import TonProviderWrapper from "./TonProvider";
import useTONConnection from "./useTONConnection";
import { TonAddressUtilsProvider } from "./tonAddressUtilsProvider";

export const TonProvider: WalletProvider = {
    id: "ton",
    wrapper: TonProviderWrapper,
    walletConnectionProvider: useTONConnection,
    addressUtilsProvider: new TonAddressUtilsProvider(),
    balanceProvider: new TonBalanceProvider(),
    gasProvider: new TonGasProvider(),
}