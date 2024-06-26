import { SelectProps } from '../Shared/Props/SelectProps'
import { CommandItem, CommandList, CommandWrapper } from '../../shadcn/command';
import SelectItem from '../Shared/SelectItem';

export default function PopoverSelect({ values, value, setValue }: SelectProps) {
    let upperValue = false;

    return (
        <CommandWrapper>
            <CommandList>
                {values.map((item, index) => {

                    const shouldGroupped = !upperValue && item.isAvailable.value && item.isAvailable.disabledReason && index !== 0;

                    if (shouldGroupped) {
                        upperValue = true;
                    }

                    return (
                        <CommandItem
                            //disabled={!item.isAvailable.value}
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
    LockNetworkIsTrue = 'LockNetworkIsTrue',
    InsufficientLiquidity = 'Temporarily disabled. Please check later.',
    InvalidRoute = 'InvalidRoute'
}