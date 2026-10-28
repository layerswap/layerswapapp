import type { NetworkRoute, NetworkRouteToken } from '@layerswap/widget-types';
import { SelectedRouteDisplay } from '@/components/Input/RoutePicker/Routes';
import PickerTriggerContent from '@/components/Pages/Deposit/_shared/PickerTriggerContent';

export function PayFromTriggerContent({
    selectedSource,
    hasMultipleOptions,
    hideDestinationPicker,
}: {
    selectedSource: { network: NetworkRoute; token: NetworkRouteToken } | null;
    hasMultipleOptions: boolean;
    hideDestinationPicker?: boolean;
}) {
    return (
        <>
            {hideDestinationPicker ? (
                <PickerTriggerContent
                    label="You send"
                    token={selectedSource?.token}
                    network={selectedSource?.network}
                    placeholder="Select source"
                    showChevron={hasMultipleOptions}
                />
            ) : (
                <SelectedRouteDisplay
                    route={selectedSource?.network}
                    token={selectedSource?.token}
                    placeholder="Select source"
                />
            )}
        </>
    );
}

export const payFromTriggerClassName = (hideDestinationPicker?: boolean) =>
    `bg-secondary-500 hover:bg-secondary-400/70 rounded-xl px-4 py-3 transition-colors ${hideDestinationPicker ? 'pr-4 rounded-2xl!' : ''}`;
