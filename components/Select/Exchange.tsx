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
    const settings = useSettingsState();
    const { discovery: { resource_storage_url } } = settings.data || {}

    const exchangeMenuItems: SelectMenuItem<Exchange>[] = settings.data.exchanges
        .filter(e => swapType ===  SwapType.OffRamp ? e.currencies.some(ce => ce.status === "active" && ce.is_withdrawal_enabled) : e.currencies.some(ce => ce.status === "active" && ce.is_deposit_enabled))
        .map(e => ({
            baseObject: e,
            id: e.internal_name,
            name: e.display_name,
            order: e.order,
            imgSrc: `${resource_storage_url}${e.logo}`,
            isAvailable: true,
            isEnabled: true,
            isDefault: false
        })).sort(SortingByOrder);


    return (<>
        <label htmlFor={name} className="block font-normal text-primary-text text-sm">
            {swapType ===  SwapType.OnRamp ? "From" : "To"}
        </label>
        <div ref={ref} tabIndex={0} className={`mt-1.5 ${!exchange && (swapType ===  SwapType.OnRamp || network) ? 'ring-primary border-primary' : ''} focus:ring-primary focus:border-primary border-darkblue-100 border focus:ring-1 overflow-hidden rounded-lg`}>
            <Field name={name} placeholder="Exchange" values={exchangeMenuItems} label="From" value={exchange} as={Select} setFieldValue={setFieldValue} />
        </div>
    </>)
});
export default ExchangesField