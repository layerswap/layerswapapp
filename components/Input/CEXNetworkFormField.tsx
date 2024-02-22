import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect, useState } from "react";
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
import Link from "next/link";
import { SortingByOrder } from "../../lib/sorting";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import CommandSelectWrapper from "../Select/Command/CommandSelectWrapper";
import { Layer } from "../../Models/Layer";
import { SelectMenuItemGroup } from "../Select/Command/commandSelect";

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
    const [showModal, setShowModal] = useState(false)

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
    });

    const routesEndpoint = `/routes/${direction === "from" ? "sources" : "destinations"}?${destinationRouteParams.toString()}`

    const { data: routes, isLoading } = useSWR<ApiResponse<{
        network: string,
        asset: string
    }[]>>(routesEndpoint, apiClient.fetcher)
    const routesData = routes?.data

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

    const network = (direction === 'from' ? from : to)
    const currency = (direction === 'from' ? fromCurrency : toCurrency)

    const networkImgSrc = resolveImgSrc(network);

    const menuItems = routesData
        && historicalNetworks
        && GenerateMenuItems(routesData, historicalNetworks?.data, currencyGroup, layers)
            .filter(item => layers.find(l =>
                l.internal_name === item.baseObject.network));

    const handleSelect = useCallback((item: SelectMenuItem<{ network: string, asset: string }>) => {
        if (!item) return
        const layer = layers.find(l => l.internal_name === item.baseObject.network)
        const currency = layer?.assets.find(a => a.asset === item.baseObject.asset)
        setFieldValue(name, layer, true)
        setFieldValue(`${name}Currency`, currency, false)
        setShowModal(false)
    }, [name])

    const formValue = (direction === 'from' ? from : to)

    //TODO set default currency & reset currency if not available
    const value = menuItems?.find(item =>
        item.baseObject.asset ===
        (direction === 'from' ? fromCurrency : toCurrency)?.asset
        && item.baseObject.network === formValue?.internal_name)

    //Setting default value
    useEffect(() => {
        if (!menuItems) return
        if (menuItems.length == 0) {
            setFieldValue(`${name}Currency`, null, true)
            setFieldValue('currencyGroup', null, true)
            return
        }
        else if (value || !formValue) return
    }, [routesData, historicalNetworks])

    useEffect(() => {
        if (!currencyGroup) return
        if (!menuItems) return
        if (menuItems.length == 0) {
            setFieldValue(`${direction === 'to' ? 'from' : 'to'}Currency`, null, true)
            return
        }
        else if (value) return
    }, [currencyGroup])

    return (<div className={`p-2 rounded-lg bg-secondary-700 border border-secondary-500`}>
        <label htmlFor={name} className="font-semibold flex justify-between text-secondary-text text-xs mb-1.5">
            <div className="flex space-x-1">
                <span>{direction === 'from' ? 'Withdrawal network' : 'Deposit network'}</span>
            </div>
            {
                currency?.contract_address && isValidAddress(currency.contract_address, network) && network &&
                <div className="justify-self-end space-x-1">
                    <span>Contract:</span>
                    <Link target="_blank" href={network.account_explorer_template?.replace("{0}", currency.contract_address)} className="underline hover:no-underline w-fit">
                        {shortenAddress(currency?.contract_address)}
                    </Link>
                </div>
            }
        </label>
        <CommandSelectWrapper
            disabled={(value && !value?.isAvailable?.value) || isLoading}
            valueGrouper={groupByType}
            placeholder="Network"
            setValue={handleSelect}
            value={value}
            values={menuItems!}
            searchHint=''
            isLoading={isLoading}
            isExchange={true}
            network={network}
            currency={currency}
            networkImgSrc={networkImgSrc}
        />
    </div>)
})

function GenerateMenuItems(
    items: { network: string, asset: string }[],
    historicalNetworks: { network: string, asset: string }[] | undefined,
    currencyGroup: AssetGroup | undefined,
    layers: Layer[],
): SelectMenuItem<{ network: string, asset: string }>[] {
    const menuItems = items
        .filter(i => currencyGroup?.values?.some(v => v.asset == i.asset && v.network == i.network))
        .map((e, index) => {
            const indexOf = Number(historicalNetworks
                ?.indexOf(historicalNetworks
                    .find(n => n.asset === e.asset && n.network === e.network)
                    || { network: '', asset: '' }))

            const network = layers?.find(l => l.internal_name == e.network);

            const item: SelectMenuItem<{ network: string, asset: string }> = {
                baseObject: e,
                id: index.toString(),
                name: `${e.network}_${e.asset}`,
                asset: e.asset,
                displayName: network?.display_name,
                order: indexOf > -1 ? indexOf : 100,
                imgSrc: network?.img_url || '',
                isAvailable: { value: true, disabledReason: null },
                type: 'cex',
                group: ''
            }
            return item;
        }).sort(SortingByOrder)
    const res = menuItems
    return res
}

export default CEXNetworkFormField

export function groupByType(values: SelectMenuItem<Layer>[]) {
    let groups: SelectMenuItemGroup[] = [];
    values?.forEach((v) => {
        let group = groups.find(x => x.name == v.group) || new SelectMenuItemGroup({ name: v.group, items: [] });
        group.items.push(v);
        if (!groups.find(x => x.name == v.group)) {
            groups.push(group);
        }
    });

    groups.sort((a, b) => (a.name === "All networks" ? 1 : b.name === "All networks" ? -1 : a.name.localeCompare(b.name)));
    return groups;
}