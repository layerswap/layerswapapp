"use client";
import {
    CardRadiusButton, InitialSettingsButton, ResetButton, CloseButton, ColorsContent, ThemeButton, ManageExternallyButton, LoadingButton,
    ColorsTrigger, CardRadiusButtonTrigger, ThemeButtonTrigger, InitialSettingsButtonTrigger, ManageExternallyTriger, LoadingButtonTrigger,
    ConfigurationButton,
    ConfigurationButtonTrigger,
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

const accordionElements = {
    "Theme": [
        {
            trigger: <ColorsTrigger />,
            content: <ColorsContent />
        },
        {
            trigger: <CardRadiusButtonTrigger />,
            content: <CardRadiusButton />
        },
        {
            trigger: <ThemeButtonTrigger />,
            content: <ThemeButton />
        },
        {
            trigger: <ConfigurationButtonTrigger />,
            content: <ConfigurationButton />
        }
    ],
    "Widget configs": [
        {
            trigger: <InitialSettingsButtonTrigger />,
            content: <InitialSettingsButton />
        },
    ],
    // "Wallet configs": [
    //     {
    //         trigger: <ManageExternallyTriger />,
    //         content: <ManageExternallyButton />
    //     },
    // ],
    "Other": [
        {
            trigger: <LoadingButtonTrigger />,
            content: <LoadingButton />
        },
    ]
}

export function ControlPanel() {
    const [activeTab, setActiveTab] = useState('design')

    return (
        <div className="text-primary-text w-[500px] min-h-screen bg-secondary-800  overflow-y-auto h-full styled-scroll">
            <div className="flex items-center justify-between h-16 p-6 shrink-0 sticky top-0 bg-secondary-800 z-20">
                <h1 className="text-2xl ">Layerswap Widget</h1>
                <div className='flex gap-4 justify-end'>
                    <ResetButton />
                    <CloseButton />
                </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="design" className="my-4 space-y-6 p-6 pt-0">
                <TabsList className="flex items-center bg-secondary-600 hover:bg-secondary-500 transition-colors duration-200">
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
                    <Accordion collapsible type="single" className="flex flex-col gap-5 w-full border-none bg-transparent">
                        {
                            Object.entries(accordionElements).map(([groupName, items]) => (
                                <div key={groupName}>
                                    <h5 className="text-sm font-semibold mb-2 text-secondary-text">
                                        {groupName}
                                    </h5>
                                    <div className="space-y-2">
                                        {
                                            items.map((item, index) => (
                                                <AccordionItem key={`${groupName}-${index}`}
                                                    value={`item-${groupName}-${index}`}
                                                    className="bg-secondary-700 hover:brightness-110 transition-colors duration-200 rounded-xl p-2">
                                                    <AccordionTrigger className="flex justify-normal gap-2 overflow-hidden">
                                                        {item.trigger}
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        {item.content}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))
                                        }
                                    </div>
                                </div>
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
