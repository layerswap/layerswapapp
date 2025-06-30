import { ReactNode, useState } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tab'
import ExchangeTabIcon from '@/components/icons/ExchangeTabIcon'
import NetworkTabIcon from '@/components/icons/NetworkTabIcon'

type Props = {
    networkForm: ReactNode;
    exchangeForm: ReactNode;
}

export default function NetworkExchangeTabs({ networkForm, exchangeForm }: Props) {
    const [hovered, setHovered] = useState(false)

    return (
        <Tabs defaultValue="network" className="relative" >
            <div className='relative'>
                <motion.div
                    onHoverStart={() => setHovered(true)}
                    onHoverEnd={() => setHovered(false)}
                    animate={{ width: hovered ? 180 : 48 }}
                    className="absolute right-[99%] top-24 overflow-hidden rounded-l-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                >
                    <TabsList className="flex flex-col bg-secondary-500 h-full !pl-1.5 !pr-3 py-2 w-full space-y-2">
                        <TabsTrigger value="network" className="w-full text-white grid grid-cols-4 justify-start !p-1 data-[state=active]:bg-secondary-300 hover:bg-secondary-100 overflow-hidden">
                            <div className="h-6 w-6">
                                <NetworkTabIcon className="h-6 w-6" />
                            </div>
                            {hovered && <span className="text-sm whitespace-nowrap">Swap</span>}
                        </TabsTrigger>
                        <TabsTrigger value="exchange" className="w-full text-white flex items-center justify-start !p-1 data-[state=active]:bg-secondary-300 hover:bg-secondary-100 overflow-hidden">
                            <div className="h-6 w-6">
                                <ExchangeTabIcon className="h-6 w-6" />
                            </div>
                            {hovered && <span className="text-sm whitespace-nowrap">Deposit from CEX</span>}
                        </TabsTrigger>
                    </TabsList>
                </motion.div>
            </div>

            <div>
                <TabsContent value="network" className='!mt-0'>
                    {networkForm}
                </TabsContent>
                <TabsContent value="exchange" className='!mt-0'>
                    {exchangeForm}
                </TabsContent>
            </div>
        </Tabs>
    )
}
