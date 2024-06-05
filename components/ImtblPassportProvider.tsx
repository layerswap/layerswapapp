import { useEffect } from "react"
import { passport, config } from '@imtbl/sdk'
import { Network } from "../Models/Network";

const PUBLISHABLE_KEY = 'pk_imapik-$nKlgSN_PduRUn-zvKMI';
const CLIENT_ID = 'dma7UQfD7MvtqQCz9MxbwXKLt46V2T6J';

export const passportInstance = new passport.Passport({
    baseConfig: {
        environment: config.Environment.PRODUCTION,
        publishableKey: PUBLISHABLE_KEY,
    },
    clientId: CLIENT_ID,
    redirectUri: 'https://layerswapapp-git-dev-newwagmi-imtblpassportint-500c40-layerswap.vercel.app/imtblRedirect',
    logoutRedirectUri: 'https://layerswapapp-git-dev-newwagmi-imtblpassportint-500c40-layerswap.vercel.app/',
    audience: 'platform_api',
    scope: 'openid offline_access email transact',
});

const ImtblPassportProvider = ({ children, from, to }: { children: JSX.Element | JSX.Element[], from: Network | undefined, to?: Network | undefined }) => {

    useEffect(() => {
        if (!passportInstance) return
        if (from?.name.startsWith('IMMUTABLE') || to?.name.startsWith('IMMUTABLE')) passportInstance.connectEvm() // EIP-6963
    }, [from, to, passportInstance])

    return (
        <>
            {children}
        </>
    )
}

export default ImtblPassportProvider