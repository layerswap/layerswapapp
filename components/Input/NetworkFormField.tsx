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
import { Exchange } from "../../Models/Exchange";
import CurrencyGroupFormField from "./CEXCurrencyFormField";

type SwapDirection = "from" | "to";
type Props = {
    direction: SwapDirection,
    label: string,
}
const GROUP_ORDERS = { "Popular": 1, "New": 2, "Fiat": 3, "Networks": 4, "Exchanges": 5, "Other": 10 };
const getGroupName = (value: Layer | Exchange, type: 'cex' | 'layer') => {

    if (value.is_featured) {
        return "Popular";
    }
    else if (new Date(value.created_date).getTime() >= (new Date().getTime() - 2629800000)) {
        return "New";
    }
    else if (type === 'layer') {
        return "Networks";

    }
    else if (type === 'cex') {
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

    const { from, to, fromCurrency, toCurrency, fromExchange, toExchange, currencyGroup } = values
    const { lockFrom, lockTo } = useQueryState()

    const { resolveImgSrc, layers, exchanges } = useSettingsState();

    let placeholder = "";
    let searchHint = "";
    let filteredLayers: Layer[];
    let menuItems: SelectMenuItem<Layer | Exchange>[];

    let valueGrouper: (values: ISelectMenuItem[]) => SelectMenuItemGroup[];

    const filterWith = direction === "from" ? to : from
    const filterWithAsset = direction === "from" ? toCurrency?.asset : fromCurrency?.asset

    const filterWithExchange = direction === 'from' ? toExchange : fromExchange

    const apiClient = new LayerSwapApiClient()
    const version = LayerSwapApiClient.apiVersion

    const routesEndpoint = `/routes/${direction === "from" ? "sources" : "destinations"}${(filterWith && filterWithAsset) ?
        `?${direction === 'to' ? 'source_network' : 'destination_network'}=${filterWith.internal_name}&${direction === 'to' ? 'source_asset' : 'destination_asset'}=${filterWithAsset}&` :
        (filterWithExchange && currencyGroup) ? `?${direction === 'from' ? 'destination_asset_group' : 'source_asset_group'}=${currencyGroup.name}&` : "?"}version=${version}`

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
        menuItems = GenerateMenuItems(filteredLayers, toExchange ? [] : exchanges, resolveImgSrc, direction, !!(from && lockFrom));
    }
    else {
        placeholder = "Destination";
        searchHint = "Swap to";
        filteredLayers = layers.filter(l => l.status === 'active' && routesData?.some(r => r.network === l.internal_name) && l.internal_name !== filterWith?.internal_name)
        menuItems = GenerateMenuItems(filteredLayers, fromExchange ? [] : exchanges, resolveImgSrc, direction, !!(to && lockTo));
    }
    valueGrouper = groupByType

    const value = menuItems.find(x => x.type === 'layer' ?
        x.id == (direction === "from" ? from : to)?.internal_name :
        x.id == (direction === 'from' ? fromExchange : toExchange)?.internal_name);

    const handleSelect = useCallback((item: SelectMenuItem<Layer | Exchange>) => {
        if (item.type === 'cex') {
            setFieldValue(`${name}Exchange`, item.baseObject, true)
            setFieldValue(name, null, true)
        } else {
            setFieldValue(`${name}Exchange`, null, true)
            setFieldValue(name, item.baseObject, true)
        }
    }, [name])

    return (<div className="rounded-xl p-3 bg-secondary-700">
        <label htmlFor={name} className="block font-semibold text-secondary-text text-xs">
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
            <div className="col-span-3 md:col-span-2 w-full ml-2">
                {
                    value?.type === 'cex' ?
                        <CurrencyGroupFormField direction={name} />
                        :
                        <CurrencyFormField direction={name} />
                }
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

function GenerateMenuItems(layers: Layer[], exchanges: Exchange[], resolveImgSrc: (item: Layer | Exchange | NetworkCurrency) => string, direction: SwapDirection, lock: boolean): SelectMenuItem<Layer | Exchange>[] {

    let layerIsAvailable = () => {
        if (lock) {
            return { value: false, disabledReason: LayerDisabledReason.LockNetworkIsTrue }
        }
        else {
            return { value: true, disabledReason: null }
        }
    }

    const mappedLayers = layers.map(l => {
        let orderProp: keyof NetworkSettings | keyof ExchangeSettings = direction == 'from' ? 'OrderInSource' : 'OrderInDestination';
        const order = NetworkSettings.KnownSettings[l.internal_name]?.[orderProp]
        const res: SelectMenuItem<Layer> = {
            baseObject: l,
            id: l.internal_name,
            name: l.display_name,
            order: order || 100,
            imgSrc: resolveImgSrc && resolveImgSrc(l),
            isAvailable: layerIsAvailable(),
            type: 'layer',
            group: getGroupName(l, 'layer')
        }
        return res;
    }).sort(SortingByOrder);

    const mappedExchanges = exchanges.map(e => {
        let orderProp: keyof ExchangeSettings = direction == 'from' ? 'OrderInSource' : 'OrderInDestination';
        const order = ExchangeSettings.KnownSettings[e.internal_name]?.[orderProp]
        const res: SelectMenuItem<Exchange> = {
            baseObject: e,
            id: e.internal_name,
            name: e.display_name,
            order: order || 100,
            imgSrc: resolveImgSrc && resolveImgSrc(e),
            isAvailable: layerIsAvailable(),
            type: 'cex',
            group: getGroupName(e, 'cex')
        }
        return res;
    }).sort(SortingByOrder);

    const items = [...mappedExchanges, ...mappedLayers]

    return items
}

export default NetworkFormField