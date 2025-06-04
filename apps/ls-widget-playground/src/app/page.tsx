import { HomeComponent } from '@/components/HomeComponent';
import "@layerswap/widget/index.css"
import { ThemeProvider, NetworkProvider } from "@/context/ConfigContext";
import "@/styles/globals.css";
import { GetSettings } from "@layerswap/widget";
import { SettingsProvider } from '@/context/settings';

export default async function Home() {
    const settings = await GetSettings();

    return (
        <ThemeProvider>
            <NetworkProvider>
                <SettingsProvider data={settings}>
                    <HomeComponent />
                </SettingsProvider>
            </NetworkProvider>
        </ThemeProvider>
    );
}
