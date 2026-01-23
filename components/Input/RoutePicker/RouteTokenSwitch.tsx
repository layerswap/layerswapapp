import { FC } from "react";
import { motion } from "framer-motion";
import TokenIcon from "@/components/icons/TokenIcon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import clsx from "clsx";
import { useRouteTokenSwitchStore } from "@/stores/routeTokenSwitchStore";
import GlobeIcon from "@/components/icons/GlobeIcon";

const switchValues = [
    { value: false, id: 'network', label: "Group by Network", icon: GlobeIcon },
    { value: true, id: 'token', label: "Group by Token", icon: TokenIcon },
]

const RouteTokenSwitch: FC = () => {

    const showTokens = useRouteTokenSwitchStore((s) => s.showTokens)
    const setShowTokens = useRouteTokenSwitchStore((s) => s.setShowTokens)
    const activeTab = switchValues.find(item => item.value === showTokens)?.id || switchValues[0].id;

    return (
        <div className="flex justify-end">
            <div className="relative flex items-center bg-secondary-500 rounded-xl p-1">
                {
                    switchValues.map((item, index) => (
                        <Tooltip key={index}>
                            <TooltipTrigger
                                type="button"
                                onClick={() => { setShowTokens(item.value); }}
                                className="navigation-focus-ring-overlay-md z-10 flex items-center justify-center rounded-lg px-4 py-1 relative outline-hidden">
                                {activeTab === item.id && (
                                    <motion.span
                                        layoutId="bubble"
                                        className="absolute inset-0 z-10 rounded-lg bg-secondary-300"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <item.icon
                                    className={clsx("relative z-20 text-primary-text-tertiary h-5 w-5", {
                                        "text-primary-text!": activeTab === item.id,
                                    })}
                                />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{item.label}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
            </div>
        </div>
    );
};

export default RouteTokenSwitch;