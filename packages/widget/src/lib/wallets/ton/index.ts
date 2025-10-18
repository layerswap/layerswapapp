import { WalletProvider } from "@/types";
import { TonBalanceProvider } from "./tonBalanceProvider";
import { TonGasProvider } from "./tonGasProvider";
import TonProvider from "./TonProvider";
import useTONConnection from "./useTONConnection";

export const useTON: WalletProvider = {
    id: "ton",
    wrapper: TonProvider,
    walletConnectionProvider: useTONConnection,
    balanceProvider: new TonBalanceProvider(),
    gasProvider: new TonGasProvider(),
}