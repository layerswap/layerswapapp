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
import CommandSelectWrapper from "../Select/Command/CommandSelectWrapper";
import { Layer } from "../../Models/Layer";
import { SelectMenuItemGroup } from "../Select/Command/commandSelect";
import { LayerDisabledReason } from "../Select/Popover/PopoverSelect";
import { Info } from "lucide-react";

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

    const { layers } = useSettingsState();
    const filterWith = direction === "from" ? to : from
    const filterWithAsset = direction === "from" ? toCurrency?.symbol : fromCurrency?.symbol

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
                        : filterWith.name,
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
            ? `historical_sources?source_exchange=${fromExchange?.name}`
            :
            `historical_destinations?destination_exchange=${toExchange?.name}`}&version=${version}`)

    const { data: historicalNetworks } = useSWR<ApiResponse<{
        network: string,
        asset: string
    }[]>>(historicalNetworksEndpoint, apiClient.fetcher)

    const network = (direction === 'from' ? from : to)
    const currency = (direction === 'from' ? fromCurrency : toCurrency)

    const menuItems = routesData
        && historicalNetworks
        && GenerateMenuItems(routesData, historicalNetworks?.data, currencyGroup, layers)
            .filter(item => layers.find(l =>
                l.name === item.baseObject.network));

    const handleSelect = useCallback((item: SelectMenuItem<{ network: string, asset: string }>) => {
        if (!item) return
        const layer = layers.find(l => l.name === item.baseObject.network)
        const currency = layer?.tokens.find(a => a.symbol === item.baseObject.asset)
        setFieldValue(name, layer, true)
        setFieldValue(`${name}Currency`, currency, false)
        setShowModal(false)
    }, [name])

    const formValue = (direction === 'from' ? from : to)

    //TODO set default currency & reset currency if not available
    const value = menuItems?.find(item =>
        item.baseObject.asset ===
        (direction === 'from' ? fromCurrency : toCurrency)?.symbol
        && item.baseObject.network === formValue?.name)

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

    const valueDetails = <>
        <div className="flex">{network?.display_name}</div>
        <div className="text-primary-text-placeholder inline-flex items-center justify-self-end gap-1">
            ({currency?.symbol})
        </div>
    </>

    const networkDetails = <div>
        {
            value?.isAvailable.disabledReason === LayerDisabledReason.LockNetworkIsTrue &&
            <div className='text-xs text-left text-secondary-text mb-2'>
                <Info className='h-3 w-3 inline-block mb-0.5' /><span>&nbsp;You&apos;re accessing Layerswap from a partner&apos;s page. In case you want to transact with other networks, please open layerswap.io in a separate tab.</span>
            </div>
        }
        <div className="relative z-20 mb-3 ml-3 text-primary-buttonTextColor text-sm">
            <p className="text-sm mt-2 flex space-x-1">
                <span>Please make sure that the exchange supports the token and network you select here.</span>
            </p>
        </div>
    </div>

    return (<div className={`p-2 rounded-lg bg-secondary-700 border border-secondary-500`}>
        <label htmlFor={name} className="font-semibold flex justify-between text-secondary-text text-xs mb-1.5">
            <div className="flex space-x-1">
                <span>{direction === 'from' ? 'Withdrawal network' : 'Deposit network'}</span>
            </div>
            {
                currency?.contract && isValidAddress(currency.contract, network) && network &&
                <div className="justify-self-end space-x-1">
                    <span>Contract:</span>
                    <Link target="_blank" href={network.account_explorer_template?.replace("{0}", currency.contract)} className="underline text-primary-buttonTextColor hover:no-underline w-fit">
                        {shortenAddress(currency?.contract)}
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
            modalHeight="80%"
            valueDetails={valueDetails}
            modalContent={networkDetails}
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

            const network = layers?.find(l => l.name == e.network);

            const item: SelectMenuItem<{ network: string, asset: string }> = {
                baseObject: e,
                id: index.toString(),
                name: `${e.network}_${e.asset}`,
                displayName: network?.display_name,
                order: indexOf > -1 ? indexOf : 100,
                imgSrc: network?.logo || '',
                isAvailable: { value: true, disabledReason: null },
                group: '',
                details: e.asset
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