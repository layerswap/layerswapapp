import { THEME_COLORS } from "@layerswap/widget";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useState } from "react";
import { createEVMProvider, createImmutablePassportProvider, ImtblRedirect } from "@layerswap/wallets";
import WidgetWrapper from "../components/WidgetWrapper";

const ImtblRedirectPage = () => {
    const [loaded, setLoaded] = useState(false)
    const { basePath } = useRouter()

    useEffect(() => {
        setLoaded(true)
    }, [])

    if (!loaded) return <div>Loading...</div>
    const themeData = THEME_COLORS['default']

    const walletProviders = [
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

    return (
        <WidgetWrapper
            themeData={themeData}
            walletProviders={walletProviders}
        >
            <ImtblRedirect />
        </WidgetWrapper>
    );
}

export default ImtblRedirectPage;