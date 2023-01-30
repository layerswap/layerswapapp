import ExchangeSettings from "../../lib/ExchangeSettings"
import { SwapType } from "../../lib/layerSwapApiClient"
import NetworkSettings from "../../lib/NetworkSettings"
import { SortingByOrder } from "../../lib/sorting"
import { CryptoNetwork, NetworkCurrency } from "../../Models/CryptoNetwork"
import { Exchange, ExchangeCurrency } from "../../Models/Exchange"
import { SwapFormValues } from "../DTOs/SwapFormValues"
import { SelectMenuItem } from "../Select/selectMenuItem"

type NetworkeMenuItemsParams = {
    networks: CryptoNetwork[],
    exchanges: Exchange[],
    resource_storage_url: string,
    destNetwork: string,
    lockNetwork: boolean,
    direction: "from" | "to",
    values: SwapFormValues
}

const networkCurrencyIsAvailableForExchange = (nc: NetworkCurrency, exchange: Exchange, network: CryptoNetwork, swapType: SwapType) => {

    return nc.status === "active"
        && (swapType === SwapType.OnRamp ? nc.is_withdrawal_enabled : nc.is_deposit_enabled)
        && exchange.currencies?.some(ec =>
            ec.asset === nc.asset && ec.status === "active"
            && (swapType === SwapType.OnRamp ? ec.is_deposit_enabled : ec.is_withdrawal_enabled)
        )
        && !exchange.currencies?.some(ec => ec.asset === nc.asset && ec.network === network.internal_name)
}

export const generateNetworkMenuItems = ({ values, networks, resource_storage_url, destNetwork, lockNetwork, direction, exchanges }: NetworkeMenuItemsParams): SelectMenuItem<CryptoNetwork>[] => {
    const { swapType, from, to } = values

    const currencyWithdrawalIsAvailable = ((currency: NetworkCurrency, network: CryptoNetwork) => currency.is_withdrawal_enabled
        && (network ?
            network.currencies.some(nc => nc.asset === currency.asset && nc.status === "active" && nc.is_deposit_enabled)
            : networks.some(network =>
                network.currencies.some(nc => nc.asset === currency.asset && nc.status === "active" && nc.is_deposit_enabled))))

    const currencyDepositIsAvailable = ((currency: NetworkCurrency, network: CryptoNetwork) => currency.is_deposit_enabled
        && (network ?
            network.currencies.some(nc => nc.asset === currency.asset && nc.status === "active" && nc.is_withdrawal_enabled)
            : networks.some(network =>
                network.currencies.some(nc => nc.asset === currency.asset && nc.status === "active" && nc.is_withdrawal_enabled))))

    const networkIsAvailableInOfframp = (n: CryptoNetwork) => swapType === SwapType.OffRamp
        && n.currencies.some(nc => !NetworkSettings?.ForceDisable?.[n?.internal_name]?.offramp
            && (to ? (networkCurrencyIsAvailableForExchange(nc, to.baseObject, n, swapType))
                : exchanges.some(e => networkCurrencyIsAvailableForExchange(nc, e, n, swapType))))

    const networkIsAbailableInOnramp = (n: CryptoNetwork) => swapType === SwapType.OnRamp
        && n.currencies.some(nc => !NetworkSettings?.ForceDisable?.[n?.internal_name]?.onramp
            && (from ? (networkCurrencyIsAvailableForExchange(nc, from.baseObject, n, swapType))
                : exchanges.some(e => networkCurrencyIsAvailableForExchange(nc, e, n, swapType))))


    const networkIsAvailableInCrossChain = (n: CryptoNetwork) => swapType === SwapType.CrossChain
        && n.currencies.some(nc => !NetworkSettings?.ForceDisable?.[n?.internal_name]?.crossChain
            && nc.status === "active"
            && (direction === "from" ?
                (n.internal_name !== to?.baseObject?.internal_name && currencyDepositIsAvailable(nc, to?.baseObject))
                : (n.internal_name !== from?.baseObject?.internal_name && currencyWithdrawalIsAvailable(nc, from?.baseObject))))

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
            isAvailable: n.status === "active" && (swapType === SwapType.OnRamp ? !lockNetwork : !destNetworkIsAvailable),
            isDefault: false
        })).sort(SortingByOrder);

    return menuItems;
}

type ExchangeMenuItemsProps = {
    exchanges: Exchange[],
    resource_storage_url: string
    values: SwapFormValues,
    networks: CryptoNetwork[],
}

const exchangeCurrencyIsAvailableForNetwork = ((ec: ExchangeCurrency & NetworkCurrency, network: CryptoNetwork, exchange: Exchange, swapType: SwapType) => {
    return (ec.status === "active" &&
        (swapType === SwapType.OffRamp ? ec.is_withdrawal_enabled : ec.is_deposit_enabled)
        && network.currencies?.some(nc => nc.asset === ec.asset && nc.status === "active" && (swapType === SwapType.OffRamp ? nc.is_deposit_enabled : nc.is_withdrawal_enabled))
        && !exchange.currencies.filter(c => c.asset === ec.asset).some(c => c.network === network.internal_name))
})

export const generateExchangeMenuItems = ({ exchanges, networks, values, resource_storage_url }: ExchangeMenuItemsProps): SelectMenuItem<Exchange>[] => {
    const { swapType, from, to } = values

    const menuItems: SelectMenuItem<Exchange>[] = exchanges
        .filter(e => (
            (swapType === SwapType.OffRamp ?
                e.currencies.some(ec => (from ? exchangeCurrencyIsAvailableForNetwork(ec, from.baseObject, e, swapType) : networks.some(n => exchangeCurrencyIsAvailableForNetwork(ec, n, e, swapType))))
                : e.currencies.some(ec => (to ? exchangeCurrencyIsAvailableForNetwork(ec, to.baseObject, e, swapType) : networks.some(n => exchangeCurrencyIsAvailableForNetwork(ec, n, e, swapType)))))
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