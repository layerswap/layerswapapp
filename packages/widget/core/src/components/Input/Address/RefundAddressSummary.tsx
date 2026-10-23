import { ChevronRight, Info } from 'lucide-react';
import { ImageWithFallback } from '@layerswap/ui-kit/components';
import type { Network } from '@layerswap/widget-types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip';
import useWallet from '@/hooks/useWallet';
import { Address } from '@/lib/address/Address';
import { RecipientAddressView } from '@/components/Common/RecipientAddressView';
import { useAddressName } from '@/stores/addressBookStore';
import { ExtendedAddress } from './AddressPicker/AddressWithIcon';

export default function RefundAddressSummary({ network, address, onEdit, className }: {
    network: Network;
    address?: string;
    onEdit?: () => void;
    className?: string;
}) {
    const { wallets } = useWallet(network, 'autofill');
    const wallet = address ? wallets.find(wallet =>
        wallet.addresses.some(account => Address.equals(account, address, network))
    ) : undefined;

    const savedName = useAddressName(address, network, wallet?.providerName);

    return <div className={`px-1 pb-1 text-primary-text ${className || ''}`}>
        <div className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-1">
                <span className="font-medium">Refund to</span>
                <Tooltip openOnClick>
                    <TooltipTrigger asChild>
                        <button type="button" aria-label="Why we need a refund address" className="navigation-focus-ring-text-bold-lg rounded-sm text-secondary-text hover:text-primary-text">
                            <Info className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent className="pointer-events-none w-80 grow p-2 border-none! bg-secondary-300! text-xs rounded-xl" side="top" align="start" alignOffset={-30}>
                        <p>We’ll use this address to return your funds on {network.display_name} if the swap can’t complete.</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            {address ? (
                <RecipientAddressView address={address} network={network} wallet={wallet} savedName={savedName}>
                    <ExtendedAddress
                        address={address}
                        network={network}
                        providerName={wallet?.providerName}
                        showDetails={!!wallet}
                        title={wallet?.displayName?.split("-")[0]}
                        description={wallet?.providerName}
                        logo={wallet?.icon}
                        shouldShowChevron={false}
                    />
                </RecipientAddressView>
            ) : onEdit ? (
                <button type="button" onClick={onEdit} aria-label="Choose refund address" className="navigation-focus-ring-text-bold-lg flex items-center gap-1 rounded-md hover:text-primary-text-secondary">
                    <span>Choose address</span>
                    <ChevronRight className="h-4 w-4 text-secondary-text" />
                </button>
            ) : null}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-secondary-text">
            <span className="flex items-center gap-1.5">
                <ImageWithFallback src={network.logo} alt="" width="14" height="14" className="rounded-sm" />
                <span>{network.display_name}</span>
            </span>
            {address && onEdit && <button type="button" onClick={onEdit} aria-label="Change refund address" className="navigation-focus-ring-text-bold-lg rounded-md hover:text-primary-text hover:underline">Change</button>}
        </div>
    </div>;
}
