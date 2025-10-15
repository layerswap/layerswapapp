import { WalletProvider } from "@/types";
import { ImmutableXBalanceProvider } from "./immutableXBalanceProvider";
import { ImmutableXGasProvider } from "./immutableXGasProvider";
import useImtblXConnection from "./useImtblX";

export const useImtblX: WalletProvider = {
    id: "imx",
    walletConnectionProvider: useImtblXConnection,
    balanceProvider: new ImmutableXBalanceProvider(),
    gasProvider: new ImmutableXGasProvider(),
}