import { WalletProvider } from "@layerswap/widget/types";
import { ImmutableXBalanceProvider } from "./immutableXBalanceProvider";
import { ImmutableXGasProvider } from "./immutableXGasProvider";
import useImtblXConnection from "./useImtblX";

export const ImmutableXProvider: WalletProvider = {
    id: "imx",
    walletConnectionProvider: useImtblXConnection,
    balanceProvider: new ImmutableXBalanceProvider(),
    gasProvider: new ImmutableXGasProvider(),
}