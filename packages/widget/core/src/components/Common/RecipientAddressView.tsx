import { Address } from '@/lib/address/Address';
import shortenString from '@/components/utils/ShortenString';
import { ImageWithFallback } from '@layerswap/ui-kit/components';
import type { Network, Wallet } from '@layerswap/widget-types';
import type { ReactNode } from 'react';
import { AddressIconView } from './AddressIcon/AddressIconView';
import { AddressDetailsView } from './AddressDetailsView';

export type RecipientPresentation = {
    wallet?: Pick<Wallet, 'id' | 'icon' | 'displayName'>;
    partnerIcon?: string;
    savedName?: string;
};

/** The recipient row shared by live wallet/manual flows and their snapshots. */
export function RecipientAddressView({
    address,
    network,
    wallet,
    partnerIcon,
    savedName,
    variant = 'quote',
    children,
}: RecipientPresentation & {
    address: string;
    network?: Network;
    variant?: 'quote' | 'manual';
    children?: ReactNode;
}) {
    const instance = network ? new Address(address, network) : undefined;
    const short = instance?.toShortString() || shortenString(address);
    return (
        <span
            data-recipient-address
            className={`cursor-pointer hover:underline flex items-center ${variant === 'manual' ? 'gap-1' : 'gap-2'}`}
        >
            {wallet?.icon ? (
                <ImageWithFallback
                    alt={wallet.displayName ?? wallet.id}
                    className="w-4 h-4 bg-secondary-700 rounded-sm object-contain"
                    src={wallet.icon}
                    width="16"
                    height="16"
                />
            ) : partnerIcon ? (
                <ImageWithFallback
                    alt="Partner logo"
                    className="rounded-md object-contain h-4 w-4"
                    src={partnerIcon}
                    width="36"
                    height="36"
                />
            ) : (
                <AddressIconView
                    className="rounded-[4px]"
                    address={instance?.full || address}
                    size={16}
                    saved={!!savedName}
                />
            )}
            <span
                className={
                    variant === 'manual'
                        ? 'group/addressItem min-w-0 truncate'
                        : 'text-sm group/addressItem text-secondary-text'
                }
            >
                {children ??
                    (Address.isValid(address, network) ? (
                        <AddressDetailsView
                            address={address}
                            network={network}
                            displayName={savedName}
                            shouldShowChevron={false}
                            readOnly
                        />
                    ) : (
                        <span className="text-sm text-secondary-text">
                            {short}
                        </span>
                    ))}
            </span>
        </span>
    );
}
