import { FC } from "react";
import { CryptoNetwork } from "../../../Models/CryptoNetwork";
import { Currency } from "../../../Models/Currency";
import { GetExchangeFee } from "../../../lib/fees";
import { Layer } from "../../../Models/Layer";
import ClickTooltip from "../../Tooltips/ClickTooltip";
import { truncateDecimals } from "../../utils/RoundDecimals";
import { GetDefaultNetwork, GetNetworkCurrency } from "../../../helpers/settingsHelper";
import AverageCompletionTime from "../../Common/AverageCompletionTime";
import { useBalancesState } from "../../../context/balances";

type EstimatesProps = {
    networks: CryptoNetwork[]
    source?: Layer | null,
    destination?: Layer | null,
    selected_currency?: Currency | null,
    currencies: Currency[],
    fee: number
}
const DetailedEstimates: FC<EstimatesProps> = ({
    currencies,
    source,
    destination,
    selected_currency,
    fee }) => {

    const parsedFee = parseFloat(fee.toFixed(selected_currency?.precision))
    const currencyName = selected_currency?.asset || " "

    return <>
        <div className="mt-2 flex flex-row items-baseline justify-between">
            <label className="inline-flex items-center text-left text-primary-text-placeholder">
                Layerswap fee
            </label>
            <div className="text-right">
                <span>{parsedFee}</span> <span>{currencyName}</span>
            </div>
        </div>
        {
            source?.isExchange && selected_currency &&
            <ExchangeFee exchange={source} currency={selected_currency} />
        }
        {
            source
            && source?.isExchange === false
            && selected_currency &&
            <NetworkGas network={source} currencies={currencies} selected_currency={selected_currency} />
        }
        <EstimatedArrival currency={selected_currency} destination={destination} />
    </>
}
type ExchangeFeeProps = {
    exchange: Layer & { isExchange: true },
    currency: Currency,
}
const ExchangeFee: FC<ExchangeFeeProps> = ({ currency, exchange }) => {

    let exchangeFee = parseFloat(GetExchangeFee(currency.asset, exchange).toFixed(currency.precision))

    return <div className="mt-2 flex flex-row justify-between">
        <label className="flex items-center text-left grow text-primary-text-placeholder">
            <span>Exchange fee</span>
            <ClickTooltip text="Some exchanges charge a fee to cover gas fees of on-chain transfers." />
        </label>
        <span className="text-right">
            {exchangeFee === 0 ? 'Check at the exchange' : <>{exchangeFee} {currency.asset}</>}
        </span>
    </div>
}
type NetworkGasProps = {
    network: Layer & { isExchange: false },
    selected_currency: Currency,
    currencies: Currency[]
}
const NetworkGas: FC<NetworkGasProps> = ({ selected_currency, network, currencies }) => {

    const { gases, isGasLoading } = useBalancesState()
    const networkGas = network.internal_name ?
        gases?.[network.internal_name]?.find(g => g.token === selected_currency.asset)?.gas : null

    if (!networkGas)
        return <></>

    const source_native_currnecy = currencies.find(a => a.asset === network.native_currency)

    const estimatedGas = (networkGas && source_native_currnecy) ?
        truncateDecimals(networkGas, source_native_currnecy?.precision) 
        : truncateDecimals(networkGas, selected_currency?.precision)

    return <div className="mt-2 flex flex-row items-baseline justify-between">
        <label className="inline-flex items-center text-left text-primary-text-placeholder">
            Estimated gas
        </label>
        <div className="text-right flex items-center gap-1">
            {isGasLoading ? <div className='h-[10px] w-10 bg-gray-500 rounded-sm animate-pulse' /> : estimatedGas} <span>{network?.native_currency ?? selected_currency.asset}</span>
        </div>
    </div>
}
type EstimatedArrivalProps = {
    destination?: Layer | null,
    currency?: Currency | null
}
const EstimatedArrival: FC<EstimatedArrivalProps> = ({ currency, destination }) => {
    const destinationNetworkCurrency = (destination && currency) ? GetNetworkCurrency(destination, currency.asset) : null
    const destinationNetwork = GetDefaultNetwork(destination, currency?.asset)

    return <div className="mt-2 flex flex-row items-baseline justify-between">
        <label className="block text-left text-primary-text-placeholder">
            Estimated arrival
        </label>
        <span className="text-right">
            {
                destinationNetworkCurrency?.status == 'insufficient_liquidity' ?
                    <span>Up to 2 hours (delayed)</span>
                    :
                    <AverageCompletionTime time={destinationNetwork?.average_completion_time} />
            }
        </span>
    </div>
}
export default DetailedEstimates