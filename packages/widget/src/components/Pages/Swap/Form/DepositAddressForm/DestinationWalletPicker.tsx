import { FC, useEffect, useMemo, useRef, useState } from "react";
import { useFormikContext } from "formik";
import { ChevronDown, Plus, Wallet } from "lucide-react";
import { Network, NetworkRoute, NetworkRouteToken, Token } from "@/Models/Network";
import useWallet from "@/hooks/useWallet";
import useProvidersConnectReady from "@/hooks/useProvidersConnectReady";
import { useSelectedAccount, useSelectSwapAccount } from "@/context/swapAccounts";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { SwapFormValues } from "../SwapFormValues";
import { SelectAccountProps } from "@layerswap/wallet-core/types"
import AddressIcon from "@/components/Common/AddressIcon";
import { Address as AddressClass } from "@/lib/address/Address";
import VaulDrawer from "@/components/Modal/vaulModal";
import { WalletItem } from "@/components/Wallet/WalletComponents/WalletsList";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { useAddressName } from "@/stores/addressBookStore";

type DestinationWalletPickerProps = {
    address: string | undefined;
    destination: NetworkRoute | undefined;
    token: NetworkRouteToken | undefined;
}

const DestinationWalletPicker: FC<DestinationWalletPickerProps> = ({ address, destination, token }) => {
    const [open, setOpen] = useState(false);
    const { setFieldValue } = useFormikContext<SwapFormValues>();
    const { wallets: allWallets, providers } = useWallet();
    const selectDestinationAccount = useSelectSwapAccount("to");
    const { connect } = useConnectModal();
    // Treat manually-added addresses (set in other flows) as no-selection so
    // the picker prompts for a wallet rather than surfacing a Manual entry.
    const rawAccount = useSelectedAccount("to", destination?.name);
    const account = rawAccount?.id === 'manually_added' ? undefined : rawAccount;

    // When a destination is set, only show wallets that can autofill that
    // network. When destination is empty, fall back to every connected wallet
    // that supports autofill anywhere — that way the picker still works before
    // the user has picked a destination.
    const walletsToShow = useMemo(() => {
        if (destination) {
            return allWallets.filter(w => w.autofillSupportedNetworks?.some(n => n === destination.name));
        }
        return allWallets.filter(w => (w.autofillSupportedNetworks?.length ?? 0) > 0);
    }, [allWallets, destination?.name]);

    const provider = useMemo(() => {
        if (!destination) return undefined;
        return providers.find(p => p.autofillSupportedNetworks?.includes(destination.name));
    }, [providers, destination?.name]);

    const handleSelect = (props: SelectAccountProps) => {
        setFieldValue('destination_address', props.address, true);
        selectDestinationAccount({
            address: props.address,
            id: props.walletId,
            providerName: props.providerName,
        });
        setOpen(false);
    };

    const handleConnect = async () => {
        const result = await connect(provider);
        if (!result) return;
        const supportsDestination = !destination || result.autofillSupportedNetworks?.some(n => n === destination.name);
        if (supportsDestination) {
            handleSelect({
                address: result.address,
                walletId: result.id,
                providerName: result.providerName,
            });
        }
    };

    // When the destination changes to a network with no compatible wallet,
    // skip the picker drawer (which would only show "Connect new wallet") and
    // open the connect screen directly, scoped to that network's provider. We
    // track the destination we last auto-prompted for so dismissing without
    // connecting doesn't keep re-firing. Skipped when no wallet is connected
    // at all — the form's non-dismissable connect modal handles that case.
    // Gated on provider readiness: firing before the destination's provider
    // has hydrated would open the modal unscoped and, because the prompted-for
    // ref is already set, never retry scoped once the provider is ready.
    const hasAnyWallet = allWallets.length > 0;
    const providersReady = useProvidersConnectReady();
    const lastAutoPromptedForRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (!hasAnyWallet) return;
        if (!destination) return;
        if (account?.address) return;
        if (!providersReady) return;
        if (lastAutoPromptedForRef.current === destination.name) return;
        lastAutoPromptedForRef.current = destination.name;
        handleConnect();
    }, [hasAnyWallet, destination?.name, account?.address, providersReady]);

    const hasAddress = !!address;
    const walletIconSrc = account?.icon;
    const walletName = account?.displayName?.split('-')[0] || 'Connected wallet';
    const addr = hasAddress && destination ? new AddressClass(address!, destination) : undefined;
    const savedName = useAddressName(address, destination);
    const shortAddress = addr?.toShortString();

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full bg-secondary-500 hover:bg-secondary-400/70 rounded-xl pl-3.5 pr-0 py-3 transition-colors flex items-center outline-hidden"
            >
                <div className="inline-flex items-center justify-center rounded-lg h-7 w-7 overflow-hidden shrink-0 bg-secondary-400 text-primary-text">
                    {hasAddress && walletIconSrc ? (
                        <ImageWithFallback
                            src={walletIconSrc}
                            alt={walletName}
                            width="28"
                            height="28"
                            className="h-7 w-7 object-contain"
                        />
                    ) : hasAddress && destination ? (
                        <AddressIcon
                            address={new AddressClass(address!, destination).full}
                            size={28}
                            providerName={destination?.type}
                        />
                    ) : (
                        <Wallet className="h-4 w-4 text-secondary-text"/>
                    )}
                </div>
                <div className="ml-2 flex flex-col grow overflow-hidden min-w-0 text-left">
                    <p className={`text-base leading-5 font-medium truncate ${hasAddress ? 'text-primary-text' : 'text-secondary-text'}`}>
                        {hasAddress ? (savedName ?? shortAddress) : 'Select wallet'}
                    </p>
                    <p className="text-secondary-text text-sm font-normal leading-4 truncate whitespace-nowrap">
                        {hasAddress ? (savedName ? shortAddress : walletName) : 'Pick destination wallet'}
                    </p>
                </div>
                <span className="ml-auto px-2 pointer-events-none text-primary-text shrink-0">
                    <ChevronDown className="h-4 w-4 text-secondary-text" aria-hidden="true" />
                </span>
            </button>
            <VaulDrawer
                show={open}
                setShow={setOpen}
                header="Receive in"
                modalId="destinationWallet"
            >
                <VaulDrawer.Snap id="item-1" className="pb-4 space-y-3">
                    <button
                        type="button"
                        onClick={handleConnect}
                        className="w-full flex justify-center p-2 bg-secondary-500 rounded-md hover:bg-secondary-400"
                    >
                        <div className="flex items-center text-secondary-text gap-1 px-3 py-1">
                            <Plus className="h-4 w-4" />
                            <span className="text-sm">Connect new wallet</span>
                        </div>
                    </button>
                    {walletsToShow.length > 0 && (
                        <div className="flex flex-col gap-2">
                            {walletsToShow.map((wallet, index) => (
                                <WalletItem
                                    key={`${index}${wallet.providerName}`}
                                    account={wallet}
                                    selectable
                                    token={token as unknown as Token}
                                    network={destination as unknown as Network}
                                    onWalletSelect={handleSelect}
                                    selectedAddress={address}
                                />
                            ))}
                        </div>
                    )}
                </VaulDrawer.Snap>
            </VaulDrawer>
        </>
    );
};

export default DestinationWalletPicker;