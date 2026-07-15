import { useEffect, useState, ReactNode } from "react"
import type { Auth } from "@imtbl/auth";
import { ImtblPassportIcon, LayerSwapLogoSmall } from "@layerswap/widget/internal";
import { Link2Off } from "lucide-react";
import { ImtblPassportConfig } from "./index";

export let authInstance: Auth | undefined = undefined

export const initializeImtblAuth = async (configs: ImtblPassportConfig | undefined) => {

    const { publishableKey, clientId, redirectUri, logoutRedirectUri } = configs || {};

    if (authInstance || !clientId || !redirectUri || !logoutRedirectUri) return

    const { Auth } = await import('@imtbl/auth')
    const isSandbox = publishableKey?.includes('pk_imapik-test') === true
    const passportDomain = isSandbox ? 'https://passport.sandbox.immutable.com' : 'https://passport.immutable.com'

    authInstance = new Auth({
        clientId,
        redirectUri,
        popupRedirectUri: redirectUri,
        logoutRedirectUri,
        logoutMode: 'silent',
        audience: 'platform_api',
        scope: 'openid offline_access email transact',
        authenticationDomain: 'https://auth.immutable.com',
        passportDomain,
    })
}

let evmConnected = false

type ImtblPassportProviderWrapperProps = {
    children: ReactNode
    imtblPassportConfig?: ImtblPassportConfig
}

export function ImtblPassportProviderWrapper({ children, imtblPassportConfig }: ImtblPassportProviderWrapperProps) {

    useEffect(() => {
        const clientId = imtblPassportConfig?.clientId
        if (evmConnected || !clientId) return
        evmConnected = true;
        (async () => {
            await initializeImtblAuth(imtblPassportConfig)
            const { connectWallet, IMMUTABLE_ZKEVM_MAINNET_CHAIN, IMMUTABLE_ZKEVM_TESTNET_CHAIN } = await import('@imtbl/wallet')
            const isSandbox = imtblPassportConfig?.publishableKey?.includes('pk_imapik-test') === true
            const selectedChain = isSandbox ? IMMUTABLE_ZKEVM_TESTNET_CHAIN : IMMUTABLE_ZKEVM_MAINNET_CHAIN
            await connectWallet({
                clientId,
                chains: [selectedChain],
                initialChainId: selectedChain.chainId,
                getUser: async (forceRefresh, options) => {
                    if (!authInstance) return null
                    if (forceRefresh) return authInstance.forceUserRefresh()
                    if (options?.silent) return authInstance.getUser()
                    return authInstance.getUserOrLogin()
                },
                announceProvider: true, // EIP-6963
            })
        })()
    }, [imtblPassportConfig])

    return (
        <>
            {children}
        </>
    )
}

export const ImtblRedirect = ({ imtblPassportConfig }: { imtblPassportConfig?: ImtblPassportConfig }) => {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                if (!authInstance) await initializeImtblAuth(imtblPassportConfig)
                await authInstance?.loginCallback();
            } catch {
                if (window.opener && window.opener !== window) {
                    window.opener.postMessage(
                        { source: "oidc-client", url: window.location.href, keepOpen: false },
                        window.location.origin
                    );
                } else {
                    setHasError(true);
                }
            }
        })()
    }, [imtblPassportConfig])

    return (
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
                    <ImtblPassportIcon className="w-11 h-auto" />
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
    );
}
