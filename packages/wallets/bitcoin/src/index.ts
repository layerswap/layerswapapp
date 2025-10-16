import useBitcoinConnection from "./useBitcoinConnection";
import { WalletProvider } from "@layerswap/widget/types";
import { BitcoinProvider } from "./BitcoinProvider";
import { BitcoinGasProvider } from "./bitcoinGasProvider";
import { BitcoinBalanceProvider } from "./bitcoinBalanceProvider";

export const useBitcoin: WalletProvider = {
    id: "bitcoin",
    wrapper: BitcoinProvider,
    walletConnectionProvider: useBitcoinConnection,
    balanceProvider: new BitcoinBalanceProvider(),
    gasProvider: new BitcoinGasProvider(),
}