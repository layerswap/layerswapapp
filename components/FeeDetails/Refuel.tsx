import ToggleButton from "../buttons/toggleButton"
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { FC, useEffect, useMemo, useRef } from "react";
import { Info } from "lucide-react";
import { isValidAddress } from "../../lib/address/validator";
import ResizablePanel from "../ResizablePanel";
import useSWRBalance from "../../lib/balances/useSWRBalance";
import { useQuoteData } from "@/hooks/useFee";

type RefuelProps = {
    onButtonClick: () => void
    fee: ReturnType<typeof useQuoteData>['quote']
}

const RefuelToggle: FC<RefuelProps> = ({ onButtonClick, fee: quote }) => {

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();
    const { toAsset: toCurrency, to, destination_address, refuel } = values
    const { balances } = useSWRBalance(destination_address, to)

    const destinationNativeBalance = destination_address && balances?.find(b => (b.token === to?.token?.symbol) && (b.network === to.name))
    const needRefuel = toCurrency && toCurrency.refuel && to && to.token && isValidAddress(destination_address, to) && destinationNativeBalance && destinationNativeBalance?.amount == 0 && !refuel
    const previouslySelectedDestination = useRef(to)
    useEffect(() => {
        if (to && previouslySelectedDestination.current !== to && !!refuel) {
            setFieldValue('refuel', false)
        }
        previouslySelectedDestination.current = to

    }, [to, destination_address, toCurrency])

    const handleConfirmToggleChange = (value: boolean) => {
        setFieldValue('refuel', value)
    }

    return (
        <div className={`gap-4 flex relative items-center outline-hidden w-full text-primary-text px-4 py-3 bg-secondary-500 border border-transparent transition-colors duration-200 rounded-2xl ${needRefuel && '!border-primary'}`}>
            <div className="flex  justify-between w-full text-secondary-text ">
                <button className="space-y-1 mt-1 mb-0.5" type="button" onClick={() => onButtonClick()}>
                    <div className="flex items-center text-base space-x-1">
                        <p className="leading-4">Refuel</p>
                        <div className="p-0.5">
                            <Info className="h-3 w-3 text-secondary-text hover:text-primary-text" aria-hidden="true" strokeWidth={2.5} />
                        </div>
                    </div>
                    {
                        !needRefuel && !refuel &&
                        <p className="text-xs"><span>Get</span> <span>{to?.display_name}</span> <span>gas</span></p>
                    }
                    {
                        needRefuel && !refuel &&
                        <p className="text-xs"><span>You need gas on</span> <span>{to.display_name}</span></p>
                    }
                    {
                        refuel &&
                        <p className="text-xs"><span>You will receive </span>{quote?.refuel ? <span>${quote.refuel.amount_in_usd}</span> : <span className="w-5 h-3 rounded animate-pulse bg-secondary-200 text-transparent" >token</span>}<span> worth of {to?.token?.symbol}</span></p>
                    }
                </button>
                <ToggleButton value={!!refuel} onChange={handleConfirmToggleChange} />
            </div>
        </div>
    )
}

export default RefuelToggle