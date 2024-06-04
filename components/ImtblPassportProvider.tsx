import { useEffect } from "react"
import { passport, config } from '@imtbl/sdk'

const PUBLISHABLE_KEY = 'pk_imapik-$nKlgSN_PduRUn-zvKMI';
const CLIENT_ID = 'dma7UQfD7MvtqQCz9MxbwXKLt46V2T6J';

export const passportInstance = new passport.Passport({
    baseConfig: {
        environment: config.Environment.PRODUCTION,
        publishableKey: PUBLISHABLE_KEY,
    },
    clientId: CLIENT_ID,
    redirectUri: process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/imtblRedirect` : 'http://localhost:3000/imtblRedirect',
    logoutRedirectUri: process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/` : 'http://localhost:3000/',
    audience: 'platform_api',
    scope: 'openid offline_access email transact',
});

const ImtblPassportProvider = ({ children }: { children: JSX.Element | JSX.Element[] }) => {

    useEffect(() => {
        if (!passportInstance) return

        (async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            passportInstance.connectEvm() // EIP-6963

        })()
    }, [passportInstance])

    return (
        <>
            {children}
        </>
    )
}

export default ImtblPassportProvider