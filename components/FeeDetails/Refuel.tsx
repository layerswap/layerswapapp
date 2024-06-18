import ToggleButton from "../buttons/toggleButton"
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { FC, useEffect, useRef } from "react";
import { Info } from "lucide-react";
import { useBalancesState } from "../../context/balances";
import useBalance from "../../hooks/useBalance";
import { isValidAddress } from "../../lib/address/validator";

type RefuelProps = {
    onButtonClick: () => void
}

const RefuelToggle: FC<RefuelProps> = ({ onButtonClick }) => {

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();
    const { toCurrency, to, destination_address, refuel } = values

    const { isBalanceLoading } = useBalancesState()
    const { fetchBalance } = useBalance()

    const precviouslySelectedDestination = useRef(to)

    useEffect(() => {

        if (toCurrency && toCurrency.refuel && to && to.token && isValidAddress(destination_address, to)) {
            (async () => {
                const destinationNativeBalance = to.token && await fetchBalance(to, to.token, destination_address)

                if (destinationNativeBalance && toCurrency.refuel && destinationNativeBalance?.amount < toCurrency.refuel.amount) {
                    debugger
                    setFieldValue('refuel', true)
                    return
                }
            })()
        }
        if (to && precviouslySelectedDestination.current !== to) {
            setFieldValue('refuel', false)
        }
        precviouslySelectedDestination.current = to

    }, [to, destination_address, toCurrency])

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
            <ToggleButton value={!!refuel} onChange={handleConfirmToggleChange} />
        </div>
    </>
    )
}

export default RefuelToggle