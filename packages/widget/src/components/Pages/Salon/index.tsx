import React, { FC, useEffect } from 'react'
import { clearTempData, getTempData } from '../../../lib/openLink';
import AppWrapper, { AppPageProps } from '../../AppWrapper';
import { useAppRouter } from '../../../context/AppRouter/RouterProvider';

const Comp: FC = () => {
    const router = useAppRouter();

    useEffect(() => {
        const temp_data = getTempData()
        if (!temp_data)
            return
        if (temp_data.swap_id) {
            clearTempData()
            router.push({
                pathname: `/swap/${temp_data.swap_id}`,
                query: { ...(temp_data?.query || {}), coinbase_redirect: true }
            })
        }
        else {
            router.push({
                pathname: "/",
                query: { ...(temp_data?.query || {}), coinbase_redirect: true }
            })
        }
    }, [router])
    return (
        <div className="h-full min-h-screen flex flex-col justify-center text-secondary-text text-md font-lighter leading-6">
            <div className='flex place-content-center mb-4'>
                <svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 116 116" fill="none">
                    <circle cx="58" cy="58" r="58" fill="#55B585" fillOpacity="0.1" />
                    <circle cx="58" cy="58" r="45" fill="#55B585" fillOpacity="0.3" />
                    <circle cx="58" cy="58" r="30" fill="#55B585" />
                    <path d="M44.5781 57.245L53.7516 66.6843L70.6308 49.3159" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
                </svg>
            </div>
            <div className="flex flex-col text-center place-content-center space-y-2">
                <p className="block text-primary-text font-bold text-lg"> Exchange account successfully connected </p>
                <p className="block"> You can close this window now</p>
            </div>
        </div>
    )
}

export const Salon: FC<AppPageProps> = (props) => {

    return (
        <AppWrapper {...props}>
            <Comp />
        </AppWrapper>
    )
}

