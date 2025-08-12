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
        <ResizablePanel>
            <div className={`gap-4 flex relative items-center outline-hidden w-full text-primary-text px-3.5 py-2.5 bg-secondary-500 border border-transparent transition-colors duration-200 rounded-2xl ${needRefuel && '!border-primary'}`}>
                <div className="flex items-center justify-between w-full">
                    <button type="button" onClick={() => onButtonClick()}>
                        <div className="font- flex items-center text-base">
                            <p className="text-primary-buttonTextColor">Refuel</p>
                            <Info className="h-3.5 text-secondary-text hover:text-primary-buttonTextColor" aria-hidden="true" strokeWidth={2.5} />
                        </div>
                        {
                            !needRefuel && !refuel &&
                            <p className="text-secondary-text text-sm"><span>You can get refuel on</span> <span>{to?.display_name}</span></p>
                        }
                        {
                            needRefuel && !refuel &&
                            <p className="text-secondary-text text-sm"><span>You need gas on</span> <span>{to.display_name}</span></p>
                        }
                        {
                            refuel &&
                            <p className="text-secondary-text text-sm"><span>You will receive </span><span>{quote?.refuel ? `$${quote.refuel.amount_in_usd}` : '-'}</span><span> worth of {to?.token?.symbol}</span></p>
                        }
                    </button>
                    <ToggleButton value={!!refuel} onChange={handleConfirmToggleChange} />
                </div>
            </div>
        </ResizablePanel>
    )
}

export default RefuelToggle