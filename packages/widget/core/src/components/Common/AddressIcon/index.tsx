'use client';
import { FC } from 'react';
import { AddressIconView } from './AddressIconView';
import { useAddressName } from '@/stores/addressBookStore';

type Props = {
    address: string;
    size?: number;
    className?: string;
    network?: { name: string } | null;
    providerName?: string;
};

const AddressIcon: FC<Props> = ({
    address,
    size,
    className,
    network,
    providerName,
}) => {
    const savedName = useAddressName(address, network, providerName);
    return (
        <AddressIconView
            address={address}
            size={size}
            className={className}
            saved={!!savedName}
        />
    );
};

export default AddressIcon;
