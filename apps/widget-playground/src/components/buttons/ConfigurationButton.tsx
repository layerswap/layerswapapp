"use client";
import { useWidgetContext } from '@/context/ConfigContext';
import { Switch } from '@/components/ui/switch';

const ToggleRow = ({ label, checked, onCheckedChange }: { label: string, checked: boolean, onCheckedChange: (checked: boolean) => void }) => {
    return (
        <div className="my-1 rounded-xl p-3 flex items-center justify-between gap-2 bg-secondary-600 hover:bg-secondary-500 transition-colors">
            <span>{label}</span>
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
        <div>
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