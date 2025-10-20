import { FuelAddressUtilsProvider } from "./fuelAddressUtilsProvider";
import { FuelBalanceProvider } from "./fuelBalanceProvider";
import { FuelGasProvider } from "./fuelGasProvider";
import FuelProviderWrapper from "./FuelProvider";
import useFuelConnection from "./useFuelConnection";
import { WalletProvider } from "@layerswap/widget/types";

export const FuelProvider: WalletProvider = {
    id: "fuel",
    wrapper: FuelProviderWrapper,
    walletConnectionProvider: useFuelConnection,
    addressUtilsProvider: new FuelAddressUtilsProvider(),
    balanceProvider: new FuelBalanceProvider(),
    gasProvider: new FuelGasProvider(),
}