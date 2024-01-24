import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../shadcn/select"
import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import useSWR from 'swr'
import { ApiResponse } from "../../Models/ApiResponse";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import Image from "next/image";
import { AssetGroup } from "./CEXCurrencyFormField";
import { isValidAddress } from "../../lib/addressValidator";
import shortenAddress from "../utils/ShortenAddress";

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

    const {
        from,
        to,
        fromCurrency,
        toCurrency,
        fromExchange,
        toExchange,
        currencyGroup
    } = values
    const { layers, resolveImgSrc } = useSettingsState();

    const filterWith = direction === "from" ? to : from
    const filterWithAsset = direction === "from" ? toCurrency?.asset : fromCurrency?.asset

    const apiClient = new LayerSwapApiClient()
    const version = LayerSwapApiClient.apiVersion

    const destinationRouteParams = new URLSearchParams({
        version,
        ...(filterWith && filterWithAsset
            ? (
                {
                    [direction === 'to'
                        ? 'source_network'
                        : 'destination_network']
                        : filterWith.internal_name,
                    [direction === 'to'
                        ? 'source_asset'
                        : 'destination_asset']
                        : filterWithAsset
                }) : {}),
        ...(filterWithAsset ? ({}) : {})
    });

    const routesEndpoint = `/routes/${direction === "from" ? "sources" : "destinations"}?${destinationRouteParams.toString()}`

    const { data: routes, isLoading } = useSWR<ApiResponse<{
        network: string,
        asset: string
    }[]>>(routesEndpoint, apiClient.fetcher)
    const routesData = routes?.data
    // const [routesData, setRoutesData] = useState<{
    //     network: string,
    //     asset: string
    // }[]>()

    // useEffect(() => {
    //     if (!isLoading && routes?.data) setRoutesData(routes.data)
    // }, [routes])

    const historicalNetworksEndpoint =
        (fromExchange || toExchange)
        && (`/exchanges/${direction === 'from'
            ? `historical_sources?source_exchange=${fromExchange?.internal_name}`
            :
            `historical_destinations?destination_exchange=${toExchange?.internal_name}`}&version=${version}`)

    const { data: historicalNetworks } = useSWR<ApiResponse<{
        network: string,
        asset: string
    }[]>>(historicalNetworksEndpoint, apiClient.fetcher)

    const menuItems = routesData
        && historicalNetworks
        && GenerateMenuItems(routesData, historicalNetworks?.data, currencyGroup)
            .filter(item => layers.find(l =>
                l.internal_name === item.baseObject.network));

    const handleSelect = useCallback((item: SelectMenuItem<{ network: string, asset: string }>) => {
        if (!item) return
        const layer = layers.find(l => l.internal_name === item.baseObject.network)
        const currency = layer?.assets.find(a => a.asset === item.baseObject.asset)
        setFieldValue(name, layer, true)
        setFieldValue(`${name}Currency`, currency, true)
    }, [name])

    //TODO set default currancy & reset currancy if not available
    const value = menuItems?.find(item =>
        item.baseObject.asset ===
        (direction === 'from' ? fromCurrency : toCurrency)?.asset
        && item.baseObject.network === (direction === 'from' ? from : to)
            ?.internal_name)

    //Setting default value
    useEffect(() => {
        if (!menuItems) return
        if (menuItems.length == 0) {
            setFieldValue(name, null, true)
            setFieldValue(`${name}Currency`, null, true)
            setFieldValue('currencyGroup', null, true)
            return
        }
        else if (value) return
        const item = menuItems[0]
        handleSelect(item)
    }, [routesData, historicalNetworks])

    useEffect(() => {
        if (!menuItems) return
        else if (value) return
        const item = menuItems[0]
        handleSelect(item)
    }, [currencyGroup])

    if (!menuItems) return

    return (<div className=" flex justify-between items-center w-full">
        <label htmlFor={name} className="block text-secondary-text">
            {direction === 'from' ? 'Transfer via' : 'Receive in'}
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
                            menuItems.sort((a, b) => a.order - b.order)?.map((route, index) => {
                                const network = layers.find(l => l.internal_name === route.baseObject.network)
                                const currency = network?.assets.find(a => a.asset === route.baseObject.asset)

                                return (
                                    <SelectItem key={index} value={route.id}>
                                        <div className="flex justify-between gap-1 grow w-full">
                                            <div className="justify-between grow w-full">
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
                                                    <p>{network?.display_name}</p>
                                                </div>
                                            </div>
                                            <div className="inline-flex items-center justify-self-end gap-1">
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
                                        {
                                            currency?.is_native &&
                                            <span className="text-xs text-secondary-text flex items-center leading-3">
                                                Native currancy
                                            </span>
                                        }
                                        {currency?.contract_address && isValidAddress(currency.contract_address, network) &&
                                            <span className="text-xs text-secondary-text flex items-center leading-3">
                                                {shortenAddress(currency?.contract_address)}
                                            </span>
                                        }
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

function GenerateMenuItems(
    items: { network: string, asset: string }[],
    historicalNetworks: { network: string, asset: string }[] | undefined,
    currencyGroup: AssetGroup | undefined
): SelectMenuItem<{ network: string, asset: string }>[] {

    const menuItems = items.filter(i => i.asset === currencyGroup?.name).map((e, index) => {
        const order = historicalNetworks?.indexOf(historicalNetworks.find(n => n.asset === e.asset && n.network === e.network) || { network: '', asset: '' }) || 100
        const item: SelectMenuItem<{ network: string, asset: string }> = {
            baseObject: e,
            id: index.toString(),
            name: e.network,
            order: order > 0 ? order : 100,
            imgSrc: '',
            isAvailable: { value: true, disabledReason: null },
            type: 'cex',
        }
        return item;
    })

    return menuItems
}

export default CEXNetworkFormField