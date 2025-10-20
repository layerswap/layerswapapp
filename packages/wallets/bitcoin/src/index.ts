import useBitcoinConnection from "./useBitcoinConnection";
import { WalletProvider } from "@layerswap/widget/types";
import { BitcoinProvider as BitcoinProviderWrapper } from "./BitcoinProvider";
import { BitcoinGasProvider } from "./bitcoinGasProvider";
import { BitcoinBalanceProvider } from "./bitcoinBalanceProvider";
import { BitcoinAddressUtilsProvider } from "./bitcoinAddressUtilsProvider";

export const BitcoinProvider: WalletProvider = {
    id: "bitcoin",
    wrapper: BitcoinProviderWrapper,
    walletConnectionProvider: useBitcoinConnection,
    addressUtilsProvider: new BitcoinAddressUtilsProvider(),
    balanceProvider: new BitcoinBalanceProvider(),
    gasProvider: new BitcoinGasProvider(),
}