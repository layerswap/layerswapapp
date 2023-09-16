import { HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { FC } from 'react'

const Delay: FC = () => {
    return (
        <div>
            <div className='p-3 bg-secondary-700 text-white rounded-lg border border-secondary-500'>
                <div className="flex items-center">
                    <HelpCircle className='h-8 w-8 text-primary-500 mr-4' />
                    <label className="block text-sm md:text-base font-medium">What&apos;s happening?</label>
                </div>
                <div className='mt-4 text-xs md:text-sm text-white'>
                    <p className='text-md '>This usually means that the exchange needs additional verification.
                        <Link target='_blank' href="https://docs.layerswap.io/user-docs/why-is-coinbase-transfer-taking-so-long"
                            className='disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed ml-1 underline hover:no-underline cursor-pointer'>Learn More</Link></p>
                    <ul className="list-inside list-decimal font-light space-y-1 mt-2 text-left ">
                        <li>Check your email for details from Coinbase</li>
                        <li>Check your Coinbase account&apos;s transfer history</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Delay;
