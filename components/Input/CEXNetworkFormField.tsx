import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect } from "react";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import useSWR from 'swr'
import { ApiResponse } from "../../Models/ApiResponse";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import shortenAddress from "../utils/ShortenAddress";
import Link from "next/link";
import { SortingByOrder } from "../../lib/sorting";
import CommandSelectWrapper from "../Select/Command/CommandSelectWrapper";
import { LayerDisabledReason } from "../Select/Popover/PopoverSelect";
import { Info } from "lucide-react";
import { NetworkWithTokens, RouteNetwork } from "../../Models/Network";
import { ExchangeNetwork } from "../../Models/Exchange";
import { isValidAddress } from "../../lib/address/validator";

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

    const apiClient = new LayerSwapApiClient()

    const routesEndpoint = `/${direction === "from" ? `exchange_source_networks?destination_token_group=${currencyGroup?.symbol}&include_unmatched=true` : `exchange_destination_networks?source_token_group=${currencyGroup?.symbol}&include_unmatched=true`}`

    const { data: routes, isLoading: isRoutesLoading } = useSWR<ApiResponse<RouteNetwork[]>>(`${routesEndpoint}`, apiClient.fetcher, { keepPreviousData: true })
    const routesData = routes?.data

    const exchangeNetworksEndpoint =
        ((fromExchange && to && toCurrency) || (toExchange && from && fromCurrency))
        && (`/${direction === 'from' ?
            `exchange_withdrawal_networks?source_exchange=${fromExchange?.name}&&source_token_group=${currencyGroup?.symbol}&destination_network=${to?.name}&destination_token=${toCurrency?.symbol}`
            : `exchange_deposit_networks?destination_exchange=${toExchange?.name}&destination_token_group=${currencyGroup?.symbol}&source_network=${from?.name}&source_token=${fromCurrency?.symbol}`}`)

    const { data: historicalNetworks, isLoading: isHistoricalNetworsLoading } = useSWR<ApiResponse<ExchangeNetwork[]>>(exchangeNetworksEndpoint, apiClient.fetcher, { keepPreviousData: true })

    const network = (direction === 'from' ? from : to)
    const currency = (direction === 'from' ? fromCurrency : toCurrency)

    const menuItems = historicalNetworks?.data && routesData
        && GenerateMenuItems(historicalNetworks.data, routes?.data)
            .filter(item => routes?.data?.find(l =>
                l.name === item.baseObject.network.name));

    const handleSelect = useCallback((item: SelectMenuItem<ExchangeNetwork>) => {
        if (!item) return
        const route = routes?.data?.find(l => l.name === item.baseObject.network.name)
        const currency = route?.tokens.find(a => a.symbol === item.baseObject.token.symbol)
        setFieldValue(name, route, true)
        setFieldValue(`${name}Currency`, currency, false)
    }, [name, routes])

    const formValue = (direction === 'from' ? from : to)

    //TODO set default currency & reset currency if not available
    const value = menuItems?.find(item =>
        item.baseObject.token.symbol ===
        (direction === 'from' ? fromCurrency : toCurrency)?.symbol
        && item.baseObject.network.name === formValue?.name)

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
            disabled={(value && !value?.isAvailable?.value) || isRoutesLoading}
            valueGrouper={groupByType}
            placeholder="Network"
            setValue={handleSelect}
            value={value}
            values={menuItems!}
            searchHint=''
            isLoading={isRoutesLoading || isHistoricalNetworsLoading}
            modalHeight="80%"
            valueDetails={valueDetails}
            modalContent={networkDetails}
            key={value?.id}
        />
    </div>)
})

function GenerateMenuItems(
    historicalNetworks: ExchangeNetwork[],
    routes: NetworkWithTokens[] | undefined,
): SelectMenuItem<ExchangeNetwork>[] {
    const menuItems = historicalNetworks.map((e, index) => {
        // const indexOf = Number(historicalNetworks
        //     ?.indexOf(historicalNetworks
        //         .find(n => n.asset === e.asset && n.network === e.network)
        //         || { network: '', asset: '' }))

        const network = routes?.find(l => l.name == e.network.name);
        const details = <p className="text-primary-text-muted">
            {e.token.symbol}
        </p>

        const item: SelectMenuItem<ExchangeNetwork> = {
            baseObject: e,
            id: index.toString(),
            name: `${e.network.name}_${e.token.symbol}`,
            displayName: network?.display_name,
            order: 1,
            imgSrc: network?.logo || '',
            isAvailable: { value: true, disabledReason: null },
            details
        }
        return item;
    }).sort(SortingByOrder)
    const res = menuItems
    return res
}

export default CEXNetworkFormField

export function groupByType(values: SelectMenuItem<NetworkWithTokens>[]) {
    return [{ name: "", items: values }];
}