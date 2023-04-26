import { Field, useFormikContext } from "formik";
import { forwardRef, useCallback, useState } from "react";
import { useQueryState } from "../../context/query";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { GenerateDestLayerMenuItems, GenerateSourceLayerMenuItems } from "../utils/generateMenuItems";
import { SelectMenuItem, SelectMenuItemGroup } from "./selectMenuItem";
import { Layer } from "../../Models/Layer";
import CommandSelectWrapper from "./CommandSelectWrapper";

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
    const [showModal, setShowModal] = useState(false)

    let menuItems: SelectMenuItemGroup[]
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
        placeholder = "Destination";
    }

    const value = direction === "from" ? from : to;

    const handleSelect = useCallback((item: SelectMenuItem<Layer>) => {
        setFieldValue(name, item, true)
    }, [name])

    return (<>
        <label htmlFor={name} className="block font-semibold text-primary-text text-sm">
            {label}
        </label>
        <div ref={ref} className={`mt-1.5 `}>
            <CommandSelectWrapper
                disabled={false}
                placeholder={placeholder}
                setValue={handleSelect}
                value={value}
                values={menuItems}
            />
        </div>
    </>)
});

export default SelectNetwork