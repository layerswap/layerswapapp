import AppSettings from "@/lib/AppSettings";
import { ReactNode, useEffect } from "react"

export type InitImtblPassport = { client_id: string | undefined, publishable_key: string | undefined, redirect_uri: string | undefined, base_path?: string | undefined }

export const initilizePassport = async ({ client_id, publishable_key, redirect_uri, base_path }: InitImtblPassport) => {
    const passport = (await import('@imtbl/sdk')).passport
    const config = (await import('@imtbl/sdk')).config
    const logoutRedirectUri = base_path ? `${window.location.origin}${base_path}/` : `${window.location.origin}/`

    if (publishable_key && client_id && redirect_uri) {
        passportInstance = new passport.Passport({
            baseConfig: {
                environment: config.Environment.PRODUCTION,
                publishableKey: publishable_key,
            },
            clientId: client_id,
            audience: 'platform_api',
            scope: 'openid offline_access email transact',
            redirectUri: redirect_uri,
            logoutRedirectUri,
            logoutMode: 'silent',
        });
    }
}

export var passportInstance: any = undefined

export function ImtblPassportProvider({ children, client_id, publishable_key, redirect_uri, base_path }: { children: ReactNode } & InitImtblPassport) {

    useEffect(() => {
        if (!passportInstance && publishable_key && client_id && redirect_uri) {
            (async () => {
                await initilizePassport({ client_id, publishable_key, redirect_uri, base_path })
                passportInstance.connectEvm() // EIP-6963
            })()
        }
    }, [passportInstance, publishable_key, client_id, redirect_uri])

    return (
        <>
            {children}
        </>
    )
}

export const ImtblPassportRedirect = ({ client_id, publishable_key, redirect_uri, base_path }: InitImtblPassport) => {

    useEffect(() => {
        if (publishable_key && client_id && redirect_uri) {
            (async () => {
                await initilizePassport({ client_id, publishable_key, redirect_uri, base_path })
                passportInstance.loginCallback();
            })()
        }
    }, [passportInstance, publishable_key, client_id, redirect_uri])

    return (
        <div>
            <h1>Redirecting...</h1>
        </div>
    );
}