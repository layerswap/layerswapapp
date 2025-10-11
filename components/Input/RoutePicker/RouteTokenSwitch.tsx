import { FC } from "react";
import { motion } from "framer-motion";
import TokenIcon from "../../icons/TokenIcon";
import { Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import clsx from "clsx";
import { useRouteTokenSwitchStore } from "@/stores/routeTokenSwitchStore";

const switchValues = [
    { value: false, id: 'network', label: "Group by Network", icon: Globe },
    { value: true, id: 'token', label: "Group by Token", icon: TokenIcon },
]

const RouteTokenSwitch: FC = () => {

    const showTokens = useRouteTokenSwitchStore((s) => s.showTokens)
    const setShowTokens = useRouteTokenSwitchStore((s) => s.setShowTokens)
    const activeTab = switchValues.find(item => item.value === showTokens)?.id || switchValues[0].id;

    return (
        <div className="flex justify-end">
            <div className="relative flex items-center bg-secondary-500 rounded-lg p-1">
                {
                    switchValues.map((item, index) => (
                        <Tooltip key={index}>
                            <TooltipTrigger
                                type="button"
                                onClick={() => { setShowTokens(item.value); }}
                                className="z-10 flex items-center justify-center rounded-2xl px-4 py-1 relative">
                                {activeTab === item.id && (
                                    <motion.span
                                        layoutId="bubble"
                                        className="absolute inset-0 z-10 rounded-md bg-secondary-300 mix-blend-color"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <item.icon
                                    className={clsx("text-primary-text-tertiary h-5 w-5", {
                                        "!text-primary-text": activeTab === item.id,
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