import { createContext, useContext, useEffect } from "react"
import { Network } from "../Models/Network";

const PUBLISHABLE_KEY = 'pk_imapik-$nKlgSN_PduRUn-zvKMI';
const CLIENT_ID = 'dma7UQfD7MvtqQCz9MxbwXKLt46V2T6J';

export const initilizePassport = async () => {
    const passport = (await import('@imtbl/sdk')).passport
    const config = (await import('@imtbl/sdk')).config

    passportInstance = new passport.Passport({
        baseConfig: {
            environment: config.Environment.PRODUCTION,
            publishableKey: PUBLISHABLE_KEY,
        },
        clientId: CLIENT_ID,
        redirectUri: 'http://localhost:3000/imtblRedirect',
        logoutRedirectUri: 'http://localhost:3000/',
        audience: 'platform_api',
        scope: 'openid offline_access email transact',
    });
}

export var passportInstance: any = undefined

export function ImtblPassportProvider({ children, from, to }: { children: JSX.Element | JSX.Element[], from: Network | undefined, to?: Network | undefined }) {

    useEffect(() => {
        if (from?.name.startsWith('IMMUTABLE') || to?.name.startsWith('IMMUTABLE')) {
            (async () => {
                await initilizePassport()
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