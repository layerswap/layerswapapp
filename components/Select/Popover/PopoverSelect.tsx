import { SelectProps } from '../Shared/Props/SelectProps'
import { CommandItem, CommandList, CommandWrapper } from '../../shadcn/command';
import SelectItem from '../Shared/SelectItem';

export default function PopoverSelect({ values, value, setValue }: SelectProps) {
    console.log(values, "values")

    return (
        <CommandWrapper>
            <CommandList>
                {values.map(item => {
                    const filteredItems = values.filter(item => item.isAvailable.value && item.isAvailable.disabledReason);

                    const upperItem = filteredItems.reduce((maxItem, currentItem) => {
                        return Number(currentItem.order) > Number(maxItem.order) ? currentItem : maxItem;
                    }, filteredItems[0]).id === item.id;
                    
                    return (
                        <CommandItem disabled={!item.isAvailable.value} value={item.id} key={item.id} onSelect={() => {
                            setValue(item)
                        }}>
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