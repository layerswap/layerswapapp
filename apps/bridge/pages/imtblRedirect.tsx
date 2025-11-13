import { LayerswapProvider, THEME_COLORS } from "@layerswap/widget";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useState } from "react";
import { createEVMProvider, createImmutablePassportProvider, ImtblRedirect } from "@layerswap/wallets";

const ImtblRedirectPage = () => {
    const [loaded, setLoaded] = useState(false)
    const { basePath } = useRouter()

    useEffect(() => {
        setLoaded(true)
    }, [])

    if (!loaded) return <div>Loading...</div>

    const client_id = process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID
    const publishable_key = process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY
    const redirect_uri = basePath ? `${window.location.hostname}${basePath}/imtblRedirect` : `${window.location.hostname}/imtblRedirect`
    const logout_redirect_uri = basePath ? `${window.location.hostname}${basePath}/` : `${window.location.hostname}/`

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
                clientId: client_id,
                publishableKey: publishable_key,
                redirectUri: redirect_uri,
                logoutRedirectUri: logout_redirect_uri
            }
        })
    ]

    return (
        <LayerswapProvider
            config={{
                theme: { ...themeData, borderRadius: 'default', enablePortal: true, enableWideVersion: true, hidePoweredBy: true }
            }}
            walletProviders={walletProviders}
        >
            <ImtblRedirect />
        </LayerswapProvider>
    );
}

export default ImtblRedirectPage;