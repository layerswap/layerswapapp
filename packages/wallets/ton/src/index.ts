import { WalletProvider } from "@layerswap/widget/types";
import { TonBalanceProvider } from "./tonBalanceProvider";
import { TonGasProvider } from "./tonGasProvider";
import TonProvider from "./TonProvider";
import useTONConnection from "./useTONConnection";
import { TonAddressUtilsProvider } from "./tonAddressUtilsProvider";

export const useTON: WalletProvider = {
    id: "ton",
    wrapper: TonProvider,
    walletConnectionProvider: useTONConnection,
    addressUtilsProvider: new TonAddressUtilsProvider(),
    balanceProvider: new TonBalanceProvider(),
    gasProvider: new TonGasProvider(),
}