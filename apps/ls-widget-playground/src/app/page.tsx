import { HomeComponent } from '@/components/HomeComponent';
import "@layerswap/widget/index.css"
import { ConfigProvider } from "@/context/ConfigContext";
import "@/styles/globals.css";
import { GetSettings } from "@layerswap/widget";
import { SettingsProvider } from '@/context/settings';

export default async function Home() {
    const settings = await GetSettings();

    return (
        <ConfigProvider>
            <SettingsProvider data={settings}>
                <HomeComponent />
            </SettingsProvider>
        </ConfigProvider>
    );
}
