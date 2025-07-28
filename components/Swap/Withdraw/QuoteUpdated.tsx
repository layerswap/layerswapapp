import AlertIcon from "@/components/icons/AlertIcon";
import VaulDrawer from "@/components/modal/vaulModal";
import { FC } from "react";

interface QuoteUpdatedProps {
    minAllowedAmount?: number;
    maxAllowedAmount?: number;
    originalAmount?: number;
    updatedReceiveAmount?: number;
}

const QuoteUpdated: FC<QuoteUpdatedProps> = ({
    minAllowedAmount,
    maxAllowedAmount,
    originalAmount,
    updatedReceiveAmount,
}) => {
    const isBelowMin = originalAmount !== undefined && minAllowedAmount !== undefined && originalAmount < minAllowedAmount;
    const isAboveMax = originalAmount !== undefined && maxAllowedAmount !== undefined && originalAmount > maxAllowedAmount;

    const newAmount = isBelowMin ? minAllowedAmount : isAboveMax ? maxAllowedAmount : originalAmount;

    return (
        <div>
            <div className="p-3 bg-secondary-500 rounded-lg mb-3 w-fit mx-auto">
                <AlertIcon className='h-11 w-11' />
            </div>
            <h2 className="text-primary-text text-xl font-medium text-center mb-3">Quote Updated</h2>
            <p className="text-center text-secondary-text text-base mb-6">
                Some details where changed from the last time you viewed, please confirm the new quote to continue
            </p>
            <div className="space-y-2 mb-6">
                <div className="flex justify-between bg-secondary-500 p-3 rounded-lg">
                    <span className="text-base font-normal text-primary-text">Request amount</span>
                    <span className="text-sm text-secondary-text">{newAmount}</span>
                </div>
                <div className="flex justify-between bg-secondary-500 p-3 rounded-lg">
                    <span className="text-base font-normal text-primary-text">You will receive</span>
                    <span className="text-sm text-secondary-text">{updatedReceiveAmount}</span>
                </div>
            </div>
        </div>
    );
};

export default QuoteUpdated;