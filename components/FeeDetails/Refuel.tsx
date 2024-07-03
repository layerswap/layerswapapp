import ToggleButton from "../buttons/toggleButton"
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { FC, useEffect } from "react";
import { Info } from "lucide-react";
import useBalance from "../../hooks/useBalance";
import { isValidAddress } from "../../lib/address/validator";
import { useBalancesState } from "../../context/balances";
import ResizablePanel from "../ResizablePanel";

type RefuelProps = {
    onButtonClick: () => void
}

const RefuelToggle: FC<RefuelProps> = ({ onButtonClick }) => {

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();
    const { toCurrency, to, destination_address, refuel } = values

    const { fetchBalance } = useBalance()
    const { balances } = useBalancesState()

    const destinationNativeBalance = destination_address && balances[destination_address].find(b => (b.token === to?.token?.symbol) && (b.network === to.name))
    const needRefuel = toCurrency && toCurrency.refuel && to && to.token && isValidAddress(destination_address, to) && destinationNativeBalance && destinationNativeBalance?.amount < toCurrency.refuel.amount && !refuel

    useEffect(() => {

        if (toCurrency && toCurrency.refuel && to && to.token && isValidAddress(destination_address, to)) {
            (async () => {
                to.token && await fetchBalance(to, to.token, destination_address)
            })()
        }
        
    }, [to, destination_address, toCurrency])

    const handleConfirmToggleChange = (value: boolean) => {
        setFieldValue('refuel', value)
    }

    return (
        <ResizablePanel>
            <div className={`gap-4 flex relative items-center outline-none w-full text-primary-text px-3.5 py-2.5 border border-transparent transition-colors duration-200 rounded-lg ${needRefuel && ' !border-primary'}`}>
                <div className="flex items-center justify-between w-full">
                    <button type="button" onClick={() => onButtonClick()}>
                        <div className="font- flex items-center text-sm">
                            <p className="text-primary-buttonTextColor">Refuel</p>
                            <Info className="h-3.5 text-secondary-text hover:text-primary-buttonTextColor" aria-hidden="true" strokeWidth={2.5} />
                        </div>
                        {
                            needRefuel &&
                            <p className="text-secondary-text">You need to refuel</p>
                        }
                    </button>
                    <ToggleButton value={!!refuel} onChange={handleConfirmToggleChange} />
                </div>
            </div>
        </ResizablePanel>

    )
}

export default RefuelToggle