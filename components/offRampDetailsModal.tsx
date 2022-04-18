/* This example requires Tailwind CSS v2.0+ */
import { CheckIcon } from '@heroicons/react/outline';
import { FC } from 'react'
import SubmitButton from './buttons/submitButton';
import Modal from './modalComponent';

interface OffRampDetailsModalParams {
    onDismiss: (isIntentional: boolean) => void;
    onConfirm: () => void;
    isOpen: boolean;
    address: string;
    memo: string;
    amount: string;
}

const OffRampDetailsModal: FC<OffRampDetailsModalParams> = ({ onConfirm, address, amount, memo, ...modalParams }) => {
    const modalDescription = () => {
        return (
            <p className="text-sm text-gray-300 text-left">
                Please do a transaction with the provided details
            </p>)
    }
    
    const checkButtonIcon = <CheckIcon className='h-5 w-5'></CheckIcon>

    return (
        <Modal title='Off-ramp details' {...modalParams} description={modalDescription()}>
            <div className="flex flex-col justify-between w-full space-y-4 mt-8 text-white">
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium">
                        Amount
                    </label>
                    <input
                        id="amount"
                        className="block bg-gray-800 border-2 text-sm border-gray-600 w-full font-semibold rounded-md py-3 px-4 ntdi"
                        value={amount}
                        disabled={true}
                    >
                    </input>

                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium">
                        Address
                    </label>
                    <input
                        id="address"
                        className="block bg-gray-800 border-2 text-sm border-gray-600 w-full font-semibold rounded-md py-3 px-4 ntdi"
                        value={address}
                        disabled={true}
                    >
                    </input>
                </div>
                <div>
                    <label htmlFor="memo" className="block text-sm font-medium">
                        Memo
                    </label>
                    <input
                        id="memo"
                        className="block bg-gray-800 border-2 text-sm border-gray-600 w-full font-semibold rounded-md py-3 px-4 ntdi"
                        value={memo}
                        disabled={true}
                    >
                    </input>
                </div>
            </div>
            <div className="mt-3 sm:mt-6 text-white text-sm">
                <SubmitButton onClick={() => onConfirm()} defaultStyle="bg-indigo-500" icon={checkButtonIcon}  isSubmitting={false} isDisabled={false}>
                    I did the transfer!
                </SubmitButton>
            </div>
        </Modal>
    )
}

export default OffRampDetailsModal;
