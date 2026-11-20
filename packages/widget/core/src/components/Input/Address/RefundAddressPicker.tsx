import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { useFormikContext } from 'formik';
import type { NetworkRoute } from '@layerswap/widget-types';
import { ImageWithFallback } from '@layerswap/ui-kit/components';
import type { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues';
import VaulDrawer from '@/components/Modal/vaulModal';
import SubmitButton from '@/components/Buttons/submitButton';
import { WalletItem } from '@/components/Wallet/WalletComponents/WalletsList';
import useWallet from '@/hooks/useWallet';
import { Address } from '@/lib/address/Address';
import { savedAddressMatchesNetwork, useAddressBookStore } from '@/stores/addressBookStore';
import { AddressGroup } from './AddressPicker';
import AddressBook from './AddressPicker/AddressBook';
import AddressTextInput from './AddressTextInput';

type Props = { children: (open: () => void) => ReactNode };

/** Shares the destination picker's presentation, without its recipient autofill or account selection. */
export default function RefundAddressPicker({ children }: Props) {
    const { values, setValues } = useFormikContext<SwapFormValues>();
    const [show, setShow] = useState(false);
    const { from, depositMethod } = values;

    useEffect(() => { setShow(false); }, [from?.name, depositMethod]);

    const selectAddress = (address: string) => {
        const trimmed = address.trim();
        if (!from || !Address.isValid(trimmed, from)) return;
        setValues(current => current.from?.name === from.name && current.depositMethod === 'deposit_address' ? {
            ...current,
            refund_address: trimmed,
            refundAddressNetwork: from.name,
        } : current, true);
        setShow(false);
    };

    return <>
        {children(() => setShow(true))}
        <VaulDrawer show={show} setShow={setShow} header="Refund address" modalId="refundAddress" mode="fitHeight">
            {show && from && <RefundAddressPickerBody
                key={from.name}
                network={from}
                selectedAddress={values.refundAddressNetwork === from.name ? values.refund_address : undefined}
                onSelect={selectAddress}
            />}
        </VaulDrawer>
    </>;
}

function RefundAddressPickerBody({ network, selectedAddress, onSelect }: {
    network: NetworkRoute;
    selectedAddress?: string;
    onSelect: (address: string) => void;
}) {
    const { wallets } = useWallet(network, 'autofill');
    const savedAddresses = useAddressBookStore(s => s.savedAddresses);
    const [draft, setDraft] = useState('');
    const inputId = useId();
    const valid = !!draft.trim() && Address.isValid(draft.trim(), network);
    const error = draft.trim() && !valid ? `Enter a valid ${network.display_name} address` : undefined;
    const compatibleWallets = useMemo(() => wallets.flatMap(wallet => {
        const addresses = wallet.addresses.filter(address => Address.isValid(address, network));
        return addresses.length ? [{ ...wallet, addresses, address: addresses.includes(wallet.address) ? wallet.address : addresses[0] }] : [];
    }), [wallets, network]);
    const addressBook = useMemo(() => savedAddresses
        .filter(entry => savedAddressMatchesNetwork(entry, network) && Address.isValid(entry.address, network))
        .map(entry => ({ address: entry.address, group: AddressGroup.ManualAdded })), [savedAddresses, network]);
    const useDraft = () => { if (valid) onSelect(draft.trim()); };

    return <div className="space-y-5 pb-4 text-primary-text">
        <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs">
                <ImageWithFallback src={network.logo} alt="" width="16" height="16" className="rounded-sm" />
                <span>{network.display_name}</span>
            </div>
            <p id={`${inputId}-description`} className="text-sm leading-5 text-secondary-text">
                If the swap can’t complete, we’ll use this address to return your funds on {network.display_name}. Choose an address you control on this network.
            </p>
        </div>
        {compatibleWallets.length > 0 && <div className="space-y-2">
            <p className="text-sm text-secondary-text">Connected wallets</p>
            {compatibleWallets.map(wallet => <WalletItem
                key={`${wallet.providerName}-${wallet.id}`}
                account={wallet}
                network={network}
                selectable
                selectedAddress={selectedAddress}
                onWalletSelect={({ address }) => onSelect(address)}
            />)}
        </div>}
        <div className="space-y-3">
            <label htmlFor={inputId} className="block text-sm text-secondary-text">Address on {network.display_name}</label>
            <AddressTextInput
                name={inputId}
                value={draft}
                onChange={setDraft}
                onEnter={useDraft}
                invalid={!!error}
                describedBy={`${inputId}-description${error ? ` ${inputId}-error` : ''}`}
                fullWidth
            />
            {error && <p id={`${inputId}-error`} role="status" className="text-xs text-primary">{error}</p>}
            <SubmitButton type="button" isDisabled={!valid} onClick={useDraft}>Use this address</SubmitButton>
        </div>
        {addressBook.length > 0 && <AddressBook
            addressBook={addressBook}
            destination={network}
            destination_address={selectedAddress}
            onSelectAddress={onSelect}
        />}
    </div>;
}
