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
            <div className='flex-col w-full rounded-lg bg-pink-600 shadow-lg p-2'>
                <div className='flex items-center'>
                    <div className='mr-2 p-2 rounded-lg bg-pink-800'>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <p className='font-medium'>
                        Please do a transaction with the provided details
                    </p>
                </div>
                <div className='mt-2 pl-5'>
                    <ul className='list-disc'>
                        <li>Go to Loopring Wallet and click “Send”</li>
                        <li>Then select the <strong>“To Another Loopring L2 Account”</strong> option</li>
                        <li>Fill in the information provided below</li>
                    </ul>
                </div>
            </div>
            )
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
                        Recipient
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
                <div>
                    <label htmlFor="AddressType" className="block text-sm font-medium">
                        Address Type
                    </label>
                    <input
                        id="addressType"
                        className="block bg-gray-800 border-2 text-sm border-gray-600 w-full font-semibold rounded-md py-3 px-4 ntdi"
                        value="EOA Wallet"
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
