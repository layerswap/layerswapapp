import { Field, useFormikContext } from "formik";
import { forwardRef } from "react";
import { useQueryState } from "../../context/query";
import { useSettingsState } from "../../context/settings";
import { SwapType } from "../../lib/layerSwapApiClient";
import NetworkSettings from "../../lib/NetworkSettings";
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
    const { discovery: { resource_storage_url }, networks } = useSettingsState();

    const networkIsAvailable = (n: CryptoNetwork) => ((swapType === SwapType.OffRamp ?
        (n.currencies.some(nc => !NetworkSettings?.ForceDisable?.[n?.internal_name]?.offramp && nc.status === "active" && nc.is_deposit_enabled && (!exchange || exchange?.baseObject.currencies.some(ec => ec.asset === nc.asset && ec.status === "active" && ec.is_withdrawal_enabled && ec.network != n.internal_name))))
        : (n.currencies.some(nc => !NetworkSettings?.ForceDisable?.[n?.internal_name]?.onramp && nc.status === "active" && nc.is_withdrawal_enabled && (!exchange || exchange?.baseObject.currencies.some(ec => ec.asset === nc.asset && ec.status === "active" && ec.is_deposit_enabled && ec.network != n.internal_name)))))
    )

    const destNetworkIsAvailable = networks.some(n => n.internal_name === destNetwork && n.status === "active" && networkIsAvailable(n))

    const networkMenuItems: SelectMenuItem<CryptoNetwork>[] = networks
        .filter(networkIsAvailable)
        .map(n => ({
            baseObject: n,
            id: n.internal_name,
            name: n.display_name,
            order: 0, // TODO implement in settings
            imgSrc: `${resource_storage_url}/layerswap/networks/${n.internal_name.toLowerCase()}.png`,
            isAvailable: n.status === "active" && (swapType === SwapType.OffRamp ? !destNetworkIsAvailable : !lockNetwork),
            isDefault: false
        })).sort(SortingByOrder);

    return (<>
        <label htmlFor={name} className="block font-normal text-primary-text text-sm">
            {swapType === SwapType.OnRamp ? "To" : "From"}
        </label>
        <div ref={ref} tabIndex={0} className={`mt-1.5 `}>
            <Field name={name} placeholder="Network" values={networkMenuItems} label="To" value={network} as={Select} setFieldValue={setFieldValue} />
        </div>
    </>)
});
export default NetworkField