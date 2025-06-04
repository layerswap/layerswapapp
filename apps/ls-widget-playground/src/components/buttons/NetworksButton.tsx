"use client"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "@/components/ui/accordion"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import clsx from "clsx";
import { useState } from "react";
import { useSettingsState } from "@/context/settings"
import { CustomRadioGroup } from "../ui/radiogroup";
import { useFeaturedNetwork } from "@/context/ConfigContext";
const DirectionValues = [
    { value: 'from', component: <> <span>From</span></> },
    { value: 'to', component: <><span>To</span></> },
]

const oppositeDirectionValues = [
    { value: 'none', label: 'None' },
    { value: 'onlyNetworks', label: 'Only networks' },
    { value: 'onlyExchanges', label: 'Only exchanges' },
]

export function NetworksButton() {
    const [activeTab, setActiveTab] = useState<'from' | 'to'>('from');
    const [oppositeValue, setOppositeValue] = useState("none")
    const { sourceExchanges, sourceRoutes, destinationRoutes, destinationExchanges } = useSettingsState();
    const mergedSource = [...sourceRoutes, ...sourceExchanges];
    const mergedDestination = [...destinationRoutes, ...destinationExchanges];
    const { updateFeaturedNetwork } = useFeaturedNetwork()
    const [selectedNetwork, setSelectedNetwork] = useState<string | undefined>(undefined)

    const handleNetworkSelect = (value: string) => {
        setSelectedNetwork(value)
        updateFeaturedNetworkLogic(activeTab, value, oppositeValue)
    }
    const handleDirectionChange = (direction: 'from' | 'to') => {
        setActiveTab(direction)
        if (selectedNetwork) {
            updateFeaturedNetworkLogic(direction, selectedNetwork, oppositeValue)
        }
    }
    const handleOppositeChange = (value: string) => {
        setOppositeValue(value)
        if (selectedNetwork) {
            updateFeaturedNetworkLogic(activeTab, selectedNetwork, value)
        }
    }
    const updateFeaturedNetworkLogic = (
        direction: 'from' | 'to',
        network: string,
        opposite: 'none' | 'onlyNetworks' | 'onlyExchanges' | string
    ) => {
        updateFeaturedNetwork(
            direction,
            network,
            opposite === 'none'
                ? undefined
                : opposite === 'onlyNetworks' || opposite === 'onlyExchanges'
                    ? opposite
                    : [opposite]
        )
    }

    return (
        <Accordion type="multiple" >
            <AccordionItem value="networks">
                <AccordionTrigger>Featured network</AccordionTrigger>
                <AccordionContent>
                    <Select onValueChange={handleNetworkSelect}>
                        <SelectTrigger className="w-full rounded-xl p-3 bg-secondary-600">
                            <SelectValue placeholder="Networks" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                            <SelectGroup>
                                {(activeTab === 'from' ? mergedSource : mergedDestination)
                                    .map(({ display_name, logo, name }, index) => (
                                        <SelectItem key={index} value={name as string} >
                                            <div className="flex items-center space-x-1.5">
                                                <img
                                                    src={logo}
                                                    alt="Project logo"
                                                    loading="eager"
                                                    className=" rounded-sm w-6 h-6"
                                                />
                                                <p>{display_name}</p>
                                            </div>
                                        </SelectItem>
                                    ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <div className="my-1 rounded-xl p-3 bg-secondary-600  flex items-center justify-between gap-1 h-12">
                        {
                            DirectionValues.map((v, index) => (
                                <button
                                    key={index}
                                    className={clsx('rounded-xl transition-colors gap-1 place-self-center w-full py-2', {
                                        'bg-primary-500': activeTab === v.value,
                                    })}
                                    onClick={() => handleDirectionChange(v.value as 'from' | 'to')}
                                >
                                    {v.component}
                                </button>
                            ))
                        }
                    </div>
                    <Accordion type="multiple" className=" bg-secondary-600">
                        <AccordionItem value="oppositeNetworks" className="bg-secondary-600">
                            <AccordionTrigger className="w-full rounded-xl p-3 bg-secondary-600">Opposite direction filtration</AccordionTrigger>
                            <AccordionContent className="bg-secondary-600 pb-3">
                                <CustomRadioGroup options={oppositeDirectionValues}
                                    value={oppositeValue}
                                    onChange={handleOppositeChange} />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}