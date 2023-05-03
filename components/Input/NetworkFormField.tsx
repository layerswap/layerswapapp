import { useFormikContext } from "formik";
import { forwardRef, useCallback, useState } from "react";
import { useQueryState } from "../../context/query";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import { Layer } from "../../Models/Layer";
import CommandSelectWrapper from "../Select/Command/CommandSelectWrapper";
import { FilterDestinationLayers, FilterSourceLayers } from "../../helpers/settingsHelper";
import { Currency } from "../../Models/Currency";
import ExchangeSettings from "../../lib/ExchangeSettings";
import { SortingByOrder } from "../../lib/sorting"
import { DisabledReason } from "../Select/Popover/PopoverSelect";

type SwapDirection = "from" | "to";
type Props = {
    direction: SwapDirection,
    label: string,
}

const NetworkFormField = forwardRef(({ direction, label }: Props, ref: any) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const name = direction
    const { from, to } = values
    const { lockFrom, lockTo } = useQueryState()
    const { resolveImgSrc, layers } = useSettingsState();

    let placeholder = "";
    let searchHint = "";
    let filteredLayers: Layer[];
    let menuItems: SelectMenuItem<Layer>[];

    if (direction === "from") {
        placeholder = "Source";
        searchHint = "Swap from";
        filteredLayers = FilterSourceLayers(layers, to);
        menuItems = GenerateMenuItems(filteredLayers, resolveImgSrc, direction, lockFrom);
    }
    else {
        placeholder = "Destination";
        searchHint = "Swap to";
        filteredLayers = FilterDestinationLayers(layers, from);
        menuItems = GenerateMenuItems(filteredLayers, resolveImgSrc, direction, lockTo);
    }

    const value = menuItems.find(x => x.id == (direction === "from" ? from : to)?.internal_name);
    const handleSelect = useCallback((item: SelectMenuItem<Layer>) => {
        setFieldValue(name, item.baseObject, true)
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
                searchHint={searchHint}
            />
        </div>
    </>)
});

function GenerateMenuItems(layers: Layer[], resolveImgSrc: (item: Layer | Currency) => string, direction: SwapDirection, lock: boolean): SelectMenuItem<Layer>[] {
    let layerIsAvailable = (layer: Layer) => {
        if (lock) {
            return { value: false, disabledReason: DisabledReason.LockNetworkIsTrue }
        }
        else {
            return { value: true, disabledReason: null}
        }
    }

    return layers.map(l => {
        return {
            baseObject: l,
            id: l.internal_name,
            name: l.display_name,
            //TODO network/exchange
            order: ExchangeSettings.KnownSettings[l.internal_name]?.Order,
            imgSrc: resolveImgSrc && resolveImgSrc(l),
            isAvailable: layerIsAvailable(l),
            group: l.isExchange ? "Exchanges" : "Networks"
        }
    }).sort(SortingByOrder);
}

export default NetworkFormField