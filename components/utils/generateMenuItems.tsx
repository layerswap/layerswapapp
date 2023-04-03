import ExchangeSettings from "../../lib/ExchangeSettings"
import { SwapType } from "../../lib/layerSwapApiClient"
import NetworkSettings from "../../lib/NetworkSettings"
import { SortingByOrder } from "../../lib/sorting"
import { CryptoNetwork, NetworkCurrency } from "../../Models/CryptoNetwork"
import { Exchange, ExchangeCurrency } from "../../Models/Exchange"
import { SwapFormValues } from "../DTOs/SwapFormValues"
import { DisabledReason } from "../Select/Select"
import { SelectMenuItem } from "../Select/selectMenuItem"

type NetworkeMenuItemsParams = {
    networks: CryptoNetwork[],
    exchanges: Exchange[],
    resource_storage_url: string,
    destNetwork: string,
    source: string,
    destination: string,
    lockNetwork: boolean,
    direction: "from" | "to",
    values: SwapFormValues
}

const networkCurrencyIsAvailableForExchange = (nc: NetworkCurrency, exchange: Exchange, network: CryptoNetwork, swapType: SwapType) => {
    return (nc.status === "insufficient_liquidity" || nc.status === "active")
        && (swapType === SwapType.OnRamp ? nc.is_withdrawal_enabled : nc.is_deposit_enabled)
        && exchange.currencies?.some(ec =>
            ec.asset === nc.asset
            && (swapType === SwapType.OnRamp ?
                ((ec.status === "active" || ec.status === "insufficient_liquidity") && ec.is_deposit_enabled)
                : (ec.status === "active" && ec.is_withdrawal_enabled))
        )
        && !exchange.currencies?.some(ec => ec.asset === nc.asset && ec.is_default && ec.network === network.internal_name)
}

export const generateNetworkMenuItems = ({ values, networks, resource_storage_url, destNetwork, lockNetwork, direction, exchanges, source, destination }: NetworkeMenuItemsParams): SelectMenuItem<CryptoNetwork>[] => {
    const { swapType, from, to } = values

    const currencyWithdrawalIsAvailable = ((currency: NetworkCurrency, network: CryptoNetwork) => currency.is_withdrawal_enabled
        && (network ?
            network.currencies.some(nc => nc.asset === currency.asset && (nc.status === "active" || nc.status === "insufficient_liquidity") && nc.is_deposit_enabled)
            : networks.some(network =>
                network.currencies.some(nc => nc.asset === currency.asset && (nc.status === "active" || nc.status === "insufficient_liquidity") && nc.is_deposit_enabled))))

    const currencyDepositIsAvailable = ((currency: NetworkCurrency, network: CryptoNetwork) => currency.is_deposit_enabled
        && (currency.status === "active" || currency?.status === "insufficient_liquidity")
        && (network ?
            network.currencies.some(nc => nc.asset === currency.asset && nc.status === "active" && nc.is_withdrawal_enabled)
            : networks.some(network =>
                network.currencies.some(nc => nc.asset === currency.asset && nc.status === "active" && nc.is_withdrawal_enabled))))

    const networkIsAvailableInOfframp = (n: CryptoNetwork) => swapType === SwapType.OffRamp
        && n.currencies.some(nc => !NetworkSettings?.ForceDisable?.[n?.internal_name]?.offramp
            && (to ? (networkCurrencyIsAvailableForExchange(nc, to.baseObject, n, swapType))
                : exchanges.some(e => networkCurrencyIsAvailableForExchange(nc, e, n, swapType))))

    const networkIsAvailableInOnramp = (n: CryptoNetwork) => swapType === SwapType.OnRamp
        && n.currencies.some(nc => !NetworkSettings?.ForceDisable?.[n?.internal_name]?.onramp
            && (from ? (networkCurrencyIsAvailableForExchange(nc, from.baseObject, n, swapType))
                : exchanges.some(e => networkCurrencyIsAvailableForExchange(nc, e, n, swapType))))


    const networkIsAvailableInCrossChain = (n: CryptoNetwork) => swapType === SwapType.CrossChain
        && n.currencies.some(nc => !NetworkSettings?.ForceDisable?.[n?.internal_name]?.crossChain
            && (direction === "from" ?
                (n.internal_name !== to?.baseObject?.internal_name && currencyDepositIsAvailable(nc, to?.baseObject))
                : (n.internal_name !== from?.baseObject?.internal_name && currencyWithdrawalIsAvailable(nc, from?.baseObject))))

    let networkIsAvailable: (n: CryptoNetwork) => boolean;
    switch (swapType) {
        case SwapType.OnRamp:
            networkIsAvailable = networkIsAvailableInOnramp
            break;
        case SwapType.OffRamp:
            networkIsAvailable = networkIsAvailableInOfframp
            break;
        case SwapType.CrossChain:
            networkIsAvailable = networkIsAvailableInCrossChain
            break;
    }
    const destNetworkIsAvailable = networks.some(n => (n.internal_name?.toLowerCase() === destNetwork?.toLowerCase() || n.internal_name?.toLowerCase() === (direction === 'from' ? source : destination)) && n.status === "active" && networkIsAvailable(n))
    const shouldLockAllNetworks = destNetworkIsAvailable && lockNetwork;
    const networkDisabledReason = (network: CryptoNetwork) => {
        if (shouldLockAllNetworks) return { value: false, disabledReason: DisabledReason.LockNetworkIsTrue }
        else if (!(direction === 'from' ? (network.status === 'active' || network?.status === 'insufficient_liquidity') : (network?.status == "active"))) return { value: false, disabledReason: DisabledReason.InsufficientLiquidity }
        else return { value: true, disabledReason: null }
    }

    const menuItems: SelectMenuItem<CryptoNetwork>[] = networks
        .filter(networkIsAvailable)
        .map(n => ({
            baseObject: n,
            id: n.internal_name,
            name: n.display_name,
            order: NetworkSettings.KnownSettings[n.internal_name]?.Order ?? 69,
            imgSrc: `${resource_storage_url}/layerswap/networks/${n.internal_name.toLowerCase()}.png`,
            isAvailable: networkDisabledReason(n),
            isDefault: false
        })).sort(SortingByOrder);

    return menuItems;
}

