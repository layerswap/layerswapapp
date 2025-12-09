import { useEffect, ReactNode } from "react"
import { ImtblPassportConfig } from "./index";

export const initilizePassport = async (configs: ImtblPassportConfig | undefined) => {

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

type ImtblPassportProviderWrapperProps = {
    children: ReactNode
    imtblPassportConfig?: ImtblPassportConfig
}

export function ImtblPassportProviderWrapper({ children, imtblPassportConfig }: ImtblPassportProviderWrapperProps) {

    useEffect(() => {
        if (!passportInstance) {
            (async () => {
                await initilizePassport(imtblPassportConfig)
                passportInstance.connectEvm() // EIP-6963
            })()
        }
    }, [passportInstance, imtblPassportConfig])

    return (
        <>
            {children}
        </>
    )
}

export const ImtblRedirect = ({ imtblPassportConfig }: { imtblPassportConfig?: ImtblPassportConfig }) => {

    useEffect(() => {
        (async () => {
            if (!passportInstance) await initilizePassport(imtblPassportConfig)
            passportInstance.loginCallback();
        })()
    }, [passportInstance, imtblPassportConfig])

    return (
        <div>
            <h1>Redirecting...</h1>
        </div>
    );
}