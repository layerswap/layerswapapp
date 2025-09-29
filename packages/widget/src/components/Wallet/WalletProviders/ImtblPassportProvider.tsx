"use client"
import AppSettings from "@/lib/AppSettings";
import { useEffect } from "react"

const PUBLISHABLE_KEY = AppSettings.ImtblPassportConfig?.publishableKey;
const CLIENT_ID = AppSettings.ImtblPassportConfig?.clientId;

export const initilizePassport = async (basePath: string) => {
    const passport = (await import('@imtbl/sdk')).passport
    const config = (await import('@imtbl/sdk')).config
    const redirectUri = basePath ? `${window.location.origin}${basePath}/imtblRedirect` : `${window.location.origin}/imtblRedirect`
    const logoutRedirectUri = basePath ? `${window.location.origin}${basePath}/` : `${window.location.origin}/`

    if (PUBLISHABLE_KEY && CLIENT_ID) {
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
            logoutMode: 'silent',
        });
    }
}

export var passportInstance: any = undefined

export function ImtblPassportProvider({ children }: { children: JSX.Element | JSX.Element[] }) {

    useEffect(() => {
        if (!passportInstance) {
            (async () => {
                if (AppSettings.ImtblPassportConfig) {
                    await initilizePassport(AppSettings.ImtblPassportConfig.appBasePath)
                    passportInstance.connectEvm() // EIP-6963
                }
            })()
        }
    }, [passportInstance])

    return (
        <>
            {children}
        </>
    )
}

export const ImtblPassportRedirect = () => {

    useEffect(() => {
        (async () => {
            if (!passportInstance && AppSettings.ImtblPassportConfig?.appBasePath) await initilizePassport(AppSettings.ImtblPassportConfig.appBasePath)
            passportInstance.loginCallback();
        })()
    }, [passportInstance])

    return (
        <div>
            <h1>Redirecting...</h1>
        </div>
    );
}