import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../shadcn/select"
import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import useSWR from 'swr'
import { ApiResponse } from "../../Models/ApiResponse";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import Image from "next/image";

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
    const { layers, resolveImgSrc } = useSettingsState();

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
        if (!item) return
        const layer = layers.find(l => l.internal_name === item.baseObject.network)
        const currency = layer?.assets.find(a => a.asset === item.baseObject.asset)
        setFieldValue(name, layer, true)
        setFieldValue(`${name}Currency`, currency, true)
    }, [name])

    const value = menuItems?.find(item => item.baseObject.asset === (direction === 'from' ? fromCurrency : toCurrency)?.asset && item.baseObject.network === (direction === 'from' ? from : to)?.internal_name)

    //Setting default value
    useEffect(() => {
        if (!menuItems) return
        else if (value) return
        const item = menuItems[0]
        handleSelect(item)
    }, [routesData])

    if (!menuItems) return

    return (<div className="flex justify-between items-center w-fit gap-1">
        <label htmlFor={name} className="block text-secondary-text">
            {direction === 'from' ? 'via' : 'in'}
        </label>
        <div className="w-fit" ref={ref} >
            <Select value={value?.id} onValueChange={(v) => handleSelect(menuItems.find(m => m.id === v)!)}>
                <SelectTrigger className="w-full border-none !text-primary-text !h-fit !p-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel className="!text-primary-text">Networks</SelectLabel>
                        {
                            menuItems?.map((route, index) => {
                                const network = layers.find(l => l.internal_name === route.baseObject.network)
                                const currency = network?.assets.find(a => a.asset === route.baseObject.asset)

                                return (
                                    <SelectItem key={index} value={route.id}>
                                        <div className="flex justify-between gap-1">
                                            <div className="inline-flex items-center gap-1 w-full">
                                                <div className="flex-shrink-0 h-5 w-5 relative">
                                                    <Image
                                                        src={resolveImgSrc(network)}
                                                        alt="Network Logo"
                                                        height="40"
                                                        width="40"
                                                        loading="eager"
                                                        className="rounded-md object-contain" />
                                                </div>
                                                <p>{network?.display_name.slice(0, 3)}</p>
                                            </div>
                                            <div className="inline-flex items-center gap-1">
                                                <div className="flex-shrink-0 h-5 w-5 relative">
                                                    <Image
                                                        src={resolveImgSrc(currency)}
                                                        alt="Token Logo"
                                                        height="40"
                                                        width="40"
                                                        loading="eager"
                                                        className="rounded-md object-contain" />
                                                </div>
                                                <p>{currency?.asset}</p>
                                            </div>
                                        </div>
                                    </SelectItem>
                                )
                            })
                        }
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    </div >)
});

function GenerateMenuItems(items: { network: string, asset: string }[]): SelectMenuItem<{ network: string, asset: string }>[] {

    const menuItems = items.map((e, index) => {
        const res: SelectMenuItem<{ network: string, asset: string }> = {
            baseObject: e,
            id: index.toString(),
            name: e.network,
            order: 100,
            imgSrc: '',
            isAvailable: { value: true, disabledReason: null },
            type: 'cex',
        }
        return res;
    })

    return menuItems
}

export default CEXNetworkFormField