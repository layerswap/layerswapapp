import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useInterval } from '../hooks/useInterval';
import { BransferApiClient } from '../lib/bransferApiClients';
import { parseJwt } from '../lib/jwtParser';
import TokenService from '../lib/TokenService';
import { Exchange } from '../Models/Exchange';
import SubmitButton from './buttons/submitButton';

type Props = {
    exchange: Exchange,
    onClose: () => void
}

const ConnectOauthExchange: FC<Props> = ({ exchange, onClose }) => {
    const [loading, setLoading] = useState(false)
    const router = useRouter();
    const authWindowRef = useRef(null);

    useEffect(() => {
        setLoading(false)
    }, [exchange])

    useInterval(async () => {
        if (loading && exchange) {
            try {
                const { access_token } = TokenService.getAuthData() || {};
                if (!access_token) {
                    router.push({
                        pathname: '/auth',
                        query: { ...(router.query), redirect: '/exchanges' }
                    })
                    return;
                }
                const bransferApiClient = new BransferApiClient()
                const userExchanges = await bransferApiClient.GetExchangeAccounts(access_token)

                if (userExchanges.data.some(e => e.exchange === exchange?.internal_name && e.is_enabled)) {
                    authWindowRef.current?.close()
                    onClose()
                    setLoading(false)
                }
            }
            catch (e) {
                toast.error(e.message)
                setLoading(false)
            }
        }
    }, [exchange, loading, authWindowRef, router.query], 2000)


    const handleConnect = useCallback(() => {
        try {
            setLoading(true)
            const access_token = TokenService.getAuthData()?.access_token
            if (!access_token) {
                router.push({
                    pathname: '/auth',
                    query: { ...(router.query), redirect: '/exchanges' }
                })
                return;
            }

            const { sub } = parseJwt(access_token) || {}
            const authWindow = window.open(exchange.oauth_authorization_redirect_url + sub, '_blank', 'width=420,height=720')
            authWindowRef.current = authWindow
        }
        catch (e) {
            toast.error(e.message)
        }
    }, [exchange, router.query])


    return (
        <>
            <div className="w-full grid grid-flow-row text-pink-primary-300">
                <div className="flex items-center">
                    <h3 className="block text-lg font-medium leading-6 mb-12">
                        You will leave Layerswap and be securely redirected to Coinbase authorization page.
                    </h3>
                </div>

                <div className="flex mt-12 md:mt-5 font-normal text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2.5 stroke-pink-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <label className="block font-lighter text-left leading-6"> Even after authorization Layerswap can't initiate a withdrawal without your explicit confirmation.</label>
                </div>

                {/* <div>
                    <label className="block font-normal text-sm mt-12">
                        You will leave Layerswap and be securely redirected to Coinbase authorization page.
                    </label>
                </div> */}
                <div className="text-white text-sm mt-3">
                    <SubmitButton isDisabled={loading} icon="" isSubmitting={loading} onClick={handleConnect}>
                        Connect
                    </SubmitButton>
                </div>
            </div>
        </>
    )
}

export default ConnectOauthExchange;