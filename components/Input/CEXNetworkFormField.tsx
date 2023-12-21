import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../shadcn/select"
import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import useSWR from 'swr'
import { ApiResponse } from "../../Models/ApiResponse";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";

type SwapDirection = "from" | "to";
type Props = {
    direction: SwapDirection,
}

const CEXNetworkFormField = forwardRef(function CEXNetworkFormField({ direction }: Props, ref: any) {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const name = direction

    const { from, to, fromCurrency, toCurrency } = values
    const { layers } = useSettingsState();

    const filterWith = direction === "from" ? to : from
    const filterWithAsset = direction === "from" ? toCurrency?.asset : fromCurrency?.asset

    const apiClient = new LayerSwapApiClient()
    const version = LayerSwapApiClient.apiVersion

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

    const menuItems = routesData && GenerateMenuItems(routesData);

    const handleSelect = useCallback((item: SelectMenuItem<{ network: string, asset: string }>) => {
        const layer = layers.find(l => l.internal_name === item.baseObject.network)
        const currency = layer?.assets.find(a => a.asset === item.baseObject.asset)
        setFieldValue(name, layer, true)
        setFieldValue(`${name}Currency`, currency, true)
    }, [name])

    if (!menuItems) return

    return (<div className="rounded-lg border border-secondary-500 flex justify-between items-center px-4 py-3 bg-secondary-700">
        <label htmlFor={name} className="block font-semibold text-secondary-text text-sm">
            {direction === 'from' ? 'Transfer via' : 'Receive in'}
        </label>
        <div ref={ref} className="mt-1.5 items-center pr-2">
            <Select onValueChange={(v) => handleSelect(menuItems.find(m => m.id === v)!)} defaultValue={menuItems[0].id}>
                <SelectTrigger className="w-fit border-none !text-primary-text !font-semibold !h-fit !p-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel className="!text-primary-text">Networks</SelectLabel>
                        {
                            menuItems?.map((route, index) => {
                                return (
                                    <SelectItem key={index} value={route.id}>
                                        <div className="flex items-center gap-1">
                                            <p>{route.baseObject.asset}</p>
                                            <p>{route.baseObject.network}</p>
                                        </div>
                                    </SelectItem>
                                )
                            })
                        }
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    </div>)
});

function GenerateMenuItems(items: { network: string, asset: string }[]): SelectMenuItem<{ network: string, asset: string }>[] {

    const menuItems = items.map((e, index) => {
        const res: SelectMenuItem<{ network: string, asset: string }> = {
            baseObject: e,
            id: index.toString(),
            name: e.network,
            order: 100,
            imgSrc: '',
            isAvailable: { value: false, disabledReason: null },
            type: 'cex',
        }
        return res;
    })

    return menuItems
}

export default CEXNetworkFormField
