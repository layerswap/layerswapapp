import { FC } from "react";
import { NetworkCurrency } from "../../../Models/CryptoNetwork";
import { Layer } from "../../../Models/Layer";
import { truncateDecimals } from "../../utils/RoundDecimals";
import AverageCompletionTime from "../../Common/AverageCompletionTime";
import { useBalancesState } from "../../../context/balances";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Fee, useFee } from "../../../context/feeContext";
import { Clock9, Fuel } from "lucide-react";

type EstimatesProps = {
    networks: Layer[]
    source?: Layer | null,
    destination?: Layer | null,
    selected_currency?: NetworkCurrency | null,
}
const DetailedEstimates: FC<EstimatesProps> = ({
    source,
    destination,
    selected_currency }) => {

    const { values } = useFormikContext<SwapFormValues>();
    const { fromCurrency } = values;
    const { fee, isFeeLoading } = useFee()

    const parsedFee = fee && parseFloat(Number(fee.walletFee).toFixed(fromCurrency?.precision))
    const currencyName = fromCurrency?.asset || " "

    return <div className="flex justify-between w-full items-center">
        <div className="flex flex-row items-baseline justify-between gap-1 pr-1">
            <label className="inline-flex items-center text-left text-primary-text-placeholder">
                Fee
            </label>
            <div className="text-right">
                {isFeeLoading ? <div className='h-[10px] w-10 inline-flex bg-gray-500 rounded-sm animate-pulse' /> : <span>{parsedFee || 0}</span>} <span>{currencyName}</span>
            </div>
        </div>
        <div>
            <EstimatedArrival currency={selected_currency} destination={destination} fee={fee} />
        </div>
    </div>
}
type NetworkGasProps = {
    network: Layer,
    selected_currency: NetworkCurrency,
}
const NetworkGas: FC<NetworkGasProps> = ({ selected_currency, network }) => {

    const { gases, isGasLoading } = useBalancesState()
    const networkGas = network.internal_name ?
        gases?.[network.internal_name]?.find(g => g.token === selected_currency.asset)?.gas : null

    if (!networkGas)
        return <></>

    const source_native_currnecy = network.assets.find(a => a.is_native)

    const estimatedGas = (networkGas && source_native_currnecy) ?
        truncateDecimals(networkGas, source_native_currnecy?.precision)
        : truncateDecimals(networkGas, selected_currency?.precision)

    return <div className="flex flex-row items-center gap-2 w-fit px-1">
        <Fuel className="h-4 w-4 text-secondary-text" />
        <div className="text-right flex items-center gap-1">
            {isGasLoading ? <div className='h-[10px] w-10 bg-gray-500 rounded-sm animate-pulse' /> : estimatedGas} <span>{network?.assets.find(a => a.is_native)?.asset ?? selected_currency.asset}</span>
        </div>
    </div>
}
type EstimatedArrivalProps = {
    destination?: Layer | null,
    currency?: NetworkCurrency | null,
    fee: Fee
}
const EstimatedArrival: FC<EstimatedArrivalProps> = ({ currency, destination, fee }) => {

    return <div className="flex flex-row items-center gap-2 w-full pl-1">
        <Clock9 className="h-4 w-4 text-secondary-text" />
        <span className="text-right">
            <AverageCompletionTime hours={fee?.avgCompletionTime?.total_hours} minutes={fee?.avgCompletionTime?.total_minutes} />
        </span>
    </div>
}
export default DetailedEstimates