"use client";
import { useWidgetContext } from '@/context/ConfigContext';
import { Switch } from '@/components/ui/switch';

const ToggleRow = ({ label, checked, onCheckedChange }: { label: string, checked: boolean, onCheckedChange: (checked: boolean) => void }) => {
    return (
        <div className="rounded-md py-3 px-2 flex items-center justify-between gap-2 hover:bg-secondary-500 transition-colors duration-200">
            <span className="text-xl leading-6 text-primary-text">{label}</span>
            <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    );
};

export function ConfigurationButton() {
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
        <div className="flex flex-col gap-3 pb-1">
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

export const ConfigurationButtonTrigger = () => {
    return (
        <div className="flex justify-between w-full">
            <label>
                Configuration
            </label>
        </div>
    );
}