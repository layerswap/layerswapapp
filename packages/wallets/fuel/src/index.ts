import { FuelBalanceProvider } from "./fuelBalanceProvider";
import { FuelGasProvider } from "./fuelGasProvider";
import FuelProvider from "./FuelProvider";
import useFuelConnection from "./useFuelConnection";
import { WalletProvider } from "@layerswap/widget/types";

export const useFuel: WalletProvider = {
    id: "fuel",
    wrapper: FuelProvider,
    walletConnectionProvider: useFuelConnection,
    balanceProvider: new FuelBalanceProvider(),
    gasProvider: new FuelGasProvider(),
}