import StarknetProvider from "./StarknetProvider";
import useStarknetConnection from "./useStarknetConnection";
import { StarknetBalanceProvider } from "./starknetBalanceProvider";
import { StarknetGasProvider } from "./starknetGasProvider";
import { WalletProvider } from "@/types";

export const useStarknet: WalletProvider = {
    id: "starknet",
    wrapper: StarknetProvider,
    walletConnectionProvider: useStarknetConnection,
    balanceProvider: new StarknetBalanceProvider(),
    gasProvider: new StarknetGasProvider(),
}