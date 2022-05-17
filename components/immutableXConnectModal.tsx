import { FC, useState } from 'react'
import Modal from './modalComponent';
import SubmitButton from './buttons/submitButton';
import { Link } from '@imtbl/imx-sdk';
import { LinkIcon } from '@heroicons/react/outline';

interface ImmutableXConnectModalParams {
    onDismiss: (isIntentional: boolean) => void;
    onConfirm: (address: string) => void;
    isOpen: boolean;
    destination_address: string;
}

const linkAddress = 'https://link.x.immutable.com';

const ImmutableXConnectModal: FC<ImmutableXConnectModalParams> = ({ onConfirm, destination_address, ...modalParams }) => {
    const [connectErrorMessage, setConnectErrorMessage] = useState<string>(null);

    const modalDescription = () => {
        return (
            <div className='text-base'>
                <span>
                    Immutable X account for the provided address does not exist. To create one, you need to connect your wallet to Immutable X.
                </span>
            </div>)
    }

    async function onImmutableConnectClick() {
        try {
            const linkSdk = new Link(linkAddress);
            var connected = await linkSdk.setup({});
            if (connected && connected.address) {
                onConfirm(connected.address);
            }
        } catch (error) {
            setConnectErrorMessage(error.message);
        }
    }

    const connectButtonIcon = <LinkIcon className='h-5 w-5'></LinkIcon>

    return (
        <Modal title='Immutable X Connect' {...modalParams} description={modalDescription()}>
            {connectErrorMessage &&
                <div className='mt-5'>
                    <span className="text-red-400 text-sm">{"Please try again. " + connectErrorMessage}</span>
                </div>
            }
            <div className="mt-3 sm:mt-6 text-white text-sm">
                <SubmitButton icon={connectButtonIcon} isDisabled={false} isSubmitting={false} onClick={async () => await onImmutableConnectClick()}>
                    Connect
                </SubmitButton>
            </div>
        </Modal>
    )
}

export default ImmutableXConnectModal;