import { Field, useFormikContext } from "formik";
import { forwardRef } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapType } from "../../lib/layerSwapApiClient";
import { SortingByOrder } from "../../lib/sorting";
import { Exchange } from "../../Models/Exchange";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import Select from "./Select";
import { SelectMenuItem } from "./selectMenuItem";

const ExchangesField = forwardRef((props: any, ref: any) => {
    const {
        values: { exchange, swapType, network },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const name = 'exchange'
    const { discovery: { resource_storage_url }, exchanges, networks } = useSettingsState();

    const exchangeMenuItems: SelectMenuItem<Exchange>[] = exchanges
        .filter(e => e.currencies.some(ec => (network && network.baseObject.internal_name.toLowerCase() === ec.network.toLowerCase()) || networks.some(n => n.internal_name?.toLowerCase() === ec.network?.toLowerCase())))
        .map(e => ({
            baseObject: e,
            id: e.internal_name,
            name: e.display_name,
            order: 0, // TODO implement in settings
            imgSrc: `${resource_storage_url}/layerswap/networks/${e.internal_name.toLowerCase()}.png`,
            isAvailable: true,
            isDefault: false
        })).sort(SortingByOrder);

    return (<>
        <label htmlFor={name} className="block font-normal text-primary-text text-sm">
            {swapType === SwapType.OnRamp ? "From" : "To"}
        </label>
        <div ref={ref} tabIndex={0} className={`mt-1.5 `}>
            <Field name={name} placeholder="Exchange" values={exchangeMenuItems} label="From" value={exchange} as={Select} setFieldValue={setFieldValue} />
        </div>
    </>)
});
export default ExchangesField