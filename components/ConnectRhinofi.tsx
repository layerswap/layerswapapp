import SubmitButton from './buttons/submitButton';
import { LinkIcon } from '@heroicons/react/outline';
import NetworkSettings from '../lib/NetworkSettings';
import KnownInternalNames from '../lib/knownIds';

const ConnectRhinofi = () => {
    const connectButtonIcon = <LinkIcon className='h-5 w-5'></LinkIcon>

    return (
        <div className="relative inset-0 flex flex-col overflow-y-auto styled-scroll">
            <div className="relative min-h-full items-center justify-center pt-0 text-center">
                <h3 className='mb-4 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
                    RhinoFi connect
                    <p className='mb-10 pt-2 text-base text-center md:text-left font-roboto text-pink-primary-300 font-light'>
                        RhinoFi account with the provided address does not exist. To create one, go to RhinoFi and connect your wallet.
                    </p>
                </h3>

                <div className="mt-3 sm:mt-6 text-white text-sm">
                    <SubmitButton icon={connectButtonIcon} isDisabled={false} isSubmitting={false} onClick={() => window.open(NetworkSettings.RhinoFiSettings[KnownInternalNames.Networks.RhinoFiMainnet].appUri, '_blank')}>
                        Connect
                    </SubmitButton>
                </div>
            </div>
        </div>
    )
}

export default ConnectRhinofi;