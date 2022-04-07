import { FC, useState } from 'react'
import Modal from './modalComponent';
import SubmitButton from './submitButton';
import {isMobile} from 'react-device-detect';
import { useWeb3React } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';
import { InjectedConnector } from '@web3-react/injected-connector';
import { Link } from '@imtbl/imx-sdk';

interface ImmutableXConnectModalParams {
    onDismiss: (isIntentional: boolean) => void;
    onConfirm: () => void;
    isOpen: boolean;
    destination_address: string;
}
const linkAddress = 'https://link.x.immutable.com';

const ImmutableXConnectModal: FC<ImmutableXConnectModalParams> = ({ onConfirm, destination_address, ...modalParams }) => {

    const [connectErrorMessage, setConnectErrorMessage] = useState<string>(null);
    const { activate, active, account, chainId } = useWeb3React<Web3Provider>();

    const modalDescription = () => {
        return (
            <div className='text-base'>
                <span>
                    Immutable X account not registered
                </span>
            </div>)
    }

    async function onImmutableConnectClick() {
        try {
            if (isMobile)
            {
                const injected = new InjectedConnector({
                  supportedChainIds: [1]
                });
          
                if (!active) {
                  await activate(injected, onerror => {
                    if (onerror.message.includes('user_canceled')) {
                      return alert('You canceled the operation, please refresh and try to reauthorize.');
                    }
                    else if (onerror.message.includes('Unsupported chain')) {
                        return alert('Unsupported network. Please use the mainnet.');
                    }
                    else {
                      alert(`Failed to connect: ${onerror.message}`)
                    }
                  });
                }
            }
            else 
            {
                const linkSdk = new Link(linkAddress);
                var connected = await linkSdk.setup({});
                if (connected && connected.address) {
                    onConfirm();
                }
            }
        } catch (error) {
            setConnectErrorMessage(error.message);
        }

    }

    return (
        <Modal title='Immutable X Connect' {...modalParams} description={modalDescription()}>
            {connectErrorMessage &&
                <div className='mt-5'>
                    <p className="text-red-400 text-sm">Something went wrong. Please try again.</p>
                    <p className="text-red-300 text-sm">{"Error: " + connectErrorMessage}</p>
                </div>
            }
            <div className="mt-3 sm:mt-6 text-white text-sm">
                <SubmitButton isDisabled={false} isSubmitting={false} onClick={async () => await onImmutableConnectClick()}>
                    Connect
                </SubmitButton>
            </div>
        </Modal>
    )
}

export default ImmutableXConnectModal;