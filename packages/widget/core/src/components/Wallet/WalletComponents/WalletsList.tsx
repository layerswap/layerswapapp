"use client"
import { type Wallet, Network, Token } from '@layerswap/widget-types';
import { FC, useState } from "react";
import { SelectAccountProps, WalletConnectionProvider, AccountIdentity } from "@layerswap/wallet-core/types";
import { WalletsList as BaseWalletsList, WalletItem as BaseWalletItem, type SaveAddressRequest } from "@layerswap/ui-kit";
import { useSelectedAccount } from "@/context/swapAccounts";
import VaulDrawer from "@/components/Modal/vaulModal";
import AddressBookEntryForm from "@/components/AddressBook/AddressBookEntryForm";

type Props = {
    selectable?: boolean;
    wallets: (Wallet | AccountIdentity)[];
    token?: Token;
    network?: Network;
    provider?: WalletConnectionProvider | undefined;
    onSelect?: (props: SelectAccountProps) => void;
    selectedDepositMethod?: "wallet" | "deposit_address";
}

const WalletsList: FC<Props> = (props) => {
    const { selectable, wallets, token, network, provider, onSelect, selectedDepositMethod } = props
    const selectedSourceAccount = useSelectedAccount("from", selectedDepositMethod == 'wallet' ? network?.name : undefined);
    const [saveRequest, setSaveRequest] = useState<SaveAddressRequest | null>(null)

    return (
        <>
            <BaseWalletsList
                selectable={selectable}
                wallets={wallets}
                token={token}
                network={network}
                provider={provider}
                onSelect={onSelect}
                selectedAddress={selectedSourceAccount?.address}
                onSaveRequest={setSaveRequest}
            />
            <SaveAddressDrawer request={saveRequest} onClose={() => setSaveRequest(null)} />
        </>
    )
}

type WalletItemProps = {
    account: AccountIdentity | Wallet,
    selectable?: boolean,
    token?: Token;
    network?: Network;
    selectedAddress: string | undefined;
    onWalletSelect?: (props: SelectAccountProps) => void;
    isCompatible?: boolean;
}
export const WalletItem: FC<WalletItemProps> = (props) => {
    const [saveRequest, setSaveRequest] = useState<SaveAddressRequest | null>(null)

    return (
        <>
            <BaseWalletItem {...props} onSaveRequest={setSaveRequest} />
            <SaveAddressDrawer request={saveRequest} onClose={() => setSaveRequest(null)} />
        </>
    )
}

const SaveAddressDrawer: FC<{ request: SaveAddressRequest | null, onClose: () => void }> = ({ request, onClose }) => (
    <VaulDrawer
        show={!!request}
        setShow={() => onClose()}
        header="Save address"
        modalId="saveWalletToBook"
        mode="fitHeight"
    >
        <VaulDrawer.Snap id="item-1" className="pb-0">
            {request && (
                <AddressBookEntryForm
                    initial={{
                        address: request.address,
                        networkTypes: request.networkType ? [request.networkType] : undefined,
                    }}
                    availableNetworks={request.supportedNetworks.length ? request.supportedNetworks : undefined}
                    onClose={onClose}
                />
            )}
        </VaulDrawer.Snap>
    </VaulDrawer>
)

export default WalletsList
