import { FC } from "react";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { useFee } from "../../context/feeContext";
import AverageCompletionTime from "../Common/AverageCompletionTime";

const DetailedEstimates: FC = () => {

    const { values } = useFormikContext<SwapFormValues>();
    const { fromCurrency, fromExchange } = values;
    const { fee, isFeeLoading } = useFee()

    const fee_amount = fee?.quote.total_fee

    const parsedFee = fee && parseFloat(Number(fee_amount).toFixed(fromCurrency?.precision))
    const currencyName = fromCurrency?.symbol || " "
    const feeAmountInUsd = parsedFee && fromCurrency ? (fromCurrency?.price_in_usd * parsedFee).toFixed(2) : undefined

    return <div className="flex flex-col w-full gap-2">
        {
            fee && fee.quote.avg_completion_time !== '00:00:00' ?
                <div className="flex justify-between w-full items-center">
                    <div className="flex items-baseline w-full justify-between gap-1">
                        <label className="inline-flex items-center text-left text-primary-buttonTextColor">
                            Estimated time
                        </label>
                        <div className="text-right text-secondary-text">
                            <AverageCompletionTime avgCompletionTime={fee.quote.avg_completion_time} />
                        </div>
                    </div>
                </div>
                :
                <></>
        }
        <div className="flex justify-between w-full items-center">
            <div className="flex items-baseline w-full justify-between gap-1">
                <label className="inline-flex items-center text-left text-primary-buttonTextColor">
                    Fee
                </label>
                <div className="text-right text-secondary-text ">
                    {isFeeLoading ? <div className='h-[10px] w-10 inline-flex bg-gray-500 rounded-sm animate-pulse' /> : <span>{parsedFee || '-'}</span>} <span>{parsedFee ? currencyName : ''}</span>
                    {
                        feeAmountInUsd !== undefined && Number(feeAmountInUsd) > 0 &&
                        <span className="text-xs ml-1 font-medium">
                            (${feeAmountInUsd})
                        </span>
                    }
                </div>
            </div>
        </div>
    </div>
}

export default DetailedEstimates