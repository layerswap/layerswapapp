import React from 'react'
import GoHomeButton from './utils/GoHome';

export default function Navbar() {

    return (
        <div className='mt-[45px] mb-4 pl-[44px] overflow-hidden hidden md:block w-full'>
            <GoHomeButton className='h-11 w-auto text-primary-logoColor fill-primary-text cursor-pointer' />
        </div>
    )
}