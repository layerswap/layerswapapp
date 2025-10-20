import useBitcoinConnection from "./useBitcoinConnection";
import { WalletProvider } from "@layerswap/widget/types";
import { BitcoinProvider } from "./BitcoinProvider";
import { BitcoinGasProvider } from "./bitcoinGasProvider";
import { BitcoinBalanceProvider } from "./bitcoinBalanceProvider";
import { BitcoinAddressUtilsProvider } from "./bitcoinAddressUtilsProvider";

export const bitcoinProvider: WalletProvider = {
    id: "bitcoin",
    wrapper: BitcoinProvider,
    walletConnectionProvider: useBitcoinConnection,
    addressUtilsProvider: new BitcoinAddressUtilsProvider(),
    balanceProvider: new BitcoinBalanceProvider(),
    gasProvider: new BitcoinGasProvider(),
}