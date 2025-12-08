"use client";
import { useWidgetContext } from '@/context/ConfigContext';
import { Switch } from '@/components/ui/switch';

export const LoadingButtonTrigger = () => {
    const { showLoading, updateShowLoading } = useWidgetContext();

    return (
        <div className="flex justify-between w-full items-center">
            <label>
                Preview loading
            </label>
            <Switch checked={showLoading} onCheckedChange={updateShowLoading} />
        </div>
    );
}