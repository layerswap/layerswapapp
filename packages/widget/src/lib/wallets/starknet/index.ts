import StarknetProvider from "./StarknetProvider";
import useStarknetConnection from "./useStarknetConnection";
import { StarknetBalanceProvider } from "./starknetBalanceProvider";
import { StarknetGasProvider } from "./starknetGasProvider";
import { WalletProvider } from "@/context/LayerswapProvider";
import { StarknetAddressUtilsProvider } from "./starknetAddressUtilsProvider";

export const useStarknet: WalletProvider = {
    id: "starknet",
    wrapper: StarknetProvider,
    walletConnectionProvider: useStarknetConnection,
    addressUtilsProvider: new StarknetAddressUtilsProvider(),
    balanceProvider: new StarknetBalanceProvider(),
    gasProvider: new StarknetGasProvider(),
}