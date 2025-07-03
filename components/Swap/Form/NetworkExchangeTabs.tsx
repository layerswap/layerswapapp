import { ReactNode, useState } from 'react'
import { motion } from 'framer-motion'
import ExchangeTabIcon from '@/components/icons/ExchangeTabIcon'
import NetworkTabIcon from '@/components/icons/NetworkTabIcon'
import clsx from 'clsx'
import { Widget } from '@/components/Widget/Index'
type Props = {
    networkForm: ReactNode;
    exchangeForm: ReactNode;
}

export default function NetworkExchangeTabs({ networkForm, exchangeForm }: Props) {
    const [hovered, setHovered] = useState(false)
    const [activeTabName, setActiveTabName] = useState('network')

    const tabs = [
        {
            id: 'network',
            name: 'Swap',
            icon: <NetworkTabIcon className="h-6 w-6 max-sm:h-5 max-sm:w-5" />,
            content: networkForm
        },
        {
            id: 'exchange',
            name: 'Deposit from CEX',
            icon: <ExchangeTabIcon className="h-6 w-6 max-sm:h-5 max-sm:w-5" />,
            content: exchangeForm
        }
    ]

    return (
        <>
            <div className='relative'>
                <motion.div
                    onHoverStart={() => setHovered(true)}
                    onHoverEnd={() => setHovered(false)}
                    animate={{ width: hovered ? 180 : 48 }}
                    className="absolute right-[99%] top-24 overflow-hidden rounded-l-lg max-sm:right-19 max-sm:z-20 max-sm:top-[15px] max-sm:w-16! max-sm:rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                >
                    <div className="flex flex-col bg-secondary-500 h-full !pl-1.5 !pr-3 py-2 w-full space-y-2 max-sm:flex-row max-sm:space-y-0 max-sm:pr-1.5! max-sm:py-1.5">
                        {
                            tabs.map((tab) => (
                                <button
                                    type='button'
                                    key={tab.id}
                                    onClick={() => setActiveTabName(tab.id)}
                                    className={clsx(
                                        'w-full text-primary-text flex items-center justify-start !p-1 hover:bg-secondary-100 overflow-hidden rounded-lg max-sm:justify-center max-sm:px-0',
                                        { 'bg-secondary-300': activeTabName === tab.id }
                                    )}
                                >
                                    <div className="h-6 w-6 max-sm:h-5 max-sm:w-5">
                                        {tab.icon}
                                    </div>
                                    {hovered && <span className="text-sm whitespace-nowrap">{tab.name}</span>}
                                </button>
                            ))
                        }
                    </div>
                </motion.div>
            </div>
            <Widget className="sm:min-h-[450px] h-full">
                {
                    tabs.map((tab) => (
                        <div
                            key={tab.id}

                            className={clsx('transition-all duration-200', {
                                'hidden': activeTabName !== tab.id,
                                'block': activeTabName === tab.id
                            })}
                        >
                            {tab.content}
                        </div>
                    ))
                }
            </Widget>
        </>

    )
}
