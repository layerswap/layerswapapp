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
    const { sourceExchanges, sourceRoutes, destinationRoutes, destinationExchanges } = useSettingsState();
    const mergedSource = [...sourceRoutes, ...sourceExchanges];
    const mergedDestination = [...destinationRoutes, ...destinationExchanges];
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
                <SelectTrigger className="tw-w-full tw-rounded-xl tw-p-3 tw-bg-secondary-600">
                    <SelectValue placeholder="Networks" />
                </SelectTrigger>
                <SelectContent className="tw-max-h-[300px] tw-overflow-y-auto">
                    <SelectGroup>
                        {(initialDirection === 'from' ? mergedSource : mergedDestination)
                            .map(({ display_name, logo, name }, index) => (
                                <SelectItem key={index} value={name as string} >
                                    <div className="tw-flex tw-items-center tw-space-x-1.5">
                                        <img
                                            src={logo}
                                            alt="Project logo"
                                            loading="eager"
                                            className="tw-rounded-sm tw-w-6 tw-h-6"
                                        />
                                        <p>{display_name}</p>
                                    </div>
                                </SelectItem>
                            ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
            <div className="tw-my-1 tw-rounded-xl tw-p-3 tw-bg-secondary-600 tw-flex tw-items-center tw-justify-between tw-gap-1 tw-h-12">
                {
                    DirectionValues.map((v, index) => (
                        <button
                            key={index}
                            className={clsx('tw-rounded-xl tw-transition-colors tw-gap-1 tw-place-self-center tw-w-full tw-py-2', {
                                'tw-bg-primary-500': initialDirection === v.value,
                            })}
                            onClick={() => { updateFeaturedNetwork("initialDirection", v.value as 'from' | 'to') }}
                        >
                            {v.component}
                        </button>
                    ))
                }
            </div>
            <Accordion type="multiple" className=" tw-bg-secondary-600 tw-rounded-xl">
                <AccordionItem value="oppositeNetworks" className="tw-bg-secondary-600 tw-rounded-xl">
                    <AccordionTrigger className="tw-w-full !tw-rounded-xl p-3 tw-bg-secondary-600">Opposite direction filtration</AccordionTrigger>
                    <AccordionContent className="tw-bg-secondary-600 tw-pb-3">
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
        <div className="tw-flex tw-justify-between tw-w-full">
            <label>
                Featured network
            </label>
            {
                network &&
                <div className="tw-flex tw-items-center tw-space-x-1.5">
                    <img
                        src={network?.logo}
                        alt="Project logo"
                        loading="eager"
                        className="tw-rounded-md tw-w-6 tw-h-6"
                    />
                    <p> {network?.display_name}</p>
                </div>
            }
        </div>
    );
}
