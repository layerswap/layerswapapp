import Layout from '../components/layout'
import React, { useEffect } from 'react'
import { useRouter } from 'next/router';
import { getTempData } from '../lib/openLink';

export default function Salon() {
    const router = useRouter();

    useEffect(() => {
        const temp_data = getTempData()
        const five_minutes_before = new Date(new Date().setMinutes(-5))
        if (new Date(temp_data?.date) >= five_minutes_before) {
            router.push({
                pathname: "/",
                query: { ...(temp_data?.query || {}), coinbase_redirect: true }
            })
        }
    }, [])

    return (
        <Layout hideFooter={true} hideNavbar={true}>
            <div className="h-full min-h-screen flex flex-col justify-center">
                <div className='flex place-content-center mb-4'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 116 116" fill="none">
                        <circle cx="58" cy="58" r="58" fill="#55B585" fillOpacity="0.1" />
                        <circle cx="58" cy="58" r="45" fill="#55B585" fillOpacity="0.3" />
                        <circle cx="58" cy="58" r="30" fill="#55B585" />
                        <path d="M44.5781 57.245L53.7516 66.6843L70.6308 49.3159" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
                    </svg>
                </div>
                <div className="flex text-center place-content-center mt-1 md:mt-1">
                    <p className="block text-md font-lighter leading-6 text-pink-primary-300"> Exchange account successfully connected </p>
                </div>
                <div className="flex text-center place-content-center mt-1 md:mt-1">
                    <p className="block text-md font-lighter leading-6 text-pink-primary-300"> You can close this window now</p>
                </div>
            </div>
        </Layout>
    )
}
