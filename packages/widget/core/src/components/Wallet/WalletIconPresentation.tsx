'use client';
import { type Wallet } from '@layerswap/widget-types';
import { FC } from 'react';
import { clsx } from 'clsx';
import { AddressIconView } from '@/components/Common/AddressIcon/AddressIconView';
import type { ReactNode } from 'react';
import { ImageWithFallback, WalletIcon } from '@layerswap/ui-kit/components';

export type WalletIconPresentationProps = {
    wallet: Pick<Wallet, 'icon' | 'address' | 'displayName' | 'id'>;
    className?: string;
    size?: number;
    addressIcon?: ReactNode;
};

/**
 * Renders a wallet's icon. After the contract migration to `Wallet.icon: string`,
 * use this component everywhere instead of `<wallet.icon />`. Falls back to a
 * generative AddressIcon when the wallet didn't ship an icon URL.
 */
const WalletIconPresentation: FC<WalletIconPresentationProps> = ({
    wallet,
    className,
    size = 24,
    addressIcon,
}) => {
    if (wallet.icon) {
        return (
            <ImageWithFallback
                src={wallet.icon}
                alt={wallet.displayName ?? wallet.id}
                width={size}
                height={size}
                className={clsx('max-w-none object-contain', className)}
            />
        );
    }
    if (wallet.address) {
        return (
            addressIcon ?? (
                <AddressIconView
                    address={wallet.address}
                    size={size}
                    className={className}
                />
            )
        );
    }
    return <WalletIcon className={className} />;
};

export default WalletIconPresentation;