type ExchangeMenuItemsProps = {
    exchanges: Exchange[],
    resource_storage_url: string
    values: SwapFormValues,
    networks: CryptoNetwork[],
    sourceExchangeName: string,
    source: string,
    destination: string,
    lockExchange: boolean
}

const exchangeCurrencyIsAvailableForNetwork = ((ec: ExchangeCurrency & NetworkCurrency, network: CryptoNetwork, exchange: Exchange, swapType: SwapType) => {
    return (
        (swapType === SwapType.OffRamp ? (ec.is_withdrawal_enabled && ec.status === "active") : (ec.is_deposit_enabled && (ec.status === "active" || ec.status === "insufficient_liquidity")))
        && network.currencies?.some(nc => nc.asset === ec.asset && (swapType === SwapType.OffRamp ? (nc.status === "active" || nc.status === "insufficient_liquidity") : nc.status === "active") && (swapType === SwapType.OffRamp ? nc.is_deposit_enabled : nc.is_withdrawal_enabled))
        && !exchange.currencies.filter(c => c.asset === ec.asset && c.is_default).some(c => c.network === network.internal_name))
})

export const generateExchangeMenuItems = ({ exchanges, networks, values, resource_storage_url, sourceExchangeName, source, destination, lockExchange }: ExchangeMenuItemsProps): SelectMenuItem<Exchange>[] => {
    const { swapType, from, to } = values
    const isSourceExchangeAvailable = exchanges.some(e => (e?.internal_name?.toLowerCase() === sourceExchangeName?.toLowerCase() || e?.internal_name?.toLowerCase() === source?.toLowerCase() || e?.internal_name?.toLowerCase() === destination?.toLowerCase()) && e.status === "active" && (swapType === SwapType.OffRamp ?
        e.currencies.some(ec => (from ? exchangeCurrencyIsAvailableForNetwork(ec, from.baseObject, e, swapType) : networks.some(n => exchangeCurrencyIsAvailableForNetwork(ec, n, e, swapType))))
        : e.currencies.some(ec => (to ? exchangeCurrencyIsAvailableForNetwork(ec, to.baseObject, e, swapType) : networks.some(n => exchangeCurrencyIsAvailableForNetwork(ec, n, e, swapType)))))
    )

    const exchangeDisabledReason = (exchange: Exchange) => {
        if (((swapType === SwapType.OnRamp ?
            (lockExchange || ExchangeSettings?.ForceDisable?.[exchange?.internal_name]?.onramp) :
            (isSourceExchangeAvailable || ExchangeSettings?.ForceDisable?.[exchange?.internal_name]?.offramp)))
        ) return { value: false, disabledReason: DisabledReason.LockNetworkIsTrue }
        if (!exchange.currencies.some(ec => networks.some(n => n.internal_name === ec.network && (swapType === SwapType.OnRamp ? n.status === 'active' : (n.status === "active" || n.status === "insufficient_liquidity"))))
        ) return { value: false, disabledReason: DisabledReason.InsufficientLiquidity }
        else return { value: true, disabledReason: null }
    }

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
            isAvailable: exchangeDisabledReason(e),
            isDefault: false
        })).sort(SortingByOrder);

    return menuItems;
}