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
            <div className="font- flex items-center text-secondary-text text-sm">
                <span>Refuel</span>
                <button type="button" onClick={() => onButtonClick()}>
                    <Info className="h-4 hover:text-primary-text" aria-hidden="true" strokeWidth={2.5} />
                </button>
            </div>
            <ToggleButton name="refuel" value={!!values?.refuel} onChange={handleConfirmToggleChange} />
        </div>
    </>
    )
}

export default RefuelToggle