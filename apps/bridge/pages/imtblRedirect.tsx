import { THEME_COLORS } from "@layerswap/widget";
import { KnownWalletIcon, LayerSwapLogoSmall } from "@layerswap/widget/internal";
import { Link2Off } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { useState } from "react";
import { createEVMProvider } from "@layerswap/wallets";
import { createImmutablePassportProvider, imtblPassportLoginCallback } from "@layerswap/wallets/eager/imtbl-passport";
import WidgetWrapper from "../components/WidgetWrapper";

const ImtblRedirectPage = () => {
    const [loaded, setLoaded] = useState(false)
    const [hasError, setHasError] = useState(false)
    const { basePath } = useRouter()

    useEffect(() => {
        setLoaded(true)
    }, [])

    useEffect(() => {
        if (!loaded) return
        imtblPassportLoginCallback().catch(() => {
            // Popup flow: hand the failure back to the opener so it can close
            // this window and surface the error; standalone flow: show it here.
            if (window.opener && window.opener !== window) {
                window.opener.postMessage(
                    { source: "oidc-client", url: window.location.href, keepOpen: false },
                    window.location.origin
                )
            } else {
                setHasError(true)
            }
        })
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
            <div className="min-h-[300px] h-full w-full flex flex-col items-center justify-center gap-5 p-6 text-primary-text bg-gradient-to-b from-secondary-900 to-secondary-500">
                <div className="flex items-center gap-2">
                    <div className="p-3 bg-secondary-700 rounded-lg">
                        <LayerSwapLogoSmall className="w-11 h-auto" />
                    </div>
                    {hasError
                        ? <Link2Off className="w-5 h-5 text-secondary-text" />
                        : <div className="loader text-[3px]!" />
                    }
                    <div className="p-3 bg-secondary-700 rounded-lg">
                        <KnownWalletIcon id="com.immutable.passport" className="w-11 h-auto" />
                    </div>
                </div>
                <div className="text-center max-w-xs">
                    {hasError ? (
                        <>
                            <p className="text-base font-medium text-primary-text">Couldn&apos;t complete sign in</p>
                            <p className="text-sm font-normal text-secondary-text mt-1">Please close this window and try connecting again.</p>
                        </>
                    ) : (
                        <>
                            <p className="text-base font-medium text-primary-text">Completing sign in</p>
                            <p className="text-sm font-normal text-secondary-text mt-1">Securely connecting your Immutable Passport. This window will close automatically.</p>
                        </>
                    )}
                </div>
            </div>
        </WidgetWrapper>
    );
}

export default ImtblRedirectPage;
