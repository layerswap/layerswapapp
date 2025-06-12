"use client";
import {
    CardRadiusButton, NetworksButton, ResetButton, CloseButton, ColorsContent, ThemeButton, ManageExternallyButton, LoadingButton,
    ColorsTrigger, CardRadiusButtonTrigger, ThemeButtonTrigger, NetworksButtonTrigger, ManageExternallyTriger, LoadingButtonTrigger,
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
    {
        trigger: <LoadingButtonTrigger />,
        content: <LoadingButton />
    },
]

export function ControlPanel() {
    const [activeTab, setActiveTab] = useState('design')

    return (
        <div className="tw-text-primary-text tw-w-[450px] tw-min-h-screen tw-bg-secondary-800  tw-overflow-y-auto tw-h-full tw-styled-scroll">
            <div className="tw-flex tw-items-center tw-justify-between tw-h-16 tw-p-6 tw-shrink-0 tw-sticky tw-top-0 tw-bg-secondary-800 tw-z-20">
                <h1 className="tw-text-2xl">Layerswap Widget</h1>
                <div className="tw-flex tw-gap-4 tw-justify-end">
                    <ResetButton />
                    <CloseButton />
                </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="design" className="tw-my-4 tw-space-y-6 tw-p-6 tw-pt-0">
                <TabsList className="tw-flex tw-items-center tw-bg-secondary-600">
                    {
                        tabValues.map((v, index) => (
                            <TabsTrigger
                                key={index}
                                value={v.value}
                                className={'tw-bg-transparent tw-transition-colors tw-gap-1 tw-place-self-center tw-w-full tw-py-2'}
                            >
                                {v.component}
                            </TabsTrigger>
                        ))
                    }
                </TabsList>
                <TabsContent value="design">
                    <Accordion collapsible type="single" className="tw-flex tw-flex-col tw-gap-2 tw-w-full tw-border-none tw-bg-transparent">
                        {
                            accordionElements.map((item, index) => (
                                <AccordionItem key={index} value={`item-${index}`} className="tw-bg-secondary-700 tw-rounded-xl tw-p-2">
                                    <AccordionTrigger className="tw-flex tw-justify-normal tw-gap-2 tw-overflow-hidden">
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
