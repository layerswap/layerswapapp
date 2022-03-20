/* This example requires Tailwind CSS v2.0+ */
import { FC, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'

interface OffRampDetailsModalParams {
    onDismiss: () => void;
    onConfirm: () => void;
    isOpen: boolean;
    address: string;
    memo: string;
    amount: string;
}

const OffRampDetailsModal: FC<OffRampDetailsModalParams> = ({ onDismiss, onConfirm, isOpen, address, amount, memo }) => {

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" onClose={onDismiss}>
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Dialog.Overlay className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
                    </Transition.Child>

                    {/* This element is to trick the browser into centering the modal contents. */}
                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                        &#8203;
                    </span>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    >
                        <div className="relative inline-block align-bottom bg-gray-900 border-gray-800 border-2 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
                            <div>
                                <div className="mt-3 text-center sm:mt-5">
                                    <Dialog.Title as="h4" className="text-lg text-left leading-6 font-medium text-white">
                                        Off-ramp
                                    </Dialog.Title>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-300 text-left">
                                            Please do a transaction with the provided details
                                        </p>
                                    </div>
                                </div>

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
                            </div>
                            <div className="mt-5 sm:mt-6">
                                <button
                                    type="button"
                                    className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:text-sm focus:outline-none"
                                    onClick={() => onConfirm()}
                                >
                                    I did the transfer!
                                </button>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog >
        </Transition.Root >
    )
}

export default OffRampDetailsModal;
