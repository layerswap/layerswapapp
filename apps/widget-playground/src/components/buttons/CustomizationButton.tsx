"use client";
import { useWidgetContext } from '@/context/ConfigContext';
import { Switch } from '@/components/ui/switch';

const ToggleRow = ({ label, checked, onCheckedChange }: { label: string, checked: boolean, onCheckedChange: (checked: boolean) => void }) => {
    return (
        <div className="my-2 rounded-xl py-3 px-1 bg-secondary-500 flex items-center justify-between gap-2">
            <label className="text-sm">{label}</label>
            <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    );
};

export function CustomizationButton() {
    const { themeData, updateTheme } = useWidgetContext();

    const handleHeaderChange = (key: 'hideMenu' | 'hideTabs' | 'hideWallets', value: boolean) => {
        updateTheme('header', {
            ...themeData?.header,
            [key]: value,
        });
    };

    const handleHidePoweredByChange = (value: boolean) => {
        updateTheme('hidePoweredBy', value);
    };

    return (
        <div className="my-1 rounded-xl p-1 bg-secondary-600">
            <ToggleRow
                label="Hide Menu"
                checked={themeData?.header?.hideMenu ?? false}
                onCheckedChange={(val) => handleHeaderChange('hideMenu', val)}
            />
            <ToggleRow
                label="Hide Tabs"
                checked={themeData?.header?.hideTabs ?? false}
                onCheckedChange={(val) => handleHeaderChange('hideTabs', val)}
            />
            <ToggleRow
                label="Hide Wallets"
                checked={themeData?.header?.hideWallets ?? false}
                onCheckedChange={(val) => handleHeaderChange('hideWallets', val)}
            />
            <ToggleRow
                label="Hide Powered By"
                checked={themeData?.hidePoweredBy ?? false}
                onCheckedChange={handleHidePoweredByChange}
            />
        </div>
    );
}

export const CustomizationButtonTrigger = () => {
    return (
        <div className="flex justify-between w-full">
            <label>
                Customization
            </label>
        </div>
    );
}