import { ComponentType, FC, SVGProps, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Coins, Send } from "lucide-react";
import clsx from "clsx";
import DepositTabIcon from "@/components/icons/DepositTabIcon";
import WalletIcon from "@/components/icons/WalletIcon";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type Step = {
    title: string;
    description: string;
    Icon: IconComponent;
};

const STEPS: Step[] = [
    {
        title: "Choose your wallet",
        description: "The wallet where you want to receive the bridged assets.",
        Icon: WalletIcon,
    },
    {
        title: "Select tokens",
        description: "Pick what you'll send and what you'll receive.",
        Icon: Coins,
    },
    {
        title: "Send from any wallet or CEX",
        description: "Transfer to your deposit address from MetaMask, Binance, Coinbase — anywhere.",
        Icon: Send,
    },
];

type Props = {
    variant?: "inline" | "modal";
    currentStepIndex?: number;
};

const EasyDepositBanner: FC<Props> = ({ variant = "inline", currentStepIndex }) => {
    const [showAllSteps, setShowAllSteps] = useState(false);

    const isModal = variant === "modal";
    const stepsVisible = isModal || showAllSteps;
    const peek = isModal && !showAllSteps;

    return (
        <div className="relative rounded-xl bg-secondary-500 overflow-hidden">
            <div className="relative p-3.5">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                        <DepositTabIcon className="h-5 w-5 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-primary-text">Easy deposit in 3 steps</p>
                        <p className="text-xs text-secondary-text leading-snug mt-0.5">
                            Send from anywhere and receive the asset you want.
                        </p>
                    </div>
                </div>
                {!isModal && (
                    <button
                        type="button"
                        onClick={() => setShowAllSteps(v => !v)}
                        aria-expanded={showAllSteps}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                        <span>{showAllSteps ? "Hide steps" : "See how it works"}</span>
                        <ChevronDown
                            className={clsx("h-3.5 w-3.5 transition-transform duration-200", showAllSteps && "rotate-180")}
                            aria-hidden="true"
                        />
                    </button>
                )}
            </div>

            <AnimatePresence initial={false}>
                {stepsVisible && (
                    <motion.div
                        key="steps"
                        initial={isModal ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                    >
                        <div className="mx-3.5 border-t-2 border-dashed border-secondary-300" />
                        <div className="relative">
                            <motion.ol
                                className="px-3.5 pb-3.5 pt-4"
                                initial={false}
                                animate={{ maxHeight: peek ? 128 : 600 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                style={{ overflow: "hidden", maxHeight: peek ? 128 : 600 }}
                            >
                                {STEPS.map((step, index) => {
                                    const isLast = index === STEPS.length - 1;
                                    const isCurrent = currentStepIndex === index;
                                    return (
                                        <li key={step.title} className={clsx("relative", !isLast && "pb-6")}>
                                            {!isLast && (
                                                <span
                                                    aria-hidden="true"
                                                    className="absolute top-8 left-4 -ml-px h-[calc(100%-2rem)] w-0.5 bg-primary/20"
                                                />
                                            )}
                                            <div className="flex items-start gap-3">
                                                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                                                    <step.Icon className="h-4 w-4 text-primary" strokeWidth={2} aria-hidden="true" />
                                                </span>
                                                <div className="min-w-0 flex-1 pt-1">
                                                    <p className={clsx("text-sm font-medium", isCurrent ? "text-primary" : "text-primary-text")}>{step.title}</p>
                                                    <p className="text-xs text-secondary-text leading-snug mt-0.5">
                                                        {step.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </motion.ol>
                            <AnimatePresence>
                                {peek && (
                                    <motion.div
                                        key="peek-fade"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-secondary-500 to-transparent"
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                        {isModal && (
                            <div className="px-3.5 pb-3.5 -mt-1 relative z-10">
                                <button
                                    type="button"
                                    onClick={() => setShowAllSteps(v => !v)}
                                    aria-expanded={showAllSteps}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                                >
                                    <span>{showAllSteps ? "Show less" : "See all steps"}</span>
                                    <ChevronDown
                                        className={clsx("h-3.5 w-3.5 transition-transform duration-200", showAllSteps && "rotate-180")}
                                        aria-hidden="true"
                                    />
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EasyDepositBanner;
