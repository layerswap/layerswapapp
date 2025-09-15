import InfoIcon from "./icons/InfoIcon";

export function InsufficientBalanceWarning() {
    return (
        <div className="p-2 rounded-xl bg-secondary-400 flex flex-row">
            <div className='grow'>
                <InfoIcon className='w-6 h-6 p-0.5 text-warning-primary' />
            </div>

            <div className='px-2'>
                <p className='text-white font-semibold text-base'>Insufficient Balance</p>
                <p className="text-secondary-text mt-1 text-sm">
                    You don&apos;t have enough balance to complete this transaction, this might cause the transaction to fail please try to enter a smaller amount.
                </p>
            </div>
        </div>
    );
}
