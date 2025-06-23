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
        <Tabs defaultValue="network" className="relative">
            <motion.div
                onHoverStart={() => setHovered(true)}
                onHoverEnd={() => setHovered(false)}
                animate={{ width: hovered ? 180 : 48 }}
                className="absolute right-[95%] top-24 overflow-hidden rounded-l-lg"
                layoutId="bubble"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            >
                <TabsList className="flex flex-col bg-secondary-500 h-full !pl-1.5 !pr-3 py-2 w-full space-y-2">
                    <TabsTrigger value="network" className="w-full text-white flex items-center justify-start !p-1 data-[state=active]:bg-secondary-300 hover:bg-secondary-100">
                        <NetworkTabIcon className="h-6 w-6" />
                        {hovered && <span className="text-sm whitespace-nowrap">Swap</span>}
                    </TabsTrigger>
                    <TabsTrigger value="exchange" className="w-full text-white flex items-center justify-start !p-1 data-[state=active]:bg-secondary-300 hover:bg-secondary-100">
                        <ExchangeTabIcon className="h-6 w-6" />
                        {hovered && <span className="text-sm whitespace-nowrap">Deposit from CEX</span>}
                    </TabsTrigger>
                </TabsList>
            </motion.div>

            <div className="mr-[56px] sm:mr-[180px] w-full">
                <TabsContent value="network">
                    <div className="p-4">{networkForm}</div>
                </TabsContent>
                <TabsContent value="exchange">
                    <div className="p-4">{exchangeForm}</div>
                </TabsContent>
            </div>
        </Tabs>
    )
}
