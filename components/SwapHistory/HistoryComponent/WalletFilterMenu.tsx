import { FC, useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from 'lucide-react';
import { Menu } from '@headlessui/react';
import { Wallet } from "../../../stores/walletStore";
import { addressFormat } from "../../../lib/address/formatter";
import shortenAddress from "../../utils/ShortenAddress";
import { NetworkWithTokens } from "../../../Models/Network";

type WalletFilterMenuProps = {
    wallets: Wallet[];
    selectedWallets: string[];
    setSelectedWallets: React.Dispatch<React.SetStateAction<string[]>>;
    networks: NetworkWithTokens[];
    userSwapsLoading: boolean;
};

const WalletFilterMenu: FC<WalletFilterMenuProps> = ({ wallets, selectedWallets, setSelectedWallets, networks, userSwapsLoading }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleCheckboxToggle = useCallback((wallet: Wallet) => {
        const network = networks.find(n => n.type === wallet.providerName);
        const formattedAddress = addressFormat(wallet.address, network || null);

        setSelectedWallets((prevSelected) =>
            prevSelected.includes(formattedAddress)
                ? prevSelected.filter((address) => address !== formattedAddress)
                : [...prevSelected, formattedAddress]
        );
    }, [networks, setSelectedWallets]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };

    return (
        <Menu as="div" className="relative inline-block text-left" ref={menuRef}>
            <Menu.Button
                onClick={() => setIsOpen(!isOpen)}
                className={`${isOpen ? "text-primary-text" : "text-primary-text-placeholder"} flex w-full items-center justify-center space-x-2 rounded-md bg-secondary-700 px-3 py-1 text-sm mb-5`}
            >
                <p>
                    <span>Wallets</span>
                    {selectedWallets.length > 0 && <span>{` (${selectedWallets.length})`}</span>}
                </p>
                <ChevronDown className="size-4" />
            </Menu.Button>

            {isOpen && (
                <Menu.Items
                    className="absolute z-10 rounded-md -mt-4 bg-secondary-500 shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                    static
                >
                    <div className="py-1">
                        {wallets.map((wallet, index) => {
                            const network = networks.find(n => n.chain_id == wallet.chainId)

                            return <Menu.Item key={index}>
                                {() => (
                                    <div
                                        className="flex items-center px-4 py-2 text-sm text-white cursor-pointer"
                                        onClick={() => handleCheckboxToggle(wallet)}
                                    >
                                        <wallet.icon className="w-6 h-6 p-0.5 mr-2" />
                                        <span className="mr-6">{shortenAddress(wallet.address)}</span>
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-primary-text-placeholder bg-transparent border-primary-text-placeholder rounded focus:ring-0 outline-none cursor-pointer ml-auto"
                                            checked={selectedWallets.includes(addressFormat(wallet.address, network || null))}
                                            onChange={() => handleCheckboxToggle(wallet)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                )}
                            </Menu.Item>
                        })}
                    </div>
                </Menu.Items>
            )}
        </Menu>
    );
};

export default WalletFilterMenu;
