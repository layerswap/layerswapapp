import { Switch } from "@/components/ui/switch"
import { useWidgetContext } from '@/context/ConfigContext';

export function ManageExternallyButton() {
    const { customEvmSwitch, updateCustomEvmSwitch } = useWidgetContext();

    return (
        <div className="flex items-center justify-between gap-2 w-full">
            <label>Manage wallet externally</label>
            <Switch
                id="customEvmSwitch"
                checked={customEvmSwitch}
                onCheckedChange={updateCustomEvmSwitch}
            />
        </div>
    )
}
