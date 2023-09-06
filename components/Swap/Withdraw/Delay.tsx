import { Info } from 'lucide-react';
import { FC } from 'react'

const Delay: FC = () => {
    return (
        <div>
            <p className='text-left pb-2 text-sm text-primary-text'>This usually means that the exchange needs additional verification.</p>
            <div className='p-4 bg-secondary-700 text-white rounded-lg border border-secondary-500'>
                <div className="flex items-center">
                    <Info className='h-5 w-5 text-primary-600 mr-3' />
                    <label className="block text-sm md:text-base font-medium leading-6">What to do?</label>
                </div>
                <ul className="list-disc font-light space-y-1 text-xs md:text-sm mt-2 ml-8 text-left">
                    <li>Check your email for details from Coinbase</li>
                    <li>Check your Coinbase account's transfer history</li>
                    <li><button className='disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed underline hover:no-underline cursor-pointer'>Learn More</button></li>
                </ul>
            </div>
        </div>
    )
}

export default Delay;
