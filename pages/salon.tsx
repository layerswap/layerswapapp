import Layout from '../components/layout'
import React from 'react'
import IntroCard from '../components/introCard';

export default function Salon() {
    return (
        <Layout>
            <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-3xl">
                <div className='flex flex-col space-y-5'>
                    <div className="w-full px-3 md:px-8 py-12 grid grid-flow-row bg-darkBlue shadow-card">
                        <div className='flex place-content-center mb-12 md:mb-4'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="116" height="116" viewBox="0 0 116 116" fill="none">
                                <circle cx="58" cy="58" r="58" fill="#55B585" fillOpacity="0.1" />
                                <circle cx="58" cy="58" r="45" fill="#55B585" fillOpacity="0.3" />
                                <circle cx="58" cy="58" r="30" fill="#55B585" />
                                <path d="M44.5781 57.245L53.7516 66.6843L70.6308 49.3159" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div className="flex text-center place-content-center mt-1 md:mt-1">
                            <p className="block text-lg font-lighter leading-6 text-pink-primary-300"> CEX account successfully connected </p>
                        </div>
                        <div className="flex text-center place-content-center mt-1 md:mt-1">
                            <p className="block text-lg font-lighter leading-6 text-pink-primary-300"> You may close this window </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    )
}
