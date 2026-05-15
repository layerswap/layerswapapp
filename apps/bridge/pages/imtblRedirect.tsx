import { THEME_COLORS } from "@layerswap/widget";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { createEVMShell, createImmutablePassportShell, ImtblRedirect } from "@layerswap/wallets";
import WidgetWrapper from "../components/WidgetWrapper";

const ImtblRedirectPage = () => {
    const [loaded, setLoaded] = useState(false)
    const { basePath } = useRouter()

    useEffect(() => {
        setLoaded(true)
    }, [])

    // Build the shells inside a useMemo to keep their identity stable —
    // each shell wraps state internally (wagmi config etc.), so a new
    // instance every render would cause unnecessary remounts.
    const shells = useMemo(() => {
        if (!loaded) return null
        const EVMShell = createEVMShell({
            walletConnectConfigs: {
                projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
                name: 'Layerswap',
                description: 'Layerswap App',
                url: 'https://layerswap.io/app/',
                icons: ['https://www.layerswap.io/app/symbol.png']
            }
        })
        const ImmutablePassportShell = createImmutablePassportShell({
            imtblPassportConfig: {
                clientId: process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID,
                publishableKey: process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY,
                redirectUri: basePath ? `${window.location.hostname}${basePath}/imtblRedirect` : `${window.location.hostname}/imtblRedirect`,
                logoutRedirectUri: basePath ? `${window.location.hostname}${basePath}/` : `${window.location.hostname}/`,
            }
        })
        return { EVMShell, ImmutablePassportShell }
    }, [loaded, basePath])

    if (!loaded || !shells) return <div>Loading...</div>
    const themeData = THEME_COLORS['default']

    const { EVMShell, ImmutablePassportShell } = shells

    return (
        <WidgetWrapper themeData={themeData}>
            <EVMShell>
                <ImmutablePassportShell>
                    <ImtblRedirect />
                </ImmutablePassportShell>
            </EVMShell>
        </WidgetWrapper>
    );
}

export default ImtblRedirectPage;
