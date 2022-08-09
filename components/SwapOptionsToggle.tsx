import { FC, useState } from "react";
import OptionToggle, { NavRadioOption } from "./OptionToggle"

const swapOptions: NavRadioOption[] = [
    { value: "onramp", displayName: 'On-ramp', isEnabled: true },
    { value: "offramp", displayName: 'Off-ramp', isEnabled: true }
];
type Props = {
    onChange: (value: string) => void
}
const SwapOptionsToggle: FC<Props> = ({ onChange }) => {
    const [swapOption, setSwapOption] = useState<string>(swapOptions[0].value);
    const handleChange = (value: string) => {
        onChange(value)
        setSwapOption(value)
    }
    return <OptionToggle items={swapOptions} label="Choose a memory option" value={swapOption} setSelected={handleChange} />
}
export default SwapOptionsToggle