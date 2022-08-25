import { useFormikContext } from "formik";
import { SwapFormValues, SwapType } from "../components/DTOs/SwapFormValues";
import { SelectMenuItem } from "../components/Select/selectMenuItem";
import { useQueryState } from "../context/query";
import { useSettingsState } from "../context/settings";
import { CryptoNetwork } from "../Models/CryptoNetwork";

export function useSwapInitialValues(swapType: SwapType): SwapFormValues {
    const { data: { currencies, networks } } = useSettingsState()
    const { destNetwork } = useQueryState();

    const availableNetworks = networks
        .map(c => new SelectMenuItem<CryptoNetwork>(c, c.code, c.name, c.order, c.logo_url, c.is_enabled, c.is_default))

    const initialNetwork =
        availableNetworks.find(x => x.baseObject.code.toUpperCase() === destNetwork?.toUpperCase() && x.isAvailable)

    return { amount: "", destination_address: "", swapType: swapType || "onramp", network: swapType === "onramp" ? initialNetwork : null }
}