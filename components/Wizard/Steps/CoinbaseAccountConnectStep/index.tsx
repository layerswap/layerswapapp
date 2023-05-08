import { FC, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { useQueryState } from '../../../../context/query';
import { useSettingsState } from '../../../../context/settings';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import { useInterval } from '../../../../hooks/useInterval';
import { Configs, usePersistedState } from '../../../../hooks/usePersistedState';
import { CalculateMinimalAuthorizeAmount } from '../../../../lib/fees';
import { parseJwt } from '../../../../lib/jwtParser';
import LayerSwapApiClient, { UserExchangesData } from '../../../../lib/layerSwapApiClient';
import { OpenLink } from '../../../../lib/openLink';
import TokenService from '../../../../lib/TokenService';
import { ApiResponse } from '../../../../Models/ApiResponse';
import { SwapCreateStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import Carousel, { CarouselItem, CarouselRef } from '../../../Carousel';
import Widget from '../../Widget';
import { FirstScreen, FourthScreen, LastScreen, SecondScreen, ThirdScreen } from './ConnectGuideScreens';
import { Layer } from '../../../../Models/Layer';

type Props = {
    onAuthorized: () => void,
    onDoNotConnect: () => void,
    stickyFooter: boolean,
    hideHeader?: boolean,
}

const Authorize: FC<Props> = ({ onAuthorized, stickyFooter, onDoNotConnect, hideHeader }) => {
    const { swap, swapFormData } = useSwapDataState()
    const { setWithdrawManually } = useSwapDataUpdate()
    const { layers, currencies } = useSettingsState()
    const { goToStep } = useFormWizardaUpdate()
    let [alreadyFamiliar, setAlreadyFamiliar] = usePersistedState<Configs>({ alreadyFamiliarWithCoinbaseConnect: false }, 'configs')

    const [carouselFinished, setCarouselFinished] = useState(alreadyFamiliar.alreadyFamiliarWithCoinbaseConnect)
    const [authWindow, setAuthWindow] = useState<Window>()
    const [authorizedAmount, setAuthorizedAmount] = useState<number>()

    const carouselRef = useRef<CarouselRef | null>(null)
    const query = useQueryState()
    const exchange_internal_name = swap?.source_exchange || swapFormData?.from?.internal_name
    const asset_name = swap?.source_network_asset || swapFormData?.currency.asset

    const exchange = layers.find(e => e.isExchange && e.internal_name?.toLowerCase() === exchange_internal_name?.toLowerCase()) as Layer & { isExchange: true }
    const currency = currencies?.find(c => asset_name?.toLocaleUpperCase() === c.asset?.toLocaleUpperCase())

    const { oauth_authorize_url } = exchange || {}

    const minimalAuthorizeAmount = CalculateMinimalAuthorizeAmount(currency?.usd_price, Number(swap?.requested_amount || swapFormData?.amount))

    const layerswapApiClient = new LayerSwapApiClient()
    const exchange_accounts_endpoint = `/exchange_accounts`
    const { data: exchange_accounts } = useSWR<ApiResponse<UserExchangesData[]>>(authorizedAmount ? exchange_accounts_endpoint : null, layerswapApiClient.fetcher)

    const handleTransferMannually = useCallback(() => {
        setWithdrawManually(true)
        onDoNotConnect()
    }, [])


    const checkShouldStartPolling = useCallback(() => {
        let authWindowHref = ""
        try {
            authWindowHref = authWindow?.location?.href
        }
        catch (e) {
            //throws error when accessing href TODO research safe way
        }
        if (authWindowHref && authWindowHref?.indexOf(window.location.origin) !== -1) {
            const authWindowURL = new URL(authWindowHref)
            const authorizedAmount = authWindowURL.searchParams.get("send_limit_amount")
            setAuthorizedAmount(Number(authorizedAmount))
            authWindow?.close()
        }
    }, [authWindow])

    useInterval(
        checkShouldStartPolling,
        authWindow && !authWindow.closed ? 1000 : null,
    )

    useEffect(() => {
        if (exchange_accounts && authorizedAmount) {
            const exchangeIsEnabled = exchange_accounts?.data?.some(e => e.exchange === exchange?.internal_name && e.type === 'authorize')
            if (exchangeIsEnabled) {
                if (Number(authorizedAmount) < minimalAuthorizeAmount)
                    toast.error("You did not authorize enough")
                else {
                    onAuthorized()
                }
            }
        }
    }, [exchange_accounts, authorizedAmount, minimalAuthorizeAmount])

    const handleConnect = useCallback(() => {
        try {
            if (!carouselFinished && !alreadyFamiliar.alreadyFamiliarWithCoinbaseConnect) {
                carouselRef?.current?.next()
                return;
            }
            const access_token = TokenService.getAuthData()?.access_token
            if (!access_token)
                goToStep(SwapCreateStep.Email)
            const { sub } = parseJwt(access_token) || {}
            const encoded = btoa(JSON.stringify({ Type: 1, UserId: sub, RedirectUrl: `${window.location.origin}/salon` }))
            const authWindow = OpenLink({ link: oauth_authorize_url + encoded, swap_data: swapFormData, swapId: swap?.id, query: query })
            setAuthWindow(authWindow)
        }
        catch (e) {
            toast.error(e.message)
        }
    }, [oauth_authorize_url, carouselRef, carouselFinished, query, swap])

    const exchange_name = exchange?.display_name

    const onCarouselLast = (value) => {
        setCarouselFinished(value)
    }

    const handleToggleChange = (value: boolean) => {
        setAlreadyFamiliar({ ...alreadyFamiliar, alreadyFamiliarWithCoinbaseConnect: value })
        onCarouselLast(value)
    }

    return (
        <Widget>
            <Widget.Content center>
                {
                    !hideHeader &&
                    <h3 className='md:mb-4 pt-2 text-lg sm:text-xl text-left font-roboto text-white font-semibold'>
                        Please connect your {exchange_name} account
                    </h3>
                }
                {
                    alreadyFamiliar.alreadyFamiliarWithCoinbaseConnect ?
                        <div className={`w-full rounded-xl inline-flex items-center justify-center flex-col pb-0 bg-gradient-to-b from-darkblue-900 to-darkblue-700 h-100%`} style={{ width: '100%' }}>
                            <LastScreen minimalAuthorizeAmount={minimalAuthorizeAmount} />
                        </div>
                        :
                        <div className="w-full space-y-3">
                            {(swap || swapFormData) && <Carousel onLast={onCarouselLast} ref={carouselRef}>
                                <CarouselItem width={100} >
                                    <FirstScreen exchange_name={exchange_name} />
                                </CarouselItem>
                                <CarouselItem width={100}>
                                    <SecondScreen />
                                </CarouselItem>
                                <CarouselItem width={100}>
                                    <ThirdScreen minimalAuthorizeAmount={minimalAuthorizeAmount} />
                                </CarouselItem>
                                <CarouselItem width={100}>
                                    <FourthScreen minimalAuthorizeAmount={minimalAuthorizeAmount} />
                                </CarouselItem>
                                <CarouselItem width={100}>
                                    <LastScreen number minimalAuthorizeAmount={minimalAuthorizeAmount} />
                                </CarouselItem>
                            </Carousel>}
                        </div>
                }
                <div className="flex font-normal text-sm text-primary-text">
                    <label className="block font-lighter text-left mb-2"> Even after authorization Layerswap can't initiate a withdrawal without your explicit confirmation.</label>
                </div>
            </Widget.Content>
            <Widget.Footer sticky={stickyFooter}>
                <div>
                    {
                        alreadyFamiliar.alreadyFamiliarWithCoinbaseConnect && carouselFinished ?
                            <button onClick={() => handleToggleChange(false)} className="p-1.5 text-white bg-darkblue-500 hover:bg-darkblue-400 rounded-md border border-darkblue-500 hover:border-darkblue-200 w-full mb-3">
                                Show me full guide
                            </button>
                            :
                            <div className="flex items-center mb-3">
                                <input
                                    name="alreadyFamiliar"
                                    id='alreadyFamiliar'
                                    type="checkbox"
                                    className="h-4 w-4 bg-darkblue-600 rounded border-darkblue-400 text-priamry focus:ring-darkblue-600"
                                    onChange={() => handleToggleChange(true)}
                                    checked={alreadyFamiliar.alreadyFamiliarWithCoinbaseConnect}
                                />
                                <label htmlFor="alreadyFamiliar" className="ml-2 block text-sm text-white">
                                    I'm already familiar with the process.
                                </label>
                            </div>
                    }
                    <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleConnect}>
                        {
                            carouselFinished ? "Connect" : "Next"
                        }
                    </SubmitButton>
                    <p className='text-sm mt-2 font-lighter text-primary-text text-left'>Don't want to connect Coinbase account? <span onClick={handleTransferMannually} className='cursor-pointer underline'>Transfer manually</span></p>
                </div>
            </Widget.Footer>
        </Widget>
    )
}

export default Authorize;