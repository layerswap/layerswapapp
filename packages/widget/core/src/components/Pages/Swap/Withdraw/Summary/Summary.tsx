import { useInitialSettings } from '@/context/settings';
import LayerSwapApiClient from '@/lib/apiClients/layerSwapApiClient';
import type { ApiResponse } from '@/Models/ApiResponse';
import type { Partner } from '@/Models/Partner';
import { useUsdModeStore } from '@/stores/usdModeStore';
import useSWR from 'swr';
import SummaryView, { type SwapInfoProps } from '../Presentation/SummaryView';

export default function Summary(props: SwapInfoProps) {
    const { hideFrom, hideTo, account, appName } = useInitialSettings();
    const isUsdMode = useUsdModeStore((s) => s.isUsdMode);
    const api = new LayerSwapApiClient();
    const { data } = useSWR<ApiResponse<Partner>>(
        appName && `/internal/apps?name=${appName}`,
        api.fetcher,
    );
    return (
        <SummaryView
            {...props}
            isUsdMode={isUsdMode}
            source={
                hideFrom && account && data?.data
                    ? data.data
                    : props.swap.source_network
            }
            destination={
                hideTo && account && data?.data
                    ? data.data
                    : props.swap.destination_network
            }
        />
    );
}
