import { FC, useState } from 'react'
import { Link } from '@imtbl/imx-sdk';
import { Link as LinkIcon } from 'lucide-react';
import SubmitButton from '../../buttons/submitButton';
import toast from 'react-hot-toast';
import NetworkSettings from '../../../lib/NetworkSettings';
import { Layer } from '../../../Models/Layer';

type Props = {
    network: Layer,
    onClose: (address?: string) => void
}

const ConnectImmutableX: FC<Props> = ({ onClose, network }) => {

    const [loading, setLoading] = useState(false)

    async function onImmutableConnectClick() {
        try {
            setLoading(true)
            const linkSdk = new Link(NetworkSettings.ImmutableXSettings[network?.internal_name].linkUri);
            var connected = await linkSdk.setup({});
            if (connected && connected.address)
                onClose(connected.address)
        } catch (error) {
            toast.error(error.message);
        }
        finally {
            setLoading(false)
        }
    }

    const connectButtonIcon = <LinkIcon className='h-5 w-5'></LinkIcon>
    return (
        <div className="relative inset-0 flex flex-col overflow-y-auto scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
            <div className="relative min-h-full items-center justify-center pt-0 text-center">

                <h3 className='mb-4 md:text-xl text-center md:text-left font-roboto text-white font-semibold'>
                    Please connect your ImmutableX wallet
                    <p className='mb-10 pt-2 text-sm md:text-base text-center md:text-left font-roboto text-pink-primary-300 font-light'>
                        Immutable X account for the provided address does not exist. To create one, you need to connect your wallet to Immutable X.
                    </p>
                </h3>

                <div className="mt-3 sm:mt-6 text-white text-sm">
                    <SubmitButton icon={connectButtonIcon} isDisabled={loading} isSubmitting={loading} onClick={async () => await onImmutableConnectClick()}>
                        Connect
                    </SubmitButton>
                </div>
            </div>
        </div>
    )
}

export default ConnectImmutableX;