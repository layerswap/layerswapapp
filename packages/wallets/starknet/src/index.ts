import StarknetProvider from "./StarknetProvider";
import useStarknetConnection from "./useStarknetConnection";
import { StarknetBalanceProvider } from "./starknetBalanceProvider";
import { StarknetGasProvider } from "./starknetGasProvider";
import { WalletProvider } from "@layerswap/widget/types";
import { StarknetAddressUtilsProvider } from "./starknetAddressUtilsProvider";
import { StarknetNftProvider } from "./starknetNftProvider";

export const useStarknet: WalletProvider = {
    id: "starknet",
    wrapper: StarknetProvider,
    walletConnectionProvider: useStarknetConnection,
    addressUtilsProvider: new StarknetAddressUtilsProvider(),
    balanceProvider: new StarknetBalanceProvider(),
    gasProvider: new StarknetGasProvider(),
    nftProvider: new StarknetNftProvider(),
}