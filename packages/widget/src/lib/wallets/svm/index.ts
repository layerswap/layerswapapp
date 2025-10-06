import { WalletProvider } from "@/context/LayerswapProvider";
import useSVMConnection from "./useSVMConnection";
import SVMProvider from "./SVMProvider";
import { SolanaBalanceProvider } from "@/lib/balances/providers";
import { SolanaGasProvider } from "@/lib/wallets/svm/svmGasProvider";

export const useSVM: WalletProvider = {
    id: "solana",
    wrapper: SVMProvider,
    walletConnectionProvider: useSVMConnection,
    balanceProvider: new SolanaBalanceProvider(),
    gasProvider: new SolanaGasProvider(),
}