import { Field, useFormikContext } from "formik";
import { forwardRef } from "react";
import { useQueryState } from "../../context/query";
import { useSettingsState } from "../../context/settings";
import { SwapType } from "../../lib/layerSwapApiClient";
import { CryptoNetwork } from "../../Models/CryptoNetwork";
import { Exchange } from "../../Models/Exchange";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { generateExchangeMenuItems, generateNetworkMenuItems } from "../utils/generateMenuItems";
import Select from "./Select";
import { SelectMenuItem } from "./selectMenuItem";

type Props = {
    direction: "from" | "to",
    label: string,
}
const SelectNetwork = forwardRef(({ direction, label }: Props, ref: any) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const name = direction
    const { swapType, from, to } = values
    const { lockNetwork, destNetwork, sourceExchangeName, lockExchange, from: source, to: destination } = useQueryState()
    const { discovery: { resource_storage_url }, exchanges, networks } = useSettingsState();

    let menuItems: SelectMenuItem<CryptoNetwork | Exchange>[]
    let placeholder = "";
    if (direction === "from" ? (swapType === SwapType.OnRamp) : (swapType === SwapType.OffRamp)) {
        menuItems = generateExchangeMenuItems({ exchanges, values, networks, resource_storage_url, sourceExchangeName, source, destination, lockExchange });
        placeholder = "Exchange";
    }
    else {
        menuItems = generateNetworkMenuItems({ values, networks, resource_storage_url, destNetwork, lockNetwork, direction, exchanges, source, destination })
        placeholder = "Network";
    }

    const value = direction === "from" ? from : to;
    return (<>
        <label htmlFor={name} className="block font-semibold text-primary-text text-sm">
            {label}
        </label>
        <div ref={ref} tabIndex={0} className={`mt-1.5 `}>
            <Field name={name} placeholder={placeholder} values={menuItems} label={label} value={value} as={Select} setFieldValue={setFieldValue} lockExchange={lockExchange} lockNetwork={lockNetwork} header={`Swap ${direction === 'from' ? 'from' : 'to'}`} />
        </div>
    </>)
});
export default SelectNetwork