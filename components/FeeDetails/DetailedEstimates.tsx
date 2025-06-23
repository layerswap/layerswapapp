import { FC } from "react";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { useFee } from "../../context/feeContext";
import AverageCompletionTime from "../Common/AverageCompletionTime";

const DetailedEstimates: FC = () => {

    const { values } = useFormikContext<SwapFormValues>();
    const { fromCurrency } = values;
    const { fee, isFeeLoading } = useFee()

    const feeDiscount = fee?.quote?.fee_discount || 0;
    const feeDiscountInUsd = feeDiscount * (fee?.quote.source_token?.price_in_usd || 0);
    const fee_amount = fee?.quote.total_fee && fee.quote.total_fee - feeDiscount
    const fullFeeAmount = fee?.quote.total_fee || 0;
    const fullParsedFeeAmount = fullFeeAmount && parseFloat(Number(fullFeeAmount).toFixed(fromCurrency?.precision))

    const parsedFee = fee && parseFloat(Number(fee_amount).toFixed(fromCurrency?.precision))
    const currencyName = fromCurrency?.symbol || " "
    const feeAmountInUsd = fee?.quote.total_fee_in_usd && (fee?.quote.total_fee_in_usd - feeDiscountInUsd)

    const displayFeeInUsd = feeAmountInUsd ? (feeAmountInUsd < 0.01 ? '<$0.01' : `$${feeAmountInUsd?.toFixed(2)}`) : null

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
                    {isFeeLoading ? (
                        <div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-sm animate-pulse' />
                    ) : (
                        <div>
                            {
                                feeDiscount > 0 ?
                                    <span className="ml-1">
                                        <span className="line-through">
                                            <span>{fullParsedFeeAmount || '-'}</span> <span>{fee_amount == 0 ? currencyName : ''}</span>
                                        </span>
                                        <span className="ml-1">
                                            <span>{fee_amount && fee_amount > 0 ? parsedFee : 'Free'}</span> <span>{fee_amount && fee_amount > 0 ? currencyName : ''}</span>
                                        </span>
                                    </span>
                                    :
                                    <span>{parsedFee || '-'} </span>
                            }
                            <span>{(parsedFee && !feeDiscount) ? currencyName : ''}</span>
                            {displayFeeInUsd !== undefined && fee_amount ? (
                                <span className="text-xs ml-1 font-medium">
                                    ({displayFeeInUsd})
                                </span>
                            )
                                : null
                            }
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
}

export default DetailedEstimates