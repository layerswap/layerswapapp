import { useState } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tab'
import ExchangeTabIcon from '@/components/icons/ExchangeTabIcon'
import NetworkTabIcon from '@/components/icons/NetworkTabIcon'

export default function NetworkExchangeTabs() {
    const [hovered, setHovered] = useState(false)

    return (
        <Tabs defaultValue="network" className="relative">
            <motion.div
                onHoverStart={() => setHovered(true)}
                onHoverEnd={() => setHovered(false)}
                animate={{ width: hovered ? 180 : 48 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute -right-1.5 top-24 overflow-hidden rounded-l-lg"
            >
                <TabsList className="flex flex-col bg-secondary-500 h-full !pl-1.5 !pr-3 py-2 w-full">
                    <TabsTrigger value="network" className="w-full text-white flex items-center justify-start !p-1 data-[state=active]:bg-secondary-300 gap-2">
                        <ExchangeTabIcon className="h-6 w-6" />
                        {hovered && <span className="text-sm whitespace-nowrap">Network</span>}
                    </TabsTrigger>
                    <TabsTrigger value="exchange" className="w-full text-white flex items-center justify-start !p-1 data-[state=active]:bg-secondary-300 gap-2">
                        <NetworkTabIcon className="h-6 w-6" />
                        {hovered && <span className="text-sm whitespace-nowrap">Deposit from CEX</span>}
                    </TabsTrigger>
                </TabsList>
            </motion.div>

            {/* <div className="mr-[56px] sm:mr-[180px] w-full">
                <TabsContent value="network">
                    <div className="p-4">Swap Form Content</div>
                </TabsContent>
                <TabsContent value="exchange">
                    <div className="p-4">Deposit from CEX Content</div>
                </TabsContent>
            </div> */}
        </Tabs>
    )
}
