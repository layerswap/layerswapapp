import { HomeComponent } from '@/components/HomeComponent';
import "@layerswap/widget/index.css"
import { ConfigProvider } from "@/context/ConfigContext";
import "@/styles/globals.css";
import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient";
import { SettingsProvider } from '@/context/settings';

export default async function Home() {
    const settings = await getSettings();

    return (
        <ConfigProvider>
            <SettingsProvider data={settings}>
                <HomeComponent />
            </SettingsProvider>
        </ConfigProvider>
    );
}

export async function getSettings() {
    const apiClient = new LayerSwapApiClient();
    const { data: networkData } = await apiClient.GetLSNetworksAsync();
    const { data: sourceExchangesData } = await apiClient.GetSourceExchangesAsync();
    const { data: sourceRoutes } = await apiClient.GetRoutesAsync('sources');
    const { data: destinationRoutes } = await apiClient.GetRoutesAsync('destinations');
    if (!networkData)
        return;
    const settings = {
        networks: networkData,
        sourceExchanges: sourceExchangesData || [],
        sourceRoutes: sourceRoutes || [],
        destinationRoutes: destinationRoutes || []
    };
    return settings;
}
