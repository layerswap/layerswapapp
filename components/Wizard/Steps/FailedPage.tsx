import Link from 'next/link';
import { FC } from 'react'
import SubmitButton from '../../buttons/submitButton';

const FailedPage: FC = () => {

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                <div className='flex place-content-center mb-12 md:mb-4'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="116" height="116" viewBox="0 0 116 116" fill="none">
                        <circle cx="58" cy="58" r="58" fill="#E43636" fillOpacity="0.1"/>
                        <circle cx="58" cy="58" r="45" fill="#E43636" fillOpacity="0.5"/>
                        <circle cx="58" cy="58" r="30" fill="#E43636"/>
                        <path d="M48 69L68 48" stroke="white" strokeWidth="3.15789" strokeLinecap="round"/>
                        <path d="M48 48L68 69" stroke="white" strokeWidth="3.15789" strokeLinecap="round"/>
                    </svg>                       
                </div>
                <div className="flex items-center text-center mb-14 md:mb-6 mx-5 md:mx-24">
                    <label className="block text-lg font-lighter leading-6 text-light-blue">Your swap successfully completed. You can view it in the explorer, or go ahead swap more!</label>
                </div>
                <div className="mb-2.5 md:-6 w-full justify-center">
                    <Link key="/" href="/">
                        <a className="flex text-lg h-12 md:h-6 font-lighter leading-6 text-darkblue place-content-center p-2.5 md:p-0 border md:border-none rounded-lg border-darkblue block">
                            Swap more
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </a>
                    </Link>
                </div>
                <div className="text-white text-sm md:mt-3 mt-0">
                    <SubmitButton isDisabled={false} icon="" isSubmitting={false} onClick={()=>{}}>
                        View in Eplorer
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default FailedPage;