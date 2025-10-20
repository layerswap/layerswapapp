import { WalletProvider } from "@layerswap/widget/types";
import useSVMConnection from "./useSVMConnection";
import SVMProviderWrapper from "./SVMProvider";
import { SolanaBalanceProvider } from "./svmBalanceProvider";
import { SolanaGasProvider } from "./svmGasProvider";
import { SolanaAddressUtilsProvider } from "./svmAddressUtilsProvider";

export const SVMProvider: WalletProvider = {
    id: "solana",
    wrapper: SVMProviderWrapper,
    walletConnectionProvider: useSVMConnection,
    addressUtilsProvider: new SolanaAddressUtilsProvider(),
    balanceProvider: new SolanaBalanceProvider(),
    gasProvider: new SolanaGasProvider(),
}