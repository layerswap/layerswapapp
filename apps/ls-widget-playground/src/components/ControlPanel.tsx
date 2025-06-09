"use client";
import {
    CardRadiusButton, NetworksButton, ResetButton, CloseButton, ColorsContent, ThemeButton, ManageExternallyButton,
    ColorsTrigger, CardRadiusButtonTrigger, ThemeButtonTrigger, NetworksButtonTrigger, ManageExternallyTriger
} from "./buttons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import clsx from "clsx";
import { Code, Palette } from 'lucide-react';
import { useState } from "react";
import { CodeSegment } from "./CodeSegment";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "@/components/ui/accordion"

const tabValues = [
    { value: 'design', component: <><Palette /> <span>Design</span></> },
    { value: 'code', component: <><Code /> <span>Code</span></> },
]


const accordionElements = [
    {
        trigger: <ColorsTrigger />,
        content: <ColorsContent />
    },
    {
        trigger: <CardRadiusButtonTrigger />,
        content: <CardRadiusButton />
    },
    {
        trigger: <NetworksButtonTrigger />,
        content: <NetworksButton />
    },
    {
        trigger: <ThemeButtonTrigger />,
        content: <ThemeButton />
    },
    {
        trigger: <ManageExternallyTriger />,
        content: <ManageExternallyButton />
    },
]

export function ControlPanel() {
    const [activeTab, setActiveTab] = useState('design')

    return (
        <div className="text-primary-text w-[600px] min-h-screen bg-secondary-800  overflow-y-auto h-full styled-scroll">
            <div className="flex items-center justify-between h-16 p-6 shrink-0 sticky top-0 bg-secondary-800 z-20">
                <h1 className="text-2xl ">Layerswap Widget</h1>
                <div className='flex gap-4 justify-end'>
                    <ResetButton />
                    <CloseButton />
                </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="design" className="my-4 space-y-6 p-6 pt-0">
                <TabsList className="flex items-center bg-secondary-600">
                    {
                        tabValues.map((v, index) => (
                            <TabsTrigger
                                key={index}
                                value={v.value}
                                className={clsx('bg-transparent transition-colors gap-1 place-self-center w-full py-2', {
                                    'bg-primary-500': activeTab == v.value,
                                })}
                            >
                                {v.component}
                            </TabsTrigger>
                        ))
                    }
                </TabsList>
                <TabsContent value="design">
                    <Accordion collapsible type="single" className="flex flex-col gap-2 w-full border-none bg-transparent">
                        {
                            accordionElements.map((item, index) => (
                                <AccordionItem key={index} value={`item-${index}`} className="bg-secondary-700 rounded-xl p-2">
                                    <AccordionTrigger className="flex justify-normal gap-2 overflow-hidden">
                                        {item.trigger}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        {item.content}
                                    </AccordionContent>
                                </AccordionItem>
                            ))
                        }
                    </Accordion>
                </TabsContent>
                <TabsContent value="code">
                    <CodeSegment />
                </TabsContent>
            </Tabs>
        </div>
    );
}
