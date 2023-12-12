import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { ISelectMenuItem, SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import { Layer } from "../../Models/Layer";
import CommandSelectWrapper from "../Select/Command/CommandSelectWrapper";
import ExchangeSettings from "../../lib/ExchangeSettings";
import { SortingByOrder } from "../../lib/sorting"
import { LayerDisabledReason } from "../Select/Popover/PopoverSelect";
import NetworkSettings from "../../lib/NetworkSettings";
import { SelectMenuItemGroup } from "../Select/Command/commandSelect";
import { useQueryState } from "../../context/query";
import CurrencyFormField from "./CurrencyFormField";
import useSWR from 'swr'
import { ApiResponse } from "../../Models/ApiResponse";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import { NetworkCurrency } from "../../Models/CryptoNetwork";

type SwapDirection = "from" | "to";
type Props = {
    direction: SwapDirection,
    label: string,
}
const GROUP_ORDERS = { "Popular": 1, "New": 2, "Fiat": 3, "Networks": 4, "Exchanges": 5, "Other": 10 };
const getGroupName = (layer: Layer) => {

    if (layer.is_featured) {
        return "Popular";
    }
    else if (new Date(layer.created_date).getTime() >= (new Date().getTime() - 2629800000)) {
        return "New";
    }
    else if (!layer.isExchange) {
        return "Networks";
    }
    else if (layer.type === 'fiat') {
        return "Fiat";
    }
    else if (layer.type === 'cex') {
        return "Exchanges";
    }
    else {
        return "Other";
    }
}

const NetworkFormField = forwardRef(function NetworkFormField({ direction, label }: Props, ref: any) {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const name = direction

    const { from, to, fromCurrency, toCurrency } = values
    const { lockFrom, lockTo } = useQueryState()

    const { resolveImgSrc, layers } = useSettingsState();

    let placeholder = "";
    let searchHint = "";
    let filteredLayers: Layer[];
    let menuItems: SelectMenuItem<Layer>[];

    let valueGrouper: (values: ISelectMenuItem[]) => SelectMenuItemGroup[];

    const filterWith = direction === "from" ? to : from
    const filterWithAsset = direction === "from" ? toCurrency?.asset : fromCurrency?.asset

    const apiClient = new LayerSwapApiClient()
    const version = process.env.NEXT_PUBLIC_API_VERSION

    const routesEndpoint = `/routes/${direction === "from" ? "sources" : "destinations"}${(filterWith && filterWithAsset) ? `?${direction === 'to' ? 'source_network' : 'destination_network'}=${filterWith.internal_name}&${direction === 'to' ? 'source_asset' : 'destination_asset'}=${filterWithAsset}&` : "?"}version=${version}`

    const { data: routes, isLoading } = useSWR<ApiResponse<{
        network: string,
        asset: string
    }[]>>(routesEndpoint, apiClient.fetcher)

    const [routesData, setRoutesData] = useState<{
        network: string,
        asset: string
    }[]>()

    useEffect(() => {
        if (!isLoading && routes?.data) setRoutesData(routes.data)
    }, [routes])

    if (direction === "from") {
        placeholder = "Source";
        searchHint = "Swap from";
        filteredLayers = layers.filter(l => l.status === 'active' && routesData?.some(r => r.network === l.internal_name) && l.internal_name !== filterWith?.internal_name)
        menuItems = GenerateMenuItems(filteredLayers, resolveImgSrc, direction, !!(from && lockFrom));
    }
    else {
        placeholder = "Destination";
        searchHint = "Swap to";
        filteredLayers = layers.filter(l => l.status === 'active' && routesData?.some(r => r.network === l.internal_name) && l.internal_name !== filterWith?.internal_name)
        menuItems = GenerateMenuItems(filteredLayers, resolveImgSrc, direction, !!(to && lockTo));
    }
    valueGrouper = groupByType
console.log(menuItems)
    const value = menuItems.find(x => x.id == (direction === "from" ? from : to)?.internal_name);
    const handleSelect = useCallback((item: SelectMenuItem<Layer>) => {
        setFieldValue(name, item.baseObject, true)
    }, [name])

    return (<div className="rounded-xl p-3 bg-secondary-700">
        <label htmlFor={name} className="block font-semibold text-secondary-text text-sm">
            {label}
        </label>
        <div ref={ref} className="mt-1.5 grid grid-flow-row-dense grid-cols-8 md:grid-cols-6 items-center pr-2">
            <div className="col-span-5 md:col-span-4">
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
            <div className="col-span-3 md:col-span-2 rounded-lg h-12 w-full py-2.5 ml-2 bg-secondary-600 border border-secondary-500">
                <div className="inline-flex items-start w-full h-full align-sub">
                    <CurrencyFormField direction={name} />
                </div>
            </div>
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

    groups.forEach(group => {
        group.items.sort((a, b) => a.name.localeCompare(b.name));
    });

    groups.sort((a, b) => {
        // Sort put networks first then exchanges
        return (GROUP_ORDERS[a.name] || GROUP_ORDERS.Other) - (GROUP_ORDERS[b.name] || GROUP_ORDERS.Other);
    });

    return groups;
}

function GenerateMenuItems(layers: Layer[], resolveImgSrc: (item: Layer | NetworkCurrency) => string, direction: SwapDirection, lock: boolean): SelectMenuItem<Layer>[] {

    let layerIsAvailable = () => {
        if (lock) {
            return { value: false, disabledReason: LayerDisabledReason.LockNetworkIsTrue }
        }
        else {
            return { value: true, disabledReason: null }
        }
    }

    return layers.map(l => {
        let orderProp: keyof NetworkSettings | keyof ExchangeSettings = direction == 'from' ? 'OrderInSource' : 'OrderInDestination';
        const order = (l.isExchange ?
            ExchangeSettings.KnownSettings[l.internal_name]?.[orderProp]
            : NetworkSettings.KnownSettings[l.internal_name]?.[orderProp])
        const res: SelectMenuItem<Layer> = {
            baseObject: l,
            id: l.internal_name,
            name: l.display_name,
            order: order || 100,
            imgSrc: resolveImgSrc && resolveImgSrc(l),
            isAvailable: layerIsAvailable(),
            group: getGroupName(l)
        }
        return res;
    }).sort(SortingByOrder);
}

export default NetworkFormField