import Link from 'next/link';
import { FC } from 'react'
import { useSwapDataState } from '../../../context/swap';
import SubmitButton from '../../buttons/submitButton';

const FailedPage: FC = () => {
    const { swap } = useSwapDataState()
    console.log("swap",swap)
    return (
        <>
            <div className="w-full px-3 md:px-8 py-12 grid grid-flow-row">
                <div className='flex place-content-center mb-12 md:mb-4'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="116" height="116" viewBox="0 0 116 116" fill="none">
                        <circle cx="58" cy="58" r="58" fill="#E43636" fillOpacity="0.1" />
                        <circle cx="58" cy="58" r="45" fill="#E43636" fillOpacity="0.5" />
                        <circle cx="58" cy="58" r="30" fill="#E43636" />
                        <path d="M48 69L68 48" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
                        <path d="M48 48L68 69" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
                    </svg>
                </div>
                <div className="flex items-center text-center mb-14 md:mb-6 mx-5 md:mx-24 text-center grow">
                    <label className="block text-lg font-lighter leading-6 text-light-blue text-center grow">{swap ? "Swap failed":"Swap not found"}</label>
                </div>
                <a href="https://discord.com/invite/KhwYN35sHy" className="group disabled:text-white-alpha-100 disabled:bg-pink-primary-600 disabled:cursor-not-allowed bg-pink-primary relative w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out">
                    Open Discord
                </a>
            </div>
        </>
    )
}

export default FailedPage;