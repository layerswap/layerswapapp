import { WalletProvider } from "@/context/LayerswapProvider";
import { ImmutableXBalanceProvider } from "./immutableXBalanceProvider";
import { ImmutableXGasProvider } from "./immutableXGasProvider";
import useImtblXConnection from "./useImtblX";
import { ImmutableXAddressUtilsProvider } from "./imtblXAddressUtilsProvider";

export const useImtblX: WalletProvider = {
    id: "imx",
    walletConnectionProvider: useImtblXConnection,
    addressUtilsProvider: new ImmutableXAddressUtilsProvider(),
    balanceProvider: new ImmutableXBalanceProvider(),
    gasProvider: new ImmutableXGasProvider(),
}