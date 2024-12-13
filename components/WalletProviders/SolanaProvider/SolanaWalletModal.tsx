import type { WalletName } from '@solana/wallet-adapter-base';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import type { Wallet } from '@solana/wallet-adapter-react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { FC, MouseEvent, MouseEventHandler, PropsWithChildren } from 'react';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useWalletModal } from './useWalletModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../shadcn/dialog";
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';

export const WalletModal: FC = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { wallets, select } = useWallet();
    const { setVisible, visible } = useWalletModal();
    const [expanded, setExpanded] = useState(false);

    const [listedWallets, collapsedWallets] = useMemo(() => {
        const installed: Wallet[] = [];
        const notInstalled: Wallet[] = [];

        for (const wallet of wallets) {
            if (wallet.readyState === WalletReadyState.Installed) {
                if (visible?.network == "eclipse") {
                    if (wallet.adapter.name === 'Backpack' || wallet.adapter.name === 'Nightly') {
                        installed.push(wallet);
                    }
                }
                else {
                    installed.push(wallet);
                }
            } else {
                if (visible?.network == "eclipse") {
                    if (wallet.adapter.name === 'Nightly') {
                        notInstalled.push(wallet);
                    }
                }
                else {
                    notInstalled.push(wallet);
                }
            }
        }

        return installed.length ? [installed, notInstalled] : [notInstalled, []];
    }, [wallets]);

    const hideModal = useCallback(() => {
        setTimeout(() => setVisible(undefined), 150);
    }, [setVisible]);

    const handleClose = useCallback(
        (event: MouseEvent) => {
            event.preventDefault();
            hideModal();
        },
        [hideModal]
    );

    const handleWalletClick = useCallback(
        (event: MouseEvent, walletName: WalletName) => {
            select(walletName);
            handleClose(event);
        },
        [select, handleClose]
    );

    const handleCollapseClick = useCallback(() => setExpanded(!expanded), [expanded]);

    const handleTabKey = useCallback(
        (event: KeyboardEvent) => {
            const node = ref.current;
            if (!node) return;

            // here we query all focusable elements
            const focusableElements = node.querySelectorAll('button');
            const firstElement = focusableElements[0]!;
            const lastElement = focusableElements[focusableElements.length - 1]!;

            if (event.shiftKey) {
                // if going backward by pressing tab and firstElement is active, shift focus to last focusable element
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    event.preventDefault();
                }
            } else {
                // if going forward by pressing tab and lastElement is active, shift focus to first focusable element
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    event.preventDefault();
                }
            }
        },
        [ref]
    );

    return (
        <Dialog open={visible?.show} onOpenChange={(open) => { !open && setVisible(undefined) }}>
            <DialogContent className="sm:max-w-[425px] text-primary-text bg-secondary-900">
                <DialogHeader>
                    <DialogTitle className="text-center">
                        Connect a wallet
                    </DialogTitle>
                </DialogHeader>
                <div>
                    <ul className="flex flex-col gap-2">
                        {listedWallets.map((wallet) => (
                            <WalletListItem
                                key={wallet.adapter.name}
                                handleClick={(event) => handleWalletClick(event, wallet.adapter.name)}
                                wallet={wallet}
                            />
                        ))}
                        {collapsedWallets.length ? (
                            <Collapse expanded={expanded} id="wallet-adapter-modal-collapse">
                                {collapsedWallets.map((wallet) => (
                                    <WalletListItem
                                        key={wallet.adapter.name}
                                        handleClick={(event) =>
                                            handleWalletClick(event, wallet.adapter.name)
                                        }
                                        tabIndex={expanded ? 0 : -1}
                                        wallet={wallet}
                                    />
                                ))}
                            </Collapse>
                        ) : null}
                    </ul>
                    {collapsedWallets.length ? (
                        <div className='flex pt-3 justify-end w-full'>
                            <button
                                className="flex items-center gap-1 w-fit"
                                onClick={handleCollapseClick}
                                tabIndex={0}
                            >
                                <span><span>{expanded ? 'Less ' : 'More '}</span> <span>options</span></span>
                                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${expanded && '-rotate-180'}`} />
                            </button>
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    )
};

type CollapseProps = PropsWithChildren<{
    expanded: boolean;
    id: string;
}>;

const Collapse: FC<CollapseProps> = ({ id, children, expanded = false }) => {
    const ref = useRef<HTMLDivElement>(null);
    const instant = useRef(true);
    const transition = 'height 250ms ease-out';

    const openCollapse = () => {
        const node = ref.current;
        if (!node) return;

        requestAnimationFrame(() => {
            node.style.height = node.scrollHeight + 'px';
        });
    };

    const closeCollapse = () => {
        const node = ref.current;
        if (!node) return;

        requestAnimationFrame(() => {
            node.style.height = node.offsetHeight + 'px';
            node.style.overflow = 'hidden';
            requestAnimationFrame(() => {
                node.style.height = '0';
            });
        });
    };

    useLayoutEffect(() => {
        if (expanded) {
            openCollapse();
        } else {
            closeCollapse();
        }
    }, [expanded]);

    useLayoutEffect(() => {
        const node = ref.current;
        if (!node) return;

        function handleComplete() {
            if (!node) return;

            node.style.overflow = expanded ? 'initial' : 'hidden';
            if (expanded) {
                node.style.height = 'auto';
            }
        }

        function handleTransitionEnd(event: TransitionEvent) {
            if (node && event.target === node && event.propertyName === 'height') {
                handleComplete();
            }
        }

        if (instant.current) {
            handleComplete();
            instant.current = false;
        }

        node.addEventListener('transitionend', handleTransitionEnd);
        return () => node.removeEventListener('transitionend', handleTransitionEnd);
    }, [expanded]);

    return (
        <div
            className="flex flex-col gap-2"
            id={id}
            ref={ref}
            role="region"
            style={{ height: 0, transition: instant.current ? undefined : transition }}
        >
            {children}
        </div>
    );
};


interface WalletListItemProps {
    handleClick: MouseEventHandler<HTMLButtonElement>;
    tabIndex?: number;
    wallet: Wallet;
}

const WalletListItem: FC<WalletListItemProps> = ({ handleClick, tabIndex, wallet }) => {
    return (
        <li>
            <button
                onClick={handleClick}
                tabIndex={tabIndex}
                className="w-full h-fit bg-secondary-700 hover:bg-secondary-500 transition-colors duration-200 rounded-xl px-2 p-3"
            >
                <div className='flex flex-row gap-3 items-center justify-between font-semibold px-4'>
                    <div className='flex items-center gap-2'>
                        <Image
                            src={wallet.adapter.icon}
                            width={24}
                            height={24}
                            alt={wallet.adapter.name}
                        />
                        <p>
                            {wallet.adapter.name}
                        </p>
                    </div>
                    <p className='text-secondary-text text-sm font-normal'>
                        {wallet.readyState === WalletReadyState.Installed && <span>Detected</span>}
                    </p>
                </div>
            </button>
        </li>
    );
};
