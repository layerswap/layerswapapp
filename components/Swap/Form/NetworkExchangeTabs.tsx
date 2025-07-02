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
            icon: <NetworkTabIcon className="h-6 w-6" />,
            content: networkForm
        },
        {
            id: 'exchange',
            name: 'Deposit from CEX',
            icon: <ExchangeTabIcon className="h-6 w-6" />,
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
                    className="absolute right-[99%] top-24 overflow-hidden rounded-l-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                >
                    <div className="flex flex-col bg-secondary-500 h-full !pl-1.5 !pr-3 py-2 w-full space-y-2">
                        {
                            tabs.map((tab) => (
                                <button
                                    type='button'
                                    key={tab.id}
                                    onClick={() => setActiveTabName(tab.id)}
                                    className={clsx(
                                        'w-full text-primary-text flex items-center justify-start !p-1 hover:bg-secondary-100 overflow-hidden rounded-lg',
                                        { 'bg-secondary-300': activeTabName === tab.id }
                                    )}
                                >
                                    <div className="h-6 w-6">
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
