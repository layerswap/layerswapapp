import { FC } from "react";
import { NetworkCurrency } from "../../Models/CryptoNetwork";
import { Layer } from "../../Models/Layer";
import AverageCompletionTime from "../Common/AverageCompletionTime";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { Fee, useFee } from "../../context/feeContext";
import { Clock9, Fuel } from "lucide-react";
import useWindowDimensions from "../../hooks/useWindowDimensions";

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
    const { isMobile } = useWindowDimensions()

    const parsedFee = fee && parseFloat(Number(fee.walletFee).toFixed(fromCurrency?.precision))
    const currencyName = fromCurrency?.asset || " "

    return <div className="flex justify-between w-full items-center">
        <EstimatedArrival currency={selected_currency} destination={destination} fee={fee} />
        <div className="flex flex-row items-baseline justify-between gap-1 pr-1">
            <label className="inline-flex items-center text-left text-primary-text-placeholder">
                Fee
            </label>
            <div className="text-right">
                {isFeeLoading ? <div className='h-[10px] w-10 inline-flex bg-gray-500 rounded-sm animate-pulse' /> : <span>{parsedFee || 0}</span>} <span>{currencyName}</span>
            </div>
        </div>
    </div>
}

type EstimatedArrivalProps = {
    destination?: Layer | null,
    currency?: NetworkCurrency | null,
    fee: Fee
}
const EstimatedArrival: FC<EstimatedArrivalProps> = ({ fee }) => {

    return <div className="flex flex-row items-center gap-2 w-fit">
        <Clock9 className="h-4 w-4 text-secondary-text" />
        <span className="text-right text-secondary-text">
            <AverageCompletionTime hours={fee?.avgCompletionTime?.total_hours} minutes={fee?.avgCompletionTime?.total_minutes} seconds={fee.avgCompletionTime?.total_seconds} />
        </span>
    </div>
}
export default DetailedEstimates