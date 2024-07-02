import { createContext, useContext, useEffect } from "react"
import { Network } from "../Models/Network";
import { useRouter } from "next/router";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY;
const CLIENT_ID = process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID;

if (!PUBLISHABLE_KEY || !CLIENT_ID) {
    throw new Error('NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY or NEXT_PUBLIC_IMMUTABLE_CLIENT_ID is not defined');
}

export const initilizePassport = async (basePath: string) => {
    const passport = (await import('@imtbl/sdk')).passport
    const config = (await import('@imtbl/sdk')).config
    const redirectUri = basePath ? `${window.location.origin}/${basePath}/imtblRedirect` : `${window.location.origin}/imtblRedirect`
    const logoutRedirectUri = basePath ? `${window.location.origin}/${basePath}/` : `${window.location.origin}/`

    passportInstance = new passport.Passport({
        baseConfig: {
            environment: config.Environment.PRODUCTION,
            publishableKey: PUBLISHABLE_KEY,
        },
        clientId: CLIENT_ID,
        audience: 'platform_api',
        scope: 'openid offline_access email transact',
        redirectUri,
        logoutRedirectUri,
    });
}

export var passportInstance: any = undefined

export function ImtblPassportProvider({ children, from, to }: { children: JSX.Element | JSX.Element[], from: Network | undefined, to?: Network | undefined }) {
    const router = useRouter();

    useEffect(() => {
        if (from?.name.startsWith('IMMUTABLE') || to?.name.startsWith('IMMUTABLE')) {
            (async () => {
                await initilizePassport(router.basePath)
                passportInstance.connectEvm() // EIP-6963
            })()
        }
    }, [from, to])

    return (
        <>
            {children}
        </>
    )
}