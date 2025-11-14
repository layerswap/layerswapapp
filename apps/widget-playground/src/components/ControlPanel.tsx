"use client";
import {
    CardRadiusButton, InitialSettingsButton, ResetButton, CloseButton, ColorsContent, ThemeButton,
    ColorsTrigger, CardRadiusButtonTrigger, ThemeButtonTrigger, InitialSettingsButtonTrigger, LoadingButtonTrigger,
    ConfigurationButton,
    ConfigurationButtonTrigger,
} from "./buttons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import clsx from "clsx";
import { useState } from "react";
import { CodeSegment } from "./CodeSegment";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "@/components/ui/accordion"
import Route from "@/public/icons/Route";

const tabValues = [
    { value: 'design', component: <><Route className="[&_path]:fill-current" /> <span className="text-xl">Design</span></> },
    { value: 'code', component: <><Route className="[&_path]:fill-current" /> <span className="text-xl">Code</span></> },
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
            // content: <LoadingButton />
        },
    ]
}

export function ControlPanel() {
    const [activeTab, setActiveTab] = useState('design')

    return (
        <div className="text-primary-text w-[500px] min-h-screen bg-secondary-900 overflow-y-auto h-full styled-scroll">
            <div className="flex items-center justify-between h-16 p-5 shrink-0 sticky bg-secondary-900 top-0 z-20">
                <h1 className="text-2xl ">Layerswap Widget</h1>
                <div className='flex gap-4 justify-end'>
                    <ResetButton />
                    <CloseButton />
                </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="design" className=" space-y-6 px-5">
                <TabsList className="flex items-center bg-secondary-700 hover:bg-secondary-600 transition-colors duration-200 rounded-xl !m-0">
                    {
                        tabValues.map((v, index) => (
                            <TabsTrigger
                                key={index}
                                value={v.value}
                                className={clsx('bg-transparent transition-colors gap-1 place-self-center w-full rounded-xl text-secondary-text', {
                                    'bg-secondary-300 !text-primary-text': activeTab == v.value,
                                })}
                            >
                                {v.component}
                            </TabsTrigger>
                        ))
                    }
                </TabsList>
                <TabsContent value="design" className=" mt-0">
                    <Accordion collapsible type="single" className="flex flex-col w-full border-none bg-transparent space-y-9 pt-9">
                        {
                            Object.entries(accordionElements).map(([groupName, items]) => (
                                <div key={groupName}>
                                    <h5 className="text-lg mb-3 text-primary-text">
                                        {groupName}
                                    </h5>
                                    <div className="space-y-3">
                                        {
                                            items.map((item, index) => (
                                                <AccordionItem key={`${groupName}-${index}`}
                                                    value={`item-${groupName}-${index}`}
                                                    className="bg-secondary-700 hover:brightness-110 transition-colors duration-200 rounded-xl p-2">
                                                    <AccordionTrigger
                                                        className={`flex justify-normal px-2 gap-2 overflow-hidden h-12 text-lg ${!item.content ? 'cursor-default' : 'cursor-pointer'}`}
                                                        hideChevron={!item.content}
                                                    >
                                                        {item.trigger}
                                                    </AccordionTrigger>
                                                    {item.content ?
                                                        <AccordionContent className="pt-3">
                                                            {item.content}
                                                        </AccordionContent>
                                                        : null
                                                    }
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
