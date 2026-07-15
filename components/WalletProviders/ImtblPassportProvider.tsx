import { useEffect } from "react"
import { useRouter } from "next/router";
import type { Auth } from "@imtbl/auth";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY;
const CLIENT_ID = process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID;
const IS_SANDBOX = PUBLISHABLE_KEY?.includes('pk_imapik-test') === true;

export let authInstance: Auth | undefined = undefined

export const initializeImtblAuth = async (basePath: string) => {
    if (authInstance || !CLIENT_ID) return

    const { Auth } = await import('@imtbl/auth')
    const redirectUri = basePath ? `${window.location.origin}${basePath}/imtblRedirect` : `${window.location.origin}/imtblRedirect`
    const logoutRedirectUri = basePath ? `${window.location.origin}${basePath}/` : `${window.location.origin}/`
    const passportDomain = IS_SANDBOX ? 'https://passport.sandbox.immutable.com' : 'https://passport.immutable.com'

    authInstance = new Auth({
        clientId: CLIENT_ID,
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

export function ImtblPassportProvider({ children }: { children: JSX.Element | JSX.Element[] }) {
    const router = useRouter();

    useEffect(() => {
        if (evmConnected || !CLIENT_ID) return
        evmConnected = true;
        (async () => {
            await initializeImtblAuth(router.basePath)
            const { connectWallet, IMMUTABLE_ZKEVM_MAINNET_CHAIN, IMMUTABLE_ZKEVM_TESTNET_CHAIN } = await import('@imtbl/wallet')
            const selectedChain = IS_SANDBOX ? IMMUTABLE_ZKEVM_TESTNET_CHAIN : IMMUTABLE_ZKEVM_MAINNET_CHAIN
            await connectWallet({
                clientId: CLIENT_ID,
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
    }, [])

    return (
        <>
            {children}
        </>
    )
}
