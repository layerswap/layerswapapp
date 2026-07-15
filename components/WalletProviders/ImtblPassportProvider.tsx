import { useEffect } from "react"
import { useRouter } from "next/router";
import type { Auth } from "@imtbl/auth";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY;
const CLIENT_ID = process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID;

export let authInstance: Auth | undefined = undefined

export const initializeImtblAuth = async (basePath: string) => {
    if (authInstance || !CLIENT_ID) return

    const { Auth } = await import('@imtbl/auth')
    const redirectUri = basePath ? `${window.location.origin}${basePath}/imtblRedirect` : `${window.location.origin}/imtblRedirect`
    const logoutRedirectUri = basePath ? `${window.location.origin}${basePath}/` : `${window.location.origin}/`

    authInstance = new Auth({
        clientId: CLIENT_ID,
        redirectUri,
        popupRedirectUri: redirectUri,
        logoutRedirectUri,
        logoutMode: 'silent',
        audience: 'platform_api',
        scope: 'openid offline_access email transact',
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
            const { connectWallet, IMMUTABLE_ZKEVM_MAINNET_CHAIN_ID, IMMUTABLE_ZKEVM_TESTNET_CHAIN_ID } = await import('@imtbl/wallet')
            const isSandbox = PUBLISHABLE_KEY?.includes('pk_imapik-test')
            await connectWallet({
                clientId: CLIENT_ID,
                initialChainId: isSandbox ? IMMUTABLE_ZKEVM_TESTNET_CHAIN_ID : IMMUTABLE_ZKEVM_MAINNET_CHAIN_ID,
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
