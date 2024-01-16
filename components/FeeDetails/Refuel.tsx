import ClickTooltip from "../Tooltips/ClickTooltip"
import ToggleButton from "../buttons/toggleButton"
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { useQueryState } from "../../context/query";

const RefuelToggle = () => {

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();
    const { to: destination } = values
    const destination_native_currency = destination?.assets.find(c => c.is_native)?.asset

    const handleConfirmToggleChange = (value: boolean) => {
        setFieldValue('refuel', value)
    }

    return (
        <div className="flex items-center justify-between w-full">
            <div className="font- flex items-center text-primary-text-placeholder text-sm">
                <span>Refuel</span>
                <ClickTooltip text={`You will get a small amount of ${destination_native_currency} that you can use to pay for gas fees.`} />
            </div>
            <ToggleButton name="refuel" value={!!values?.refuel} onChange={handleConfirmToggleChange} />
        </div>
    )
}

export default RefuelToggle