import { FC } from "react";
import clsx from "clsx";
import { DepositStep } from "../depositStepContext";

const stepIndex: Record<DepositStep, number> = {
    "method-picker": 1,
    "wallet-amount": 2,
    "wallet-processing": 3,
    "transfer-crypto": 3,
};

type Props = {
    step: DepositStep;
    total?: number;
};

const Stepper: FC<Props> = ({ step, total = 3 }) => {
    const current = stepIndex[step];

    return (
        <div
            className="flex items-center gap-2 px-1 pt-1 pb-2"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={current}
            aria-label={`Step ${current} of ${total}`}
        >
            {Array.from({ length: total }).map((_, i) => {
                const position = i + 1;
                const isActive = position === current;
                const isDone = position < current;
                return (
                    <span
                        key={i}
                        className={clsx(
                            "flex-1 h-1 rounded-full transition-colors duration-200",
                            isActive && "bg-primary-500",
                            isDone && "bg-primary-700",
                            !isActive && !isDone && "bg-secondary-400",
                        )}
                    />
                );
            })}
        </div>
    );
};

export default Stepper;
