import { FC } from "react";
import { motion } from "framer-motion";
import TokenIcon from "../../icons/TokenIcon";
import { Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";

interface RouteTokenSwitchProps {
    showTokens: boolean;
    setShowTokens: (val: boolean) => void;
}

const RouteTokenSwitch: FC<RouteTokenSwitchProps> = ({ showTokens, setShowTokens }) => {
    return (
        <div className="flex justify-end mb-2">
            <div className="relative flex items-center bg-secondary-500 rounded-lg p-1">
                <motion.div
                    layout
                    className="absolute top-1 left-1 bottom-1 w-[48px] rounded-lg bg-secondary-200"
                    animate={{ x: showTokens ? 53.5 : 1.5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <Tooltip>
                    <TooltipTrigger>
                        <button
                            className="z-10 flex items-center justify-center rounded-2xl px-4 py-1 relative"
                            onClick={() => setShowTokens(false)}
                        >
                            <Globe
                                className={`${showTokens ? "text-primary-text-placeholder" : "text-primary-text"} h-5 w-5`}
                            />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Group by Network</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger>
                        <button
                            className="z-10 flex items-center justify-center rounded-2xl px-4 py-1 relative"
                            onClick={() => setShowTokens(true)}
                        >
                            <TokenIcon
                                className={`${showTokens ? "text-primary-text" : "text-primary-text-placeholder"} h-5 w-5`}
                            />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Group by Token</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
};

export default RouteTokenSwitch;