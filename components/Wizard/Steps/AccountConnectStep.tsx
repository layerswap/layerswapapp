import { Transition } from '@headlessui/react';
import { CheckIcon, ExclamationIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { useSwapDataState } from '../../../context/swap';
import { useUserExchangeDataUpdate } from '../../../context/userExchange';
import { useWizardState } from '../../../context/wizard';
import { useInterval } from '../../../hooks/useInyterval';
import { parseJwt } from '../../../lib/jwtParser';
import TokenService from '../../../lib/TokenService';
import { FormWizardSteps, SwapWizardSteps } from '../../../Models/Wizard';
import SubmitButton from '../../buttons/submitButton';
import Carousel, { CarouselItem } from '../../Csrousel';

const AccountConnectStep: FC = () => {
    const [localError, setLocalError] = useState("")
    const { swapFormData } = useSwapDataState()
    const { oauth_redirect_url } = swapFormData?.exchange?.baseObject || {}
    const { goToStep } = useFormWizardaUpdate<FormWizardSteps>()
    const { currentStep, error: wizardError } = useFormWizardState<FormWizardSteps>()
    const { getUserExchanges } = useUserExchangeDataUpdate()
    const [poll, setPoll] = useState(false)
    const authWindowRef = useRef(null);

    useInterval(async () => {
        if (currentStep === "ExchangeOAuth" && poll) {
            const { access_token } = TokenService.getAuthData() || {};
            if (!access_token) {
                await goToStep("Email")
                setPoll(false)
                return;
            }
            const exchanges = await (await getUserExchanges(access_token))?.data
            const exchangeIsEnabled = exchanges?.some(e => e.exchange === swapFormData?.exchange?.id && e.is_enabled)
            if (!swapFormData?.exchange?.baseObject?.authorization_flow || swapFormData?.exchange?.baseObject?.authorization_flow == "none" || exchangeIsEnabled) {
                goToStep("SwapConfirmation")
                setPoll(false)
                authWindowRef.current?.close()
            }

        }
    }, [currentStep, authWindowRef, poll], 7000)

    const handleConnect = useCallback(() => {
        try {
            setPoll(true)
            const access_token = TokenService.getAuthData()?.access_token
            if (!access_token)
                goToStep("Email")
            const { sub } = parseJwt(access_token) || {}
            const authWindow = window.open(oauth_redirect_url + sub, '_blank', 'width=420,height=720')
            authWindowRef.current = authWindow
        }
        catch (e) {
            setLocalError(e.message)
        }
    }, [oauth_redirect_url])

    const minimalAuthorizeAmount = Math.round(swapFormData?.currency?.baseObject?.price_in_usdt * Number(swapFormData?.amount) + 5)
    const exchange_name = swapFormData?.exchange?.name
    const error = localError + wizardError
    return (
        <>
            <div className="w-full px-8 py-6 pt-1 grid grid-flow-row min-h-[480px] text-pink-primary-300 font-light">

                <h3 className='mb-4 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
                    Please connect your {exchange_name} account
                    <p className='mb-10 pt-2 text-base text-center md:text-left font-roboto text-sm text-pink-primary-300 font-light'>
                        You will leave Layerswap and be securely redirected to <span className='strong-highlight'>{exchange_name}</span> authorization page.
                    </p>
                    {/* <div className="flex items-center text-pink-primary-300 border-2 p-4 rounded-md border-ouline-blue border-dashed">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2.5 stroke-pink-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <label className="block text-lg font-lighter leading-6 "> Make sure to authorize at least <span className='strong-highlight text-white'>{minimalAuthorizeAmount}$</span>. Follow this <Link key="userGuide" href="/userguide"><a className="strong-highlight hightlight-animation highlight-link hover:cursor-pointer">Step by step guide</a></Link></label>
                    </div> */}
                </h3>
                {
                    error &&
                    <div className="bg-[#3d1341] border-l-4 border-[#f7008e] p-4 mb-5 flex items-center">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <ExclamationIcon className="h-6 w-6 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-xl text-light-blue font-normal">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>
                }
                {/* <div className="">
                    <Carousel>
                        <CarouselItem width={100}>

                            <div className='w-full grow'>
                                <svg viewBox="0 0 413 844" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" width="407" height="844" rx="50" fill="url(#paint0_linear_1730_2036)" />
                                    <rect x="19" y="16" width="375" height="812" rx="36" fill="#2261EB" />
                                    <rect x="19" y="16" width="375" height="812" rx="36" fill="white" />
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M121.208 49.1551V61.1443L121.752 61.3006C123.103 61.6884 124.281 61.9224 125.642 62.0733C126.556 62.1747 128.524 62.1898 129.296 62.1014C132.904 61.688 135.452 60.1935 136.809 57.6961C137.993 55.5175 138.128 52.3688 137.137 50.0929C136.054 47.6073 133.92 46.0704 130.828 45.5487C129.939 45.3987 128.267 45.3982 127.388 45.5478C126.662 45.6714 125.947 45.8572 125.44 46.0537L125.078 46.1946V41.6803V37.166H123.143H121.208V49.1551ZM96.5673 38.8586C95.4843 39.2096 94.7839 40.2461 94.977 41.2117C95.1683 42.1673 95.9862 42.9165 97.0205 43.0833C98.0097 43.2429 99.0739 42.6971 99.5427 41.7901C99.7276 41.4322 99.7381 41.3854 99.7366 40.9154C99.7354 40.5203 99.7108 40.363 99.6161 40.1456C99.3761 39.5951 98.8526 39.1119 98.2602 38.8941C97.8241 38.7338 97.0054 38.7166 96.5673 38.8586ZM68.9765 45.4664C67.4557 45.6133 65.9535 46.1043 64.7251 46.8558C64.0211 47.2866 62.9787 48.2528 62.5068 48.9121C61.4676 50.3639 61.0035 51.8701 61 53.8023C60.9982 54.8344 61.0539 55.288 61.2929 56.1852C62.1497 59.4027 64.8106 61.5775 68.4871 62.0651C70.244 62.2981 71.8535 62.1787 73.4582 61.6962C73.9805 61.5392 74.9456 61.1596 75.0373 61.075C75.0587 61.0553 73.4614 58.737 73.3568 58.6361C73.3116 58.5924 73.1848 58.6125 72.8369 58.7184C72.0542 58.9565 71.3976 59.0327 70.3766 59.0037C69.3893 58.9757 68.821 58.8707 68.0488 58.5736C66.5413 57.9937 65.3878 56.6701 65.0428 55.1246C64.7645 53.8777 64.8937 52.5165 65.3946 51.4186C65.8757 50.3638 66.9258 49.429 68.1275 48.9854C68.9051 48.6985 69.4226 48.6176 70.4755 48.6188C71.4664 48.6198 72.0819 48.703 72.8101 48.9345C72.9856 48.9903 73.1457 49.019 73.1657 48.9982C73.214 48.9482 74.7749 46.5126 74.7749 46.4872C74.7749 46.4423 73.6903 46.0007 73.2302 45.8582C71.9769 45.4702 70.421 45.3269 68.9765 45.4664ZM82.8957 45.4664C78.9398 45.8485 75.987 48.3446 75.2376 51.94C74.7339 54.3565 75.2288 56.8499 76.5869 58.7397C77.0487 59.3822 78.0511 60.3174 78.7395 60.748C80.7532 62.0074 83.3731 62.4589 85.9751 61.9949C86.7891 61.8497 87.4551 61.6358 88.291 61.251C89.9213 60.5006 91.1613 59.3536 91.9679 57.8496C92.3481 57.1406 92.5672 56.5482 92.7641 55.6968C92.9005 55.1074 92.9094 54.9904 92.9094 53.8023C92.9094 52.6141 92.9005 52.4971 92.7641 51.9077C92.2325 49.6094 91.0096 47.9013 89.0554 46.7277C87.3646 45.7124 85.116 45.252 82.8957 45.4664ZM109.304 45.4625C107.385 45.5874 105.459 45.9393 103.661 46.4936L102.748 46.7753L102.734 54.2865L102.72 61.7976H104.655H106.59V55.4673V49.137L106.872 49.0621C107.837 48.8062 108.707 48.7131 110.137 48.7125C111.29 48.7121 111.437 48.7219 111.819 48.8243C112.443 48.9913 112.859 49.2058 113.226 49.55C113.61 49.9095 113.805 50.2268 113.967 50.7568C114.085 51.1452 114.085 51.1485 114.102 56.4715L114.118 61.7976H116.024H117.93L117.93 56.4715C117.93 51.031 117.912 50.4695 117.717 49.606C117.356 48.0092 116.433 46.8533 114.985 46.1836C113.614 45.549 111.702 45.3065 109.304 45.4625ZM145.054 45.4616C143.83 45.5796 142.388 45.9522 141.321 46.4264L140.716 46.695V48.2374C140.716 49.0857 140.73 49.7798 140.746 49.7798C140.762 49.7798 140.95 49.6919 141.162 49.5844C142.063 49.1301 143.265 48.7569 144.29 48.6132C144.913 48.5259 146.199 48.5115 146.628 48.5869C147.935 48.8163 148.764 49.4765 148.987 50.465C149.02 50.6098 149.047 51.1043 149.047 51.564V52.3997L147.206 52.4254C145.719 52.4461 145.231 52.4705 144.667 52.5524C143.057 52.7859 142.046 53.1061 141.124 53.6746C140.124 54.291 139.546 55.0309 139.221 56.1115C139.151 56.343 139.132 56.6141 139.135 57.3282C139.139 58.182 139.149 58.2783 139.286 58.692C139.849 60.3973 141.309 61.4265 143.829 61.8947C145.447 62.1954 147.775 62.2132 150.139 61.9429C150.932 61.8523 152.143 61.6568 152.607 61.5445L152.808 61.4958L152.807 55.7992C152.807 52.2913 152.786 49.969 152.753 49.7549C152.383 47.3506 150.844 45.9601 148.079 45.5325C147.469 45.4381 145.723 45.3972 145.054 45.4616ZM160.735 45.441C158.154 45.7008 156.451 46.7425 155.764 48.4806C155.454 49.2671 155.365 50.2713 155.521 51.2287C155.669 52.139 155.996 52.8017 156.583 53.3822C157.35 54.1416 158.367 54.612 160.225 55.0677C162.068 55.5196 162.829 55.8114 163.305 56.2481C163.639 56.5545 163.776 56.8455 163.811 57.3246C163.861 58.0027 163.613 58.5035 163.06 58.839C161.616 59.7149 158.469 59.2627 156.231 57.8579C155.941 57.6758 155.693 57.5268 155.68 57.5268C155.667 57.5268 155.657 58.2751 155.657 59.1898V60.8528L155.882 60.9843C156.241 61.1936 156.976 61.4912 157.645 61.6979C159.172 62.1695 160.989 62.3019 162.697 62.0656C164.566 61.8071 165.993 61.0668 166.807 59.9334C167.731 58.6476 167.84 56.4006 167.047 54.9955C166.751 54.4702 166.418 54.0994 165.91 53.7279C165.137 53.1635 163.989 52.7062 162.482 52.3621C160.554 51.922 159.621 51.4657 159.306 50.8084C159.121 50.4222 159.127 49.8087 159.321 49.4245C159.572 48.9239 160.048 48.59 160.766 48.4087C161.516 48.2195 162.973 48.333 164.078 48.6669C164.687 48.8508 165.723 49.3291 166.204 49.6481L166.62 49.9244V48.2871V46.6497L166.446 46.5487C165.712 46.1247 164.494 45.7122 163.504 45.5525C162.902 45.4552 161.253 45.3888 160.735 45.441ZM176.697 45.4405C173.831 45.7245 171.478 47.2209 170.223 49.5563C169.613 50.6924 169.305 51.768 169.191 53.1688C169.056 54.8221 169.356 56.4662 170.04 57.8211C170.791 59.3103 172.218 60.6284 173.826 61.3184C175.937 62.2246 178.603 62.4205 181.285 61.8664C182.322 61.6523 183.475 61.2303 184.148 60.8184L184.355 60.6919V59.1301V57.5683L184.073 57.7245C183.505 58.039 182.404 58.5129 181.889 58.6649C180.328 59.125 178.315 59.2417 177.019 58.9473C174.907 58.4672 173.41 57.1126 173.009 55.3178C172.954 55.0715 172.909 54.8085 172.909 54.7334L172.908 54.5968H178.954H185L185 53.5912C185 52.3177 184.925 51.4072 184.758 50.6438C184.45 49.2385 183.869 48.155 182.946 47.2664C182 46.3559 180.727 45.7704 179.171 45.5303C178.692 45.4564 177.114 45.3991 176.697 45.4405ZM95.4656 53.7774V61.7976H97.4003H99.3351V53.7774V45.7573H97.4003H95.4656V53.7774ZM178.417 48.4944C179.143 48.611 179.792 48.9363 180.299 49.4394C180.859 49.9937 181.236 50.8935 181.323 51.8847L181.36 52.3125H177.188C174.893 52.3125 173.016 52.2952 173.016 52.2742C173.016 52.2008 173.236 51.4911 173.34 51.2322C173.963 49.6719 175.252 48.6439 176.842 48.4396C177.219 48.3911 177.926 48.4157 178.417 48.4944ZM85.4318 48.6575C86.444 48.9358 87.2414 49.4352 87.8635 50.1805C89.3578 51.9709 89.4623 55.1757 88.0897 57.1186C87.548 57.8855 86.6997 58.5178 85.817 58.813C83.9893 59.4241 82.0279 59.0946 80.7023 57.9536C79.4902 56.9104 78.9065 55.4076 78.984 53.5291C79.034 52.3174 79.3091 51.4023 79.8722 50.5739C80.5836 49.5276 81.631 48.8357 82.8881 48.5819C83.576 48.4429 84.7815 48.4788 85.4318 48.6575ZM129.598 48.7105C130.736 48.8946 131.734 49.3722 132.475 50.0869C133.422 51.001 133.891 52.1827 133.891 53.6533C133.89 56.7582 131.991 58.7382 128.695 59.0703C127.717 59.1689 126.136 59.0646 125.327 58.8483L125.104 58.7888V54.0738V49.3589L125.561 49.1781C126.771 48.6995 128.379 48.5132 129.598 48.7105ZM149.047 57.0484V59.3013L148.576 59.3601C147.808 59.4561 146.5 59.4837 145.882 59.4171C144.421 59.2598 143.513 58.8029 143.113 58.0234C142.958 57.7228 142.947 57.6631 142.948 57.1544C142.949 56.6538 142.962 56.5832 143.106 56.3101C143.484 55.589 144.438 55.0733 145.715 54.9002C145.936 54.8701 146.178 54.8372 146.252 54.8272C146.326 54.8172 146.985 54.806 147.716 54.8022L149.047 54.7955V57.0484Z" fill="#0251FD" />
                                    <path d="M43 160.794C43 155.215 49.4319 150.692 57.3661 150.692H355.634C363.568 150.692 370 155.215 370 160.794V160.794C370 166.373 363.568 170.896 355.634 170.896H57.3661C49.4319 170.896 43 166.373 43 160.794V160.794Z" fill="#87979D" />
                                    <path d="M43 190.619C43 186.634 46.3241 183.403 50.4247 183.403H204.575C208.676 183.403 212 186.634 212 190.619V190.619C212 194.604 208.676 197.835 204.575 197.835H50.4247C46.3241 197.835 43 194.604 43 190.619V190.619Z" fill="#87979D" />
                                    <rect x="251" y="244" width="119" height="47" rx="4" fill="#1652F0" />
                                    <text fill="white" style={{ whiteSpace: "pre" }} font-family="Inter" font-size="15" font-weight="600" letter-spacing="-0.3px"><tspan x="293.291" y="272.261">Save</tspan></text>
                                    <line x1="19" y1="82.8457" x2="394" y2="82.8457" stroke="#C1C1D2" />
                                    <rect x="43.75" y="249.75" width="108.5" height="38.5" stroke="#7B8FB8" stroke-width="1.5" />
                                    <text fill="#4E4E4E" style={{ whiteSpace: "pre" }} font-family="Inter" font-size="24" letter-spacing="-0.3px"><tspan x="49" y="278.227">{minimalAuthorizeAmount}</tspan></text>
                                    <text fill="black" style={{ whiteSpace: "pre" }} font-family="Inter" font-size="16" letter-spacing="-0.3px"><tspan x="165.991" y="267.318">/ per&#10;</tspan><tspan x="159.467" y="286.318">month</tspan></text>
                                    <path opacity="0.5" d="M410 181H411.5C412.328 181 413 181.672 413 182.5V275.5C413 276.328 412.328 277 411.5 277H410V181Z" fill="black" />
                                    <path opacity="0.5" d="M3 239H1.5C0.671573 239 0 239.672 0 240.5V295.5C0 296.328 0.671573 297 1.5 297H3V239Z" fill="black" />
                                    <path opacity="0.5" d="M3 162H1.5C0.671573 162 0 162.672 0 163.5V218.5C0 219.328 0.671573 220 1.5 220H3V162Z" fill="black" />
                                    <path opacity="0.5" d="M3 101H1.5C0.671573 101 0 101.672 0 102.5V128.5C0 129.328 0.671573 130 1.5 130H3V101Z" fill="black" />
                                    <defs>
                                        <linearGradient id="paint0_linear_1730_2036" x1="52.6826" y1="-2.48735e-06" x2="383.01" y2="197.618" gradientUnits="userSpaceOnUse">
                                            <stop stop-color="#3E3E3E" />
                                            <stop offset="1" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            <h4 className='text-center m-3'>Edit montly amount and save</h4>

                        </CarouselItem>
                        <CarouselItem width={100}>Item 2</CarouselItem>
                        <CarouselItem width={100}>Item 3</CarouselItem>
                    </Carousel>
                </div> */}



                <div className="text-white text-sm  mt-auto">
                    <div className="flex mt-12 md:mt-5 font-normal text-sm text-pink-primary-300 mb-3">
                        <label className="block font-lighter text-left leading-6"> Even after authorization Layerswap can't initiate a withdrawal without your explicit confirmation.</label>
                    </div>

                    <SubmitButton isDisabled={false} icon="" isSubmitting={false} onClick={handleConnect}>
                        Connect
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default AccountConnectStep;