import { AppSettings } from "@layerswap/widget/internal";
import { useEffect, ReactNode } from "react"

export const initilizePassport = async (configs: typeof AppSettings.ImtblPassportConfig) => {

    const { publishableKey, clientId, redirectUri, logoutRedirectUri } = configs || {};

    const passport = (await import('@imtbl/sdk')).passport
    const config = (await import('@imtbl/sdk')).config

    if (publishableKey && clientId && redirectUri && logoutRedirectUri) {
        passportInstance = new passport.Passport({
            baseConfig: {
                environment: config.Environment.PRODUCTION,
                publishableKey: publishableKey,
            },
            clientId: clientId,
            audience: 'platform_api',
            scope: 'openid offline_access email transact',
            redirectUri,
            logoutRedirectUri,
            logoutMode: 'silent',
        });
    }
}

export var passportInstance: any = undefined

export function ImtblPassportProviderWrapper({ children }: { children: ReactNode }) {

    useEffect(() => {
        if (!passportInstance) {
            (async () => {
                await initilizePassport(AppSettings.ImtblPassportConfig)
                passportInstance.connectEvm() // EIP-6963
            })()
        }
    }, [passportInstance])

    return (
        <>
            {children}
        </>
    )
}

export const ImtblRedirect = () => {

    useEffect(() => {
        (async () => {
            if (!passportInstance) await initilizePassport(AppSettings.ImtblPassportConfig)
            passportInstance.loginCallback();
        })()
    }, [passportInstance])

    return (
        <div>
            <h1>Redirecting...</h1>
        </div>
    );
}