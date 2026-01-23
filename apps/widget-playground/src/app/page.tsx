import { HomeComponent } from '@/components/HomeComponent';
import "@layerswap/widget/index.css"
import { ConfigProvider } from "@/context/ConfigContext";
import "@/styles/globals.css";
import { SettingsProvider } from '@/context/settings';
import { getSettings } from '@layerswap/widget';

export default async function Home() {
    const apiKey = process.env.NEXT_PUBLIC_API_KEY
    const settings = await getSettings(apiKey)
    return (
        <ConfigProvider>
            <SettingsProvider data={settings}>
                <HomeComponent />
            </SettingsProvider>
        </ConfigProvider>
    );
}