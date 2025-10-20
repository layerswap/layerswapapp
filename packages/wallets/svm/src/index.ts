import { WalletProvider } from "@layerswap/widget/types";
import useSVMConnection from "./useSVMConnection";
import SVMProvider from "./SVMProvider";
import { SolanaBalanceProvider } from "./svmBalanceProvider";
import { SolanaGasProvider } from "./svmGasProvider";
import { SolanaAddressUtilsProvider } from "./svmAddressUtilsProvider";

export const useSVM: WalletProvider = {
    id: "solana",
    wrapper: SVMProvider,
    walletConnectionProvider: useSVMConnection,
    addressUtilsProvider: new SolanaAddressUtilsProvider(),
    balanceProvider: new SolanaBalanceProvider(),
    gasProvider: new SolanaGasProvider(),
}