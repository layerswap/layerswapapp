import ToggleButton from "../buttons/toggleButton"
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { FC, useEffect } from "react";
import { Info } from "lucide-react";
import { useBalancesState } from "../../context/balances";

type RefuelProps = {
    onButtonClick: () => void
}

const RefuelToggle: FC<RefuelProps> = ({ onButtonClick }) => {

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();
    const { balances } = useBalancesState()
    const destinationNativeBalance = values?.destination_address ? balances[values?.destination_address]?.find(b => b?.network === values?.to?.name && b?.token === values?.to?.token?.symbol) : undefined

    useEffect(() => {
        if (values.toCurrency?.refuel && destinationNativeBalance && destinationNativeBalance?.amount < values.toCurrency.refuel.amount) {
            setFieldValue('refuel', true)
        } else {
            setFieldValue('refuel', false)
        }
    }, [destinationNativeBalance])

    const handleConfirmToggleChange = (value: boolean) => {
        setFieldValue('refuel', value)
    }

    return (<>
        <div className="flex items-center justify-between w-full">

            <button type="button" onClick={() => onButtonClick()}>
                <div className="font- flex items-center text-sm">
                    <span className="text-primary-buttonTextColor">Refuel</span>
                    <Info className="h-3.5 text-secondary-text hover:text-primary-buttonTextColor" aria-hidden="true" strokeWidth={2.5} />
                </div>
            </button>
            <ToggleButton name="refuel" value={!!values?.refuel} onChange={handleConfirmToggleChange} />
        </div>
    </>
    )
}

export default RefuelToggle