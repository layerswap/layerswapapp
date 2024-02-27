import ToggleButton from "../buttons/toggleButton"
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { FC } from "react";
import { Info } from "lucide-react";

type RefuelProps = {
    onButtonClick: () => void
}

const RefuelToggle: FC<RefuelProps> = ({ onButtonClick }) => {

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

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