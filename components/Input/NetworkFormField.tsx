import { useFormikContext } from "formik";
import { forwardRef, useCallback } from "react";
import { useQueryState } from "../../context/query";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { ISelectMenuItem, SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import { Layer } from "../../Models/Layer";
import CommandSelectWrapper from "../Select/Command/CommandSelectWrapper";
import { FilterDestinationLayers, FilterSourceLayers } from "../../helpers/settingsHelper";
import { Currency } from "../../Models/Currency";
import ExchangeSettings from "../../lib/ExchangeSettings";
import { SortingByOrder } from "../../lib/sorting"
import { LayerDisabledReason } from "../Select/Popover/PopoverSelect";
import NetworkSettings from "../../lib/NetworkSettings";
import { SelectMenuItemGroup } from "../Select/Command/commandSelect";

type SwapDirection = "from" | "to";
type Props = {
    direction: SwapDirection,
    label: string,
}

let groupNameMap = (isExchange: boolean) => isExchange ? 'Exchanges' : 'Networks';

const NetworkFormField = forwardRef(({ direction, label }: Props, ref: any) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const name = direction
    const { from, to } = values
    const { lockFrom, lockTo, asset, lockAsset } = useQueryState()
    const { resolveImgSrc, layers, currencies } = useSettingsState();

    let placeholder = "";
    let searchHint = "";
    let filteredLayers: Layer[];
    let menuItems: SelectMenuItem<Layer>[];
    const lockedCurrency = lockAsset ? currencies?.find(c => c?.asset?.toUpperCase() === asset?.toUpperCase()) : null

    let valueGrouper: (values: ISelectMenuItem[]) => SelectMenuItemGroup[];
    if (direction === "from") {
        placeholder = "Source";
        searchHint = "Swap from";
        filteredLayers = FilterSourceLayers(layers, to, lockedCurrency);
        menuItems = GenerateMenuItems(filteredLayers, resolveImgSrc, direction, from && lockFrom);
        valueGrouper = (values: ISelectMenuItem[]) => {
            let groups: SelectMenuItemGroup[] = groupByType(values);
            let popularsGroup = new SelectMenuItemGroup({
                name: "Popular",
                items: [
                    ...groups?.[0].items.splice(0, 2),
                    ...(groups?.[1]?.items.splice(0, 2) || [])
                ]
            })
            groups.unshift(popularsGroup);
            return groups;
        }
    }
    else {
        placeholder = "Destination";
        searchHint = "Swap to";
        filteredLayers = FilterDestinationLayers(layers, from, lockedCurrency);
        menuItems = GenerateMenuItems(filteredLayers, resolveImgSrc, direction, to && lockTo);
        valueGrouper = (values: ISelectMenuItem[]) => {
            let groups: SelectMenuItemGroup[] = groupByType(values);
            let popularsGroup = new SelectMenuItemGroup({
                name: "Popular",
                items: [...groups?.[0]?.items?.splice(0, 4)]
            })
            groups.unshift(popularsGroup);
            return groups;
        }
    }

    const value = menuItems.find(x => x.id == (direction === "from" ? from : to)?.internal_name);
    const handleSelect = useCallback((item: SelectMenuItem<Layer>) => {
        setFieldValue(name, item.baseObject, true)
    }, [name])

    return (<div className="rounded-xl p-3 ea7df14a1597407f9f755f05e25bab42:bg-secondary-800/50 bg-secondary-700/70">
        <label htmlFor={name} className="block font-semibold text-primary-text text-sm">
            {label}
        </label>
        <div ref={ref} className={`mt-1.5 `}>
            <CommandSelectWrapper
                disabled={false}
                valueGrouper={valueGrouper}
                placeholder={placeholder}
                setValue={handleSelect}
                value={value}
                values={menuItems}
                searchHint={searchHint}
            />
        </div>
    </div>)
});

function groupByType(values: ISelectMenuItem[]) {
    let groups: SelectMenuItemGroup[] = [];
    values.forEach((v) => {
        let group = groups.find(x => x.name == v.group) || new SelectMenuItemGroup({ name: v.group, items: [] });
        group.items.push(v);
        if (!groups.find(x => x.name == v.group)) {
            groups.push(group);
        }
    });
    groups.sort((a, b) => {
        // Sort put networks first then exchanges
        return Number(a.name == groupNameMap(true)) - Number(b.name == groupNameMap(true));
    });
    return groups;
}

function GenerateMenuItems(layers: Layer[], resolveImgSrc: (item: Layer | Currency) => string, direction: SwapDirection, lock: boolean): SelectMenuItem<Layer>[] {

    let layerIsAvailable = (layer: Layer) => {
        if (lock) {
            return { value: false, disabledReason: LayerDisabledReason.LockNetworkIsTrue }
        }
        else {
            return { value: true, disabledReason: null }
        }
    }

    return layers.map(l => {
        let orderProp: keyof NetworkSettings | keyof ExchangeSettings = direction == 'from' ? 'OrderInSource' : 'OrderInDestination';

        return {
            baseObject: l,
            id: l.internal_name,
            name: l.display_name,
            order: l.isExchange ? ExchangeSettings.KnownSettings[l.internal_name]?.[orderProp] : NetworkSettings.KnownSettings[l.internal_name]?.[orderProp],
            imgSrc: resolveImgSrc && resolveImgSrc(l),
            isAvailable: layerIsAvailable(l),
            group: groupNameMap(l.isExchange)
        }
    }).sort(SortingByOrder);
}

export default NetworkFormField