import { Field, useFormikContext } from "formik";
import { forwardRef } from "react";
import { useQueryState } from "../../context/query";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { GenerateDestLayerMenuItems, GenerateSourceLayerMenuItems } from "../utils/generateMenuItems";
import Select from "./Select";
import { SelectMenuItem } from "./selectMenuItem";
import { Layer } from "../../Models/Layer";

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
    const { from, to } = values
    const { lockNetwork, lockExchange } = useQueryState()
    const { discovery: { resource_storage_url }, layers } = useSettingsState();

    let menuItems: SelectMenuItem<Layer>[]
    let placeholder = "";
    if (direction === "from") {
        menuItems = GenerateSourceLayerMenuItems({
            destination: to?.baseObject,
            layers,
            resource_storage_url
        });
        placeholder = "Source";
    }
    else {
        menuItems = GenerateDestLayerMenuItems({
            source: from?.baseObject,
            layers,
            resource_storage_url
        })
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