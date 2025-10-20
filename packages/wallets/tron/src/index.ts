import { WalletProvider } from "@layerswap/widget/types";
import { TronGasProvider } from "./tronGasProvider";
import TronProviderWrapper from "./TronProvider";
import useTronConnection from "./useTronConnection";
import { TronBalanceProvider } from "./tronBalanceProvider";
import { TronAddressUtilsProvider } from "./tronAddressUtilsProvider";

export const TronProvider: WalletProvider = {
    id: "tron",
    wrapper: TronProviderWrapper,
    walletConnectionProvider: useTronConnection,
    addressUtilsProvider: new TronAddressUtilsProvider(),
    balanceProvider: new TronBalanceProvider(),
    gasProvider: new TronGasProvider(),
}