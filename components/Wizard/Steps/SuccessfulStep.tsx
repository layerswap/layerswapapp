import { CheckIcon, ExternalLinkIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useCallback, useState } from 'react'
import { useSettingsState } from '../../../context/settings';
import { useSwapDataState } from '../../../context/swap';

const SuccessfulStep: FC = () => {

    const { data } = useSettingsState()
    const { swap } = useSwapDataState()

    return (
        <>
            <div className="w-full px-3 md:px-8 py-12 grid grid-flow-row">
                <div className='flex place-content-center mb-12 md:mb-4'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="116" height="116" viewBox="0 0 116 116" fill="none">
                        <circle cx="58" cy="58" r="58" fill="#55B585" fillOpacity="0.1" />
                        <circle cx="58" cy="58" r="45" fill="#55B585" fillOpacity="0.3" />
                        <circle cx="58" cy="58" r="30" fill="#55B585" />
                        <path d="M44.5781 57.245L53.7516 66.6843L70.6308 49.3159" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
                    </svg>
                </div>
                <div className="flex items-center text-center mb-14 md:mb-6 mx-5 md:mx-24">
                    <label className="block text-lg font-lighter leading-6 text-pink-primary-300">Your swap successfully completed. You can view it in the explorer, or go ahead swap more!</label>
                </div>
                <div className="mb-2.5 md:-6 w-full justify-center">
                    <Link key="/" href="/">
                        <a className="shadowed-button group disabled:text-white-alpha-100 disabled:bg-pink-primary-600 disabled:cursor-not-allowed bg-pink-primary relative w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none focus:ring-0 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out">
                            Swap more
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </a>
                    </Link>
                </div>
                <div className="text-white text-sm md:mt-3 mt-0">
                    {
                        data.networks && swap?.transaction_id &&
                        <a href={data.networks.filter(x => x.code === swap?.network)[0]?.transaction_explorer_template.replace("{0}", swap?.transaction_id)}
                            target="_blank"
                            className="text-sm w-full flex justify-center py-3 px-4 rounded-md text-pink-primary border border-pink-primary uppercase">
                            View in Explorer
                            <ExternalLinkIcon className='ml-2 h-5 w-5' />
                        </a>
                    }

                </div>
            </div>

        </>
    )
}

export default SuccessfulStep;