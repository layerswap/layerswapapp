import { SelectProps } from '../Shared/Props/SelectProps'
import { CommandItem, CommandList, CommandWrapper } from '../../shadcn/command';
import SelectItem from '../Shared/SelectItem';

export default function PopoverSelect({ values, value, setValue }: SelectProps) {

    return (
        <CommandWrapper>
            <CommandList>
                {values.map(item =>
                    <CommandItem disabled={!item.isAvailable.value} value={item.id} key={item.id} onSelect={(currentValue) => {
                        setValue(item)
                    }}>
                        <SelectItem item={item} />
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