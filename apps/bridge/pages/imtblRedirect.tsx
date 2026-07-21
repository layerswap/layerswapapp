import { THEME_COLORS } from "@layerswap/widget";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { useState } from "react";
import { createEVMProvider } from "@layerswap/wallets";
import { createImmutablePassportProvider, imtblPassportLoginCallback } from "@layerswap/wallets/eager/imtbl-passport";
import WidgetWrapper from "../components/WidgetWrapper";

const ImtblRedirectPage = () => {
    const [loaded, setLoaded] = useState(false)
    const { basePath } = useRouter()

    useEffect(() => {
        setLoaded(true)
    }, [])

    useEffect(() => {
        if (!loaded) return
        imtblPassportLoginCallback().catch(() => { /* swallow */ })
    }, [loaded])

    // Memoized so the widget's settings memos (keyed on `walletProviders`
    // identity) hold, and the provider factories run once instead of per
    // render. Reads `window`, so it stays empty until mounted (`loaded`).
    const walletProviders = useMemo(() => {
        if (!loaded) return []
        return [
            createEVMProvider({
                walletConnectConfigs: {
                    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
                    name: 'Layerswap',
                    description: 'Layerswap App',
                    url: 'https://layerswap.io/app/',
                    icons: ['https://www.layerswap.io/app/symbol.png']
                }
            }),
            createImmutablePassportProvider({
                imtblPassportConfig: {
                    clientId: process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID,
                    publishableKey: process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY,
                    redirectUri: basePath ? `${window.location.hostname}${basePath}/imtblRedirect` : `${window.location.hostname}/imtblRedirect`,
                    logoutRedirectUri: basePath ? `${window.location.hostname}${basePath}/` : `${window.location.hostname}/`
                }
            })
        ]
    }, [loaded, basePath])

    if (!loaded) return <div>Loading...</div>
    const themeData = THEME_COLORS['default']

    return (
        <WidgetWrapper
            themeData={themeData}
            walletProviders={walletProviders}
        >
            <div>
                <h1>Redirecting...</h1>
            </div>
        </WidgetWrapper>
    );
}

export default ImtblRedirectPage;