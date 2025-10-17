import { WalletProvider } from "@/context/LayerswapProvider";
import { TronGasProvider } from "./tronGasProvider";
import TronProvider from "./TronProvider";
import useTronConnection from "./useTronConnection";
import { TronBalanceProvider } from "./tronBalanceProvider";
import { TronAddressUtilsProvider } from "./tronAddressUtilsProvider";

export const useTron: WalletProvider = {
    id: "tron",
    wrapper: TronProvider,
    walletConnectionProvider: useTronConnection,
    addressUtilsProvider: new TronAddressUtilsProvider(),
    balanceProvider: new TronBalanceProvider(),
    gasProvider: new TronGasProvider(),
}