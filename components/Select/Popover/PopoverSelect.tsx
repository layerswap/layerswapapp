import { SelectProps } from '../Shared/Props/SelectProps'
import { CommandItem, CommandList, CommandWrapper } from '../../shadcn/command';
import SelectItem from '../Shared/SelectItem';

export default function PopoverSelect({ values, value, setValue, direction }: SelectProps) {
    console.log(values,"values")
    return (
        <CommandWrapper>
            <CommandList>
                {values.map(item =>
                    <CommandItem className={`${item.isAvailable.value && !item.isAvailable.disabledReason ? "border-b border-gray-300" : ""}`} disabled={!item.isAvailable.value} value={item.id} key={item.id} onSelect={() => {
                        setValue(item)
                    }}>
                        <SelectItem item={item} direction={direction} />
                    </CommandItem>)
                }
            </CommandList>
        </CommandWrapper>
    )
}

export enum LayerDisabledReason {
    LockNetworkIsTrue = '',
    InsufficientLiquidity = 'Temporarily disabled. Please check later.'
}