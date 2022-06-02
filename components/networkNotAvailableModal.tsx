import { FC, useState } from 'react'
import Modal from './modalComponent';
import SubmitButton from './buttons/submitButton';
import { InformationCircleIcon } from '@heroicons/react/outline';
import { Messages } from '../lib/disabledNetworkMessages';

interface NeworkNotAvailableModalParams {
    networkCode: string,
    onDismiss: () => void;
    onConfirm: () => void;
    isOpen: boolean;
}

const NeworkNotAvailableModal: FC<NeworkNotAvailableModalParams> = ({ onConfirm, networkCode, ...modalParams }) => {

    return (
        <Modal title='Network is not available' {...modalParams} description={Messages[networkCode] || Messages.DEFAULT}>
            <div className="mt-3 sm:mt-6 text-white text-sm">
                <button
                    onClick={onConfirm}
                    className="bg-cyan-500 group relative w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out"
                >
                    Ok
                </button>
            </div>
        </Modal>
    )
}

export default NeworkNotAvailableModal;