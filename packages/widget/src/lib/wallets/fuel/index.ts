import { FuelAddressUtilsProvider } from "./fuelAddressUtilsProvider";
import { FuelBalanceProvider } from "./fuelBalanceProvider";
import { FuelGasProvider } from "./fuelGasProvider";
import FuelProvider from "./FuelProvider";
import useFuelConnection from "./useFuelConnection";
import { WalletProvider } from "@/types";

export const useFuel: WalletProvider = {
    id: "fuel",
    wrapper: FuelProvider,
    walletConnectionProvider: useFuelConnection,
    addressUtilsProvider: new FuelAddressUtilsProvider(),
    balanceProvider: new FuelBalanceProvider(),
    gasProvider: new FuelGasProvider(),
}