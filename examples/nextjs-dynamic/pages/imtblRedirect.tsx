import { LayerswapProvider } from "@layerswap/widget";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useState } from "react";
import { ImtblPassportProvider, ImtblRedirect } from "@layerswap/wallet-imtbl-passport";
import { EVMProvider } from "@layerswap/wallet-evm";

const ImtblRedirectPage = () => {
    const [loaded, setLoaded] = useState(false)
    const router = useRouter()

    useEffect(() => {
        setLoaded(true)
    }, [])

    if (!loaded) return <div>Loading...</div>

    const client_id = process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID!
    const publishable_key = process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY!
    const redirect_uri = router.basePath ? `${window.location.hostname}${router.basePath}/imtblRedirect` : `${window.location.hostname}/imtblRedirect`
    const logout_redirect_uri = router.basePath ? `${window.location.hostname}${router.basePath}/` : `${window.location.hostname}/`

    return (
        <LayerswapProvider
            walletProviders={[EVMProvider, ImtblPassportProvider]}
            config={{
                imtblPassport: {
                clientId: client_id,
                publishableKey: publishable_key,
                    redirectUri: redirect_uri,
                    logoutRedirectUri: logout_redirect_uri
                }
            }}
        >
            <ImtblRedirect />
        </LayerswapProvider>
    );
}

export default ImtblRedirectPage;