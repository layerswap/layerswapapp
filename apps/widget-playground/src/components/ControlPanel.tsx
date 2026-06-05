"use client";
import {
    CardRadiusButton, InitialSettingsButton, ResetButton, CloseButton, ColorsContent, ThemeButton,
    ColorsTrigger, CardRadiusButtonTrigger, ThemeButtonTrigger, InitialSettingsButtonTrigger, LoadingButtonTrigger,
    ConfigurationButton,
    ConfigurationButtonTrigger,
    WidgetTypeSwitcher,
    DepositConfigButton,
    DepositConfigButtonTrigger,
    DepositDestinationsButton,
    DepositDestinationsButtonTrigger,
    DepositModeSwitcher,
} from "./buttons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import clsx from "clsx";
import { useMemo, useState } from "react";
import { CodeSegment } from "./CodeSegment";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "@/components/ui/accordion"
import { Code, Paintbrush } from "lucide-react";
import { useWidgetContext } from "@/context/ConfigContext";

const tabValues = [
    { value: 'design', component: <><Paintbrush /> <span className="text-xl">Design</span></> },
    { value: 'code', component: <><Code /> <span className="text-xl">Code</span></> },
]

type AccordionEntry = { trigger: React.ReactNode; content: React.ReactNode | null };
type AccordionGroup = { extras?: React.ReactNode; items: AccordionEntry[] };

export function ControlPanel() {
    const [activeTab, setActiveTab] = useState('design');
    const { widgetType } = useWidgetContext();

    const accordionElements: Record<string, AccordionGroup> = useMemo(() => {
        const themeGroup: AccordionGroup = {
            items: [
                { trigger: <ColorsTrigger />, content: <ColorsContent /> },
                { trigger: <CardRadiusButtonTrigger />, content: <CardRadiusButton /> },
                { trigger: <ThemeButtonTrigger />, content: <ThemeButton /> },
            ],
        };

        const widgetGroup: AccordionGroup = widgetType === 'deposit'
            ? {
                extras: <DepositModeSwitcher />,
                items: [
                    { trigger: <DepositConfigButtonTrigger />, content: <DepositConfigButton /> },
                    { trigger: <DepositDestinationsButtonTrigger />, content: <DepositDestinationsButton /> },
                ],
            }
            : {
                items: [
                    { trigger: <InitialSettingsButtonTrigger />, content: <InitialSettingsButton /> },
                    { trigger: <ConfigurationButtonTrigger />, content: <ConfigurationButton /> },
                ],
            };

        return {
            "Theme": themeGroup,
            [widgetType === 'deposit' ? "Deposit configs" : "Widget configs"]: widgetGroup,
            "Other": {
                items: [{ trigger: <LoadingButtonTrigger />, content: null }],
            },
        };
    }, [widgetType]);

    return (
        <div className="text-primary-text w-[500px] min-h-screen bg-secondary-900 overflow-y-auto h-full styled-scroll">
            <div className="flex items-center justify-between h-16 p-5 shrink-0 sticky bg-secondary-900 top-0 z-20">
                <h1 className="text-2xl ">Layerswap Widget</h1>
                <div className='flex gap-4 justify-end'>
                    <ResetButton />
                    <CloseButton />
                </div>
            </div>
            <WidgetTypeSwitcher />
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
                            Object.entries(accordionElements).map(([groupName, group]) => (
                                <div key={groupName}>
                                    <h5 className="text-lg mb-3 text-primary-text">
                                        {groupName}
                                    </h5>
                                    {group.extras && <div className="mb-3">{group.extras}</div>}
                                    <div className="space-y-3">
                                        {
                                            group.items.map((item, index) => (
                                                item.content ? (
                                                    <AccordionItem key={`${groupName}-${index}`}
                                                        value={`item-${groupName}-${index}`}
                                                        className="bg-secondary-700 hover:brightness-110 transition-colors duration-200 rounded-xl p-2">
                                                        <AccordionTrigger
                                                            className="flex justify-normal px-2 gap-2 overflow-hidden h-12 text-lg cursor-pointer"
                                                        >
                                                            {item.trigger}
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pt-3">
                                                            {item.content}
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                ) : (
                                                    <div key={`${groupName}-${index}`}
                                                        className="bg-secondary-700 hover:brightness-110 transition-colors duration-200 rounded-xl p-2">
                                                        <div className="flex justify-normal px-2 gap-2 overflow-hidden h-12 text-lg items-center">
                                                            {item.trigger}
                                                        </div>
                                                    </div>
                                                )
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
