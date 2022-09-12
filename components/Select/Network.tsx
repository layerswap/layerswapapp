import { Field, useFormikContext } from "formik";
import { forwardRef } from "react";
import { useQueryState } from "../../context/query";
import { useSettingsState } from "../../context/settings";
import { SortingByOrder } from "../../lib/sorting";
import { CryptoNetwork } from "../../Models/CryptoNetwork";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import Select from "./Select";
import { SelectMenuItem } from "./selectMenuItem";

const NetworkField = forwardRef((props: any, ref: any) => {
    const {
        values: { exchange, network, swapType },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const name = "network"
    const { lockNetwork, destNetwork } = useQueryState()
    const { data } = useSettingsState();

    const destNetworkIsAvailable = data.networks.some(n => n.code === destNetwork && n.is_enabled && (swapType === "onramp" || data?.currencies?.some(c => c.network_id === n.id && c.exchanges.some(ce => ce.is_off_ramp_enabled))))
    
    const networkMenuItems: SelectMenuItem<CryptoNetwork>[] = data.networks
        .filter(n => swapType === "onramp" || data?.currencies?.some(c => c.is_enabled && c.network_id === n.id && c.exchanges.some(ce => ce.is_off_ramp_enabled)))
        .map(n => ({
            baseObject: n,
            id: n.code,
            name: n.name,
            order: n.order,
            imgSrc: n.logo_url,
            isAvailable: swapType === "offramp" ? !destNetworkIsAvailable : !lockNetwork,
            isEnabled: n.is_enabled && data.currencies.some(c => c.is_enabled && c.network_id === n.id && (swapType === "offramp" || c.exchanges.some(ce => ce.exchange_id === exchange?.baseObject?.id))),
            isDefault: n.is_default
        })).sort(SortingByOrder);

    return (<>
        <label htmlFor={name} className="block font-normal text-pink-primary-300 text-sm">
            {swapType === "onramp" ? "To" : "From"}
        </label>
        <div ref={ref} tabIndex={0} className={`mt-1.5 ${!network && (swapType === "offramp" || exchange) ? 'ring-pink-primary border-pink-primary' : ''} focus:ring-pink-primary focus:border-pink-primary border-ouline-blue border focus:ring-1 overflow-hidden rounded-lg`}>
            <Field name={name} placeholder="Network" values={networkMenuItems} label="To" value={network} as={Select} setFieldValue={setFieldValue} />
        </div>
    </>)
});
export default NetworkField