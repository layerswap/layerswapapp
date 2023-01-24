import ExchangeSettings from "../../lib/ExchangeSettings"
import { SwapType } from "../../lib/layerSwapApiClient"
import NetworkSettings from "../../lib/NetworkSettings"
import { SortingByOrder } from "../../lib/sorting"
import { CryptoNetwork, NetworkCurrency } from "../../Models/CryptoNetwork"
import { Exchange } from "../../Models/Exchange"
import { SwapFormValues } from "../DTOs/SwapFormValues"
import { SelectMenuItem } from "../Select/selectMenuItem"

type NetworkeMenuItemsParams = {
    networks: CryptoNetwork[],
    resource_storage_url: string,
    destNetwork: string,
    lockNetwork: boolean,
    direction: "from" | "to",
    values: SwapFormValues
}


export const generateNetworkMenuItems = ({ values, networks, resource_storage_url, destNetwork, lockNetwork, direction }: NetworkeMenuItemsParams): SelectMenuItem<CryptoNetwork>[] => {
    const  { swapType, from, to } = values

    const currencyWithdrawalIsAvailable = ((currency: NetworkCurrency, network: CryptoNetwork) => currency.is_withdrawal_enabled && (!network || network.currencies.some(nc => nc.asset === currency.asset && nc.status === "active" && nc.is_deposit_enabled)))
    const currencyDepositIsAvailable = ((currency: NetworkCurrency, network: CryptoNetwork) => currency.is_deposit_enabled && (!network || network.currencies.some(nc => nc.asset === currency.asset && nc.status === "active" && nc.is_withdrawal_enabled)))
    const networkIsAvailableInOfframp = (n: CryptoNetwork) => n.currencies.some(nc => !NetworkSettings?.ForceDisable?.[n?.internal_name]?.offramp && nc.status === "active" && nc.is_deposit_enabled && (!to || to?.baseObject?.currencies?.some(ec => ec.asset === nc.asset && ec.status === "active" && ec.is_withdrawal_enabled)))
    const networkIsAbailableInOnramp = (n: CryptoNetwork) => n.currencies.some(nc => !NetworkSettings?.ForceDisable?.[n?.internal_name]?.onramp && nc.status === "active" && nc.is_withdrawal_enabled && (!from || from?.baseObject?.currencies?.some(ec => ec.asset === nc.asset && ec.status === "active" && ec.is_deposit_enabled)))
    const networkIsAvailableInCrossChain = (n: CryptoNetwork) => n.currencies.some(nc => swapType === SwapType.CrossChain && !NetworkSettings?.ForceDisable?.[n?.internal_name]?.crossChain && nc.status === "active" && (direction === "from" ? (currencyWithdrawalIsAvailable(nc, to?.baseObject)) : currencyDepositIsAvailable(nc, from?.baseObject)))

    let networkIsAvailable;
    switch (swapType) {
        case SwapType.OnRamp:
            networkIsAvailable = networkIsAbailableInOnramp
            break;
        case SwapType.OffRamp:
            networkIsAvailable = networkIsAvailableInOfframp
            break;
        case SwapType.CrossChain:
            networkIsAvailable = networkIsAvailableInCrossChain
            break;
    }

    const destNetworkIsAvailable = networks.some(n => n.internal_name === destNetwork && n.status === "active" && networkIsAvailable(n))

    const menuItems: SelectMenuItem<CryptoNetwork>[] = networks
        .filter(networkIsAvailable)
        .map(n => ({
            baseObject: n,
            id: n.internal_name,
            name: n.display_name,
            order: NetworkSettings.KnownSettings[n.internal_name]?.Order,
            imgSrc: `${resource_storage_url}/layerswap/networks/${n.internal_name.toLowerCase()}.png`,
            isAvailable: n.status === "active" && (swapType === SwapType.OffRamp ? !destNetworkIsAvailable : !lockNetwork),
            isDefault: false
        })).sort(SortingByOrder);

    return menuItems;
}

type ExchangeMenuItemsProps = {
    exchanges: Exchange[],
    resource_storage_url: string
    values: SwapFormValues
}

export const generateExchangeMenuItems = ({ exchanges, values: { swapType, from, to }, resource_storage_url }: ExchangeMenuItemsProps): SelectMenuItem<Exchange>[] => {
    const menuItems: SelectMenuItem<Exchange>[] = exchanges
        .filter(e => (
            (swapType === SwapType.OffRamp ?
                e.currencies.some(ec => ec.status === "active" && ec.is_withdrawal_enabled && (!from || from?.baseObject?.currencies?.some(nc => nc.asset === ec.asset && nc.status === "active" && nc.is_deposit_enabled && ec.network != from?.baseObject?.internal_name)))
                : e.currencies.some(ec => ec.status === "active" && ec.is_deposit_enabled && (!to || to?.baseObject?.currencies?.some(nc => nc.asset === ec.asset && nc.status === "active" && nc.is_withdrawal_enabled && ec.network != to?.baseObject?.internal_name))))
        ))
        .map(e => ({
            baseObject: e,
            id: e.internal_name,
            name: e.display_name,
            order: ExchangeSettings.KnownSettings[e.internal_name]?.Order,
            imgSrc: `${resource_storage_url}/layerswap/networks/${e.internal_name.toLowerCase()}.png`,
            isAvailable: true,
            isDefault: false
        })).sort(SortingByOrder);

    return menuItems;
}