import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useComplexInterval } from '../hooks/useInterval';
import LayerswapApiClient from '../lib/layerSwapApiClient';
import { parseJwt } from '../lib/jwtParser';
import TokenService from '../lib/TokenService';
import { Exchange } from '../Models/Exchange';
import SubmitButton from './buttons/submitButton';
import { Layer } from '../Models/Layer';
import WarningMessage from './WarningMessage';
import { useSettingsState } from '../context/settings';
import KnownInternalNames from '../lib/knownIds';

type Props = {
    exchange: Layer & { isExchange: true },
    onClose: () => void
}

const ConnectOauthExchange: FC<Props> = ({ exchange, onClose }) => {
    const [loading, setLoading] = useState(false)
    const router = useRouter();
    const authWindowRef = useRef(null);

    const settings = useSettingsState()
    const oauthProviders = settings?.discovery?.o_auth_providers
    const coinbaseOauthProvider = oauthProviders?.find(p => p.provider === KnownInternalNames.Exchanges.Coinbase)
    const { oauth_authorize_url } = coinbaseOauthProvider || {}

    useEffect(() => {
        setLoading(false)
    }, [exchange])

    useComplexInterval(async () => {
        if (!exchange)
            return true

        try {
            const layerswapApiClient = new LayerswapApiClient(router)
            const userExchanges = await layerswapApiClient.GetExchangeAccounts()

            if (userExchanges.data.some(e => e.exchange === exchange?.internal_name)) {
                authWindowRef.current?.close()
                onClose()
                setLoading(false)
                return true
            }
        }
        catch (e) {
            toast.error(e.message)
            setLoading(false)
            return true
        }
    }, [exchange, loading, authWindowRef, router.query], 2000)


    const handleConnect = useCallback(() => {
        try {
            setLoading(true)
            const access_token = TokenService.getAuthData()?.access_token
            if (!access_token) {
                router.push({
                    pathname: '/auth',
                    query: { redirect: '/exchanges' }
                })
                return;
            }
            const { sub } = parseJwt(access_token) || {}
            const encoded = btoa(JSON.stringify({ UserId: sub, RedirectUrl: `${window.location.origin}/salon` }))
            const authWindow = window.open(oauth_authorize_url + encoded, '_blank', 'width=420,height=720')
            authWindowRef.current = authWindow
        }
        catch (e) {
            toast.error(e.message)
        }
    }, [exchange, router.query])

    return (
        <>
            <div className="w-full grid grid-flow-row text-primary-text space-y-4 mt-2">
                <h3 className="block text-primary-text">
                    You will leave Layerswap and be securely redirected to Coinbase authorization page.
                </h3>
                <WarningMessage>
                    Even after authorization Layerswap can't initiate a withdrawal without your explicit confirmation.
                </WarningMessage>
                <div className="text-white text-sm mt-3">
                    <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect}>
                        Connect
                    </SubmitButton>
                </div>
            </div>
        </>
    )
}

export default ConnectOauthExchange;