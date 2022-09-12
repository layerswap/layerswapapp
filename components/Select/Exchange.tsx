import { Field, useFormikContext } from "formik";
import { forwardRef } from "react";
import { useSettingsState } from "../../context/settings";
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

    const exchangeMenuItems: SelectMenuItem<Exchange>[] = settings.data.exchanges
        .filter(e => swapType === "onramp" || settings?.data?.currencies?.some(c => c.exchanges?.some(ce => ce.exchange_id === e.id && ce.is_off_ramp_enabled)))
        .map(e => ({
            baseObject: e,
            id: e.internal_name,
            name: e.name,
            order: e.order,
            imgSrc: e.logo_url,
            isAvailable: settings.data.currencies.some(c => c.exchanges?.some(ce => ce.exchange_id === e.id && (swapType === "onramp" || ce.is_off_ramp_enabled))),
            isEnabled: e.is_enabled,
            isDefault: e.is_default
        })).sort(SortingByOrder);


    return (<>
        <label htmlFor={name} className="block font-normal text-pink-primary-300 text-sm">
            {swapType === "onramp" ? "From" : "To"}
        </label>
        <div ref={ref} tabIndex={0} className={`mt-1.5 ${!exchange && (swapType === "onramp" || network) ? 'ring-pink-primary border-pink-primary' : ''} focus:ring-pink-primary focus:border-pink-primary border-ouline-blue border focus:ring-1 overflow-hidden rounded-lg`}>
            <Field name={name} placeholder="Exchange" values={exchangeMenuItems} label="From" value={exchange} as={Select} setFieldValue={setFieldValue} />
        </div>
    </>)
});
export default ExchangesField