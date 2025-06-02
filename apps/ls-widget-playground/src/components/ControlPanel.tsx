"use client";
import { CardRadiusButton, ThemeButton, ResetButton, CloseButton, ColorsButton } from "./buttons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import clsx from "clsx";
import { Code, Palette } from 'lucide-react';
import { useState } from "react";
import { CodeSegment } from "./CodeSegment";

const tabValues = [
    {
        value: 'design',
        component: <><Palette /> <span>Design</span></>
    },
    {
        value: 'code',
        component: <><Code /> <span>Code</span></>
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
                    <div className="flex flex-col gap-4 w-full">
                        <CardRadiusButton />
                        <ColorsButton />
                    </div>
                </TabsContent>
                <TabsContent value="code">
                    <CodeSegment />
                </TabsContent>
            </Tabs>
        </div>
    );
}
