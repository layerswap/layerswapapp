import { useFormikContext } from "formik";
import { FC, useEffect, useRef } from "react";
import { Info } from "lucide-react";
import { useQuoteData } from "@/hooks/useFee";
import clsx from "clsx";
import { useBalance } from "@/lib/balances/useBalance";
import { SwapFormValues } from "../SwapFormValues";
import ToggleButton from "@/components/Buttons/toggleButton";
import { useValidationContext } from "@/context/validationContext";
import { FORM_VALIDATION_ERROR_CODES } from "@/hooks/useFormValidation";
import { Address } from "@/lib/address/Address";

type RefuelProps = {
    onButtonClick: () => void
    quote: ReturnType<typeof useQuoteData>['quote']
}

const RefuelToggle: FC<RefuelProps> = ({ onButtonClick, quote }) => {

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();
    const { toAsset: toCurrency, to, destination_address, refuel, amount } = values
    const { balances } = useBalance(destination_address, to)

    const destinationNativeBalance = destination_address && balances?.find(b => (b.token === to?.token?.symbol) && (b.network === to.name))
    const needRefuel = toCurrency && toCurrency.refuel && to && to.token && destination_address && Address.isValid(destination_address, to) && destinationNativeBalance && destinationNativeBalance?.amount == 0
    const previouslySelectedDestination = useRef(to)

    const { formValidation } = useValidationContext()

    useEffect(() => {
        if (to && previouslySelectedDestination.current !== to && !!refuel) {
            setFieldValue('refuel', false)
        }
        previouslySelectedDestination.current = to

    }, [to, destination_address, toCurrency])

    useEffect(() => {
        if (!needRefuel && refuel) {
            setFieldValue('refuel', false)
        }
    }, [needRefuel, refuel, setFieldValue])

    const handleConfirmToggleChange = (value: boolean) => {
        setFieldValue('refuel', value)
    }

    const showRefuel = needRefuel && formValidation.code !== FORM_VALIDATION_ERROR_CODES.ROUTE_NOT_FOUND

    return (
        showRefuel &&
        <div
            className={clsx("gap-4 flex relative items-center outline-hidden w-full text-primary-text px-4 py-3 bg-secondary-500 border border-transparent transition-colors duration-200 rounded-2xl mt-2", {
                "border-primary!": needRefuel && !refuel
            })}
        >
            <div className="flex justify-between w-full text-secondary-text ">
                <button className="space-y-1 mt-1 mb-0.5 navigation-refuel-button" type="button" onClick={() => onButtonClick()}>
                    <div className="flex items-center text-base space-x-1">
                        <p className="leading-4">Refuel</p>
                        <div className="p-0.5 navigation-refuel-info-icon">
                            <Info className="h-3 w-3 text-secondary-text hover:text-primary-text" aria-hidden="true" strokeWidth={2.5} />
                        </div>
                    </div>
                    {
                        needRefuel && !refuel &&
                        <p className="text-xs"><span>You need gas on</span> <span>{to.display_name}</span></p>
                    }
                    {
                        refuel && quote &&
                        <p className="text-xs"><span>You&apos;ll get </span>{quote?.refuel ? <span>~${quote.refuel.amount_in_usd}</span> : <span className="w-5 h-3 rounded animate-pulse bg-secondary-200 text-transparent" >token</span>} <span>in</span> <span>{to?.display_name}</span> <span>for gas fees</span></p>
                    }
                    {
                        refuel && !quote &&
                        <p className="text-xs">
                            <span>You&apos;ll get</span> <span>{toCurrency.refuel?.token.symbol}</span> <span>for gas fees</span>
                        </p>
                    }
                </button>
                <ToggleButton value={!!refuel} onChange={handleConfirmToggleChange} />
            </div>
        </div>
    )
}

export default RefuelToggle