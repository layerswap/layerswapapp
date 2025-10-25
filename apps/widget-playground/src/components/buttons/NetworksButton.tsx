"use client"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "@/components/ui/accordion"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import clsx from "clsx";
import { useSettingsState } from "@/context/settings"
import { CustomRadioGroup } from "../ui/radiogroup";
import { useWidgetContext } from "@/context/ConfigContext";
import { MultiSelect } from "@/components/ui/multiselect";
import { useEffect, useState } from "react";

const DirectionValues = [
    { value: 'from', component: <> <span>From</span></> },
    { value: 'to', component: <><span>To</span></> },
]

export function NetworksButton() {
    const { sourceExchanges, sourceRoutes, destinationRoutes } = useSettingsState();
    const mergedSource = [...sourceRoutes, ...sourceExchanges];
    const mergedDestination = [...destinationRoutes];
    const { featuredNetwork, updateFeaturedNetwork } = useWidgetContext();
    const { initialDirection, network, oppositeDirectionOverrides } = featuredNetwork || {};
    const [localState, setLocalState] = useState<string[]>(
        Array.isArray(oppositeDirectionOverrides)
            ? [...oppositeDirectionOverrides]
            : [],
    );

    useEffect(() => {
        if (Array.isArray(oppositeDirectionOverrides)) setLocalState(oppositeDirectionOverrides)
        else {
            setLocalState([])
        }
    }, [oppositeDirectionOverrides])

    const radioValue: "none" | "onlyNetworks" | "onlyExchanges" | "custom" =
        Array.isArray(oppositeDirectionOverrides)
            ? "custom"
            : oppositeDirectionOverrides ?? "none";

    return (
        <div >
            <Select value={network ?? ""} onValueChange={(val) => { updateFeaturedNetwork("network", val); }}>
                <SelectTrigger className="w-full rounded-xl p-3 bg-secondary-600 hover:bg-secondary-500 transition-colors duration-200">
                    <SelectValue placeholder="Networks" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectGroup>
                        {(initialDirection === 'from' ? mergedSource : mergedDestination)
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
            <div className="my-1 rounded-xl py-3 px-2 bg-secondary-600  flex items-center justify-between gap-1 h-12 hover:bg-secondary-500 transition-colors duration-200">
                {
                    DirectionValues.map((v, index) => (
                        <button
                            key={index}
                            className={clsx('rounded-xl transition-colors gap-1 place-self-center w-full py-2', {
                                'bg-primary-500': initialDirection === v.value,
                            })}
                            onClick={() => { updateFeaturedNetwork("initialDirection", v.value as 'from' | 'to') }}
                        >
                            {v.component}
                        </button>
                    ))
                }
            </div>
            <Accordion type="multiple" className=" bg-secondary-600 rounded-xl">
                <AccordionItem value="oppositeNetworks" className="bg-secondary-600 rounded-xl">
                    <AccordionTrigger className="w-full !rounded-xl p-3 bg-secondary-600 data-[state=closed]:hover:bg-secondary-500 transition-colors duration-200">Opposite direction filtration</AccordionTrigger>
                    <AccordionContent className="bg-secondary-600 pb-3 ">
                        <CustomRadioGroup value={radioValue} onChange={(val) => val !== "custom" && updateFeaturedNetwork("oppositeDirectionOverrides", val === "none" ? undefined : val as "onlyNetworks" | "onlyExchanges")}>
                            <CustomRadioGroup.Item value="none">None</CustomRadioGroup.Item>
                            <CustomRadioGroup.Item value="onlyNetworks">Only networks</CustomRadioGroup.Item>
                            <CustomRadioGroup.Item value="onlyExchanges">Only exchanges</CustomRadioGroup.Item>
                            <CustomRadioGroup.Item asChild value="custom" className="!w-full">
                                <MultiSelect
                                    onPopoverClose={() => { updateFeaturedNetwork("oppositeDirectionOverrides", localState) }}
                                    options={(initialDirection === "from" ? mergedSource : mergedDestination).map(n => ({
                                        label: n.display_name,
                                        value: n.name,
                                        icon: n.logo,
                                    }))}
                                    value={localState}
                                    onChange={(val) => setLocalState(val)}
                                    placeholder="Custom networks"
                                />
                            </CustomRadioGroup.Item>
                        </CustomRadioGroup>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}

export const NetworksButtonTrigger = () => {
    const { featuredNetwork } = useWidgetContext();
    const { networks } = useSettingsState()

    const network = networks.find(n => n.name == featuredNetwork?.network)

    return (
        <div className="flex justify-between w-full">
            <label>
                Featured network
            </label>
            {
                network &&
                <div className="flex items-center space-x-1.5">
                    <img
                        src={network?.logo}
                        alt="Project logo"
                        loading="eager"
                        className=" rounded-md w-6 h-6"
                    />
                    <p> {network?.display_name}</p>
                </div>
            }
        </div>
    );
}
