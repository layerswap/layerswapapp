import { SelectProps } from '../Shared/Props/SelectProps'
import { CommandItem, CommandList, CommandWrapper } from '../../shadcn/command';
import SelectItem from '../Shared/SelectItem';

export default function PopoverSelect({ values, value, setValue }: SelectProps) {
    let upperValue = false;

    return (
        <CommandWrapper>
            <CommandList>
                {values.map(item => {
                    const shouldGroupped = !upperValue && item.isAvailable.value && item.isAvailable.disabledReason;

                    if (shouldGroupped) {
                        upperValue = true;
                    }

                    return (
                        <CommandItem
                            className={`${shouldGroupped ? 'border-t border-t-slate-500' : ''}`}
                            disabled={!item.isAvailable.value}
                            value={item.id}
                            key={item.id}
                            onSelect={() => {
                                setValue(item);
                            }}
                        >
                            <SelectItem item={item} />
                        </CommandItem>
                    );
                })}
            </CommandList>
        </CommandWrapper>
    )
}

export enum LayerDisabledReason {
    LockNetworkIsTrue = '',
    InsufficientLiquidity = 'Temporarily disabled. Please check later.'
}