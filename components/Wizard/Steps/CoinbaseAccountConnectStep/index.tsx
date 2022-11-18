import { FC, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { useQueryState } from '../../../../context/query';
import { useSwapDataState } from '../../../../context/swap';
import { useInterval } from '../../../../hooks/useInterval';
import { usePersistedState } from '../../../../hooks/usePersistedState';
import { parseJwt } from '../../../../lib/jwtParser';
import LayerSwapApiClient, { UserExchangesData } from '../../../../lib/layerSwapApiClient';
import { OpenLink } from '../../../../lib/openLink';
import TokenService from '../../../../lib/TokenService';
import { ApiResponse } from '../../../../Models/ApiResponse';
import { SwapCreateStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import ToggleButton from '../../../buttons/toggleButton';
import Carousel, { CarouselItem, CarouselRef } from '../../../Carousel';
import { FirstScreen, FourthScreen, LastScreen, SecondScreen, ThirdScreen } from './ConnectScreens';

const AccountConnectStep: FC = () => {
    const { swapFormData } = useSwapDataState()
    const { exchange, amount, currency } = swapFormData || {}
    const { o_auth_authorization_url } = exchange?.baseObject || {}
    const { goToStep } = useFormWizardaUpdate()

    const [carouselFinished, setCarouselFinished] = useState(false)
    const [authWindow, setAuthWindow] = useState<Window>()
    const [authorizedAmount, setAuthorizedAmount] = useState<number>()

    const carouselRef = useRef<CarouselRef | null>(null)
    const query = useQueryState()

    const minimalAuthorizeAmount = Math.round(currency?.baseObject?.usd_price * Number(amount) + 5)
    const layerswapApiClient = new LayerSwapApiClient()

    const exchange_accounts_endpoint = `${LayerSwapApiClient.apiBaseEndpoint}/api/exchange_accounts`

    const { data: exchanges } = useSWR<ApiResponse<UserExchangesData[]>>(authorizedAmount ? exchange_accounts_endpoint : null, layerswapApiClient.fetcher)

    const localStorageItemKey = "alreadyFamiliarWithCoinbaseConnect";
    let [alreadyFamiliar, setAlreadyFamiliar] = usePersistedState<boolean>(false, localStorageItemKey)
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
        if (exchanges && authorizedAmount) {
            const exchangeIsEnabled = exchanges?.data?.some(e => e.exchange_id === exchange?.baseObject.id)
            if (!exchange?.baseObject?.authorization_flow || exchange?.baseObject?.authorization_flow == "none" || exchangeIsEnabled) {
                if (Number(authorizedAmount) < minimalAuthorizeAmount)
                    toast.error("You did not authorize enough")
                else {
                    goToStep(SwapCreateStep.Confirm)
                }
            }
        }
    }, [exchanges, authorizedAmount, minimalAuthorizeAmount])

    const handleConnect = useCallback(() => {
        try {
            if (!carouselFinished && !alreadyFamiliar) {
                carouselRef?.current?.next()
                return;
            }
            const access_token = TokenService.getAuthData()?.access_token
            if (!access_token)
                goToStep(SwapCreateStep.Email)
            const { sub } = parseJwt(access_token) || {}
            const encoded = btoa(JSON.stringify({ UserId: sub, RedirectUrl: `${window.location.origin}/salon` }))
            const authWindow = OpenLink({ link: o_auth_authorization_url + encoded, swap_data: swapFormData, query })
            setAuthWindow(authWindow)
        }
        catch (e) {
            toast.error(e.message)
        }

    }, [o_auth_authorization_url, carouselRef, carouselFinished, query])

    const exchange_name = exchange?.name

    const onCarouselLast = (value) => {
        setCarouselFinished(value)
    }

    const handleToggleChange = (value: boolean) => {
        setAlreadyFamiliar(value)
    }

    return (
        <>
            <div className="w-full md:grid md:grid-flow-row min-h-[480px] text-primary-text font-light">

                <p className='md:mb-4 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
                    Please connect your {exchange_name} account
                </p>
                {
                    alreadyFamiliar ?
                        <div>
                            <div className={`w-full rounded-xl inline-flex items-center justify-center flex-col pb-0 bg-gradient-to-b from-darkblue to-darkblue-700 h-100%`} style={{ width: '100%' }}>
                                <LastScreen minimalAuthorizeAmount={minimalAuthorizeAmount} />
                            </div>
                            <button className='' onClick={() => { handleToggleChange(false); }}>
                                Show me full guide.
                            </button>
                        </div>
                        :
                        <div className="w-full space-y-3">
                            {swapFormData && !alreadyFamiliar && <Carousel onLast={onCarouselLast} ref={carouselRef}>
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
                                    <LastScreen minimalAuthorizeAmount={minimalAuthorizeAmount} />
                                </CarouselItem>
                            </Carousel>}
                            {
                                carouselFinished && !alreadyFamiliar &&
                                <div className='flex justify-between'>
                                    <div className='flex items-center text-xs md:text-sm font-medium'>
                                        I'm already familiar with the process.
                                    </div>
                                    <div className='flex items-center space-x-4'>
                                        <ToggleButton name='Already Familiar' onChange={handleToggleChange} value={alreadyFamiliar} />
                                    </div>
                                </div>
                            }
                        </div>
                }

                <div className="text-white text-sm  mt-auto">
                    <div className="flex mt-5 font-normal text-sm text-primary-text mb-3">
                        <label className="block font-lighter text-left leading-6"> Even after authorization Layerswap can't initiate a withdrawal without your explicit confirmation.</label>
                    </div>

                    <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleConnect}>
                        {
                            carouselFinished || alreadyFamiliar ? "Connect" : "Next"
                        }
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default AccountConnectStep;