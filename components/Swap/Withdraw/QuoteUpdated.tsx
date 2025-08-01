import AlertIcon from "@/components/icons/AlertIcon";
import VaulDrawer from "@/components/modal/vaulModal";
import { Network } from "@/Models/Network";
import { FC } from "react";

interface QuoteUpdatedProps {
    minAllowedAmount?: number;
    maxAllowedAmount?: number;
    network?: string;
    token?: string;
    isBelowMin?: boolean;
}

const QuoteUpdated: FC<QuoteUpdatedProps> = ({
    minAllowedAmount,
    maxAllowedAmount,
    network,
    token,
    isBelowMin
}) => {
    return (
        <div>
            <div className="p-3 bg-secondary-500 rounded-lg mb-3 w-fit mx-auto">
                <AlertIcon className='h-11 w-11' />
            </div>
            <h2 className="text-primary-text text-xl font-medium text-center mb-3">
                <span>{isBelowMin ? "Minimum" : "Maximum"}</span> <span>Amount Adjusted</span>
            </h2>
            <p className="text-center text-secondary-text text-base mb-6">
                <span>The </span>
                <span>{isBelowMin ? "minimum" : "maximum"}</span>
                <span> amount you can send using </span>
                <span>{network}</span>
                <span> is </span>
                <span>{isBelowMin ? minAllowedAmount : maxAllowedAmount}</span>
                <span> {token}. We’ll adjust your transfer to this limit to proceed.</span>
            </p>
        </div>
    );
};

export default QuoteUpdated;