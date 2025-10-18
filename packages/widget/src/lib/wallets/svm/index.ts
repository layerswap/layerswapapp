import { WalletProvider } from "@/types";
import useSVMConnection from "./useSVMConnection";
import SVMProvider from "./SVMProvider";
import { SolanaBalanceProvider } from "./svmBalanceProvider";
import { SolanaGasProvider } from "./svmGasProvider";

export const useSVM: WalletProvider = {
    id: "solana",
    wrapper: SVMProvider,
    walletConnectionProvider: useSVMConnection,
    balanceProvider: new SolanaBalanceProvider(),
    gasProvider: new SolanaGasProvider(),
}