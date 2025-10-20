import StarknetProviderWrapper from "./StarknetProvider";
import useStarknetConnection from "./useStarknetConnection";
import { StarknetBalanceProvider } from "./starknetBalanceProvider";
import { StarknetGasProvider } from "./starknetGasProvider";
import { WalletProvider } from "@layerswap/widget/types";
import { StarknetAddressUtilsProvider } from "./starknetAddressUtilsProvider";
import { StarknetNftProvider } from "./starknetNftProvider";

export const StarknetProvider: WalletProvider = {
    id: "starknet",
    wrapper: StarknetProviderWrapper,
    walletConnectionProvider: useStarknetConnection,
    addressUtilsProvider: new StarknetAddressUtilsProvider(),
    balanceProvider: new StarknetBalanceProvider(),
    gasProvider: new StarknetGasProvider(),
    nftProvider: new StarknetNftProvider(),
}