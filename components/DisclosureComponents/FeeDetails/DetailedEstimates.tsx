import { FC } from "react";
import { NetworkCurrency, NetworkType } from "../../../Models/CryptoNetwork";
import { Layer } from "../../../Models/Layer";
import { truncateDecimals } from "../../utils/RoundDecimals";
import { GetDefaultNetwork, GetNetworkCurrency } from "../../../helpers/settingsHelper";
import AverageCompletionTime from "../../Common/AverageCompletionTime";
import { useBalancesState } from "../../../context/balances";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../../DTOs/SwapFormValues";

type EstimatesProps = {
    networks: Layer[]
    source?: Layer | null,
    destination?: Layer | null,
    selected_currency?: NetworkCurrency | null,
    fee: number | undefined
}
const DetailedEstimates: FC<EstimatesProps> = ({
    source,
    destination,
    selected_currency,
    fee }) => {

    const { values } = useFormikContext<SwapFormValues>();
    const { fromCurrency } = values

    const parsedFee = fee && parseFloat(fee.toFixed(fromCurrency?.precision))
    const currencyName = fromCurrency?.asset || " "

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
            source
            && source?.isExchange === false
            && selected_currency
            && source?.type === NetworkType.EVM &&
            <NetworkGas network={source} selected_currency={selected_currency} />
        }
        <EstimatedArrival currency={selected_currency} destination={destination} />
    </>
}
type NetworkGasProps = {
    network: Layer & { isExchange: false },
    selected_currency: NetworkCurrency,
}
const NetworkGas: FC<NetworkGasProps> = ({ selected_currency, network }) => {

    const { gases, isGasLoading } = useBalancesState()
    const networkGas = network.internal_name ?
        gases?.[network.internal_name]?.find(g => g.token === selected_currency.asset)?.gas : null

    if (!networkGas)
        return <></>

    const source_native_currnecy = network.assets.find(a => a.is_native)

    const estimatedGas = (network?.type === NetworkType.EVM
        && networkGas
        && source_native_currnecy) ?
        truncateDecimals(networkGas, source_native_currnecy?.precision) : null

    return <div className="mt-2 flex flex-row items-baseline justify-between">
        <label className="inline-flex items-center text-left text-primary-text-placeholder">
            Estimated gas
        </label>
        <div className="text-right flex items-center gap-1">
            {isGasLoading ? <div className='h-[10px] w-10 bg-gray-500 rounded-sm animate-pulse' /> : estimatedGas} <span>{network?.assets.find(a => a.is_native)?.asset}</span>
        </div>
    </div>
}
type EstimatedArrivalProps = {
    destination?: Layer | null,
    currency?: NetworkCurrency | null
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
                    <AverageCompletionTime hours={destinationNetwork?.average_completion_time.total_hours} minutes={destinationNetwork?.average_completion_time.total_minutes} />
            }
        </span>
    </div>
}
export default DetailedEstimates