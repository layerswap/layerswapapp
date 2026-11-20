import type { ReactNode } from 'react';
import type { Wallet } from '@layerswap/widget-types';
import {
    ConnectButtonView,
    WalletHeaderIcon,
} from '@/components/Widget/WidgetNavigationView';
import WalletIconPresentation, {
    type WalletIconPresentationProps,
} from '../WalletIconPresentation';
export function WalletsHeaderView({
    wallets = [],
    icons,
    connectButton,
    onManage,
}: {
    wallets?: WalletsIconsProps['wallets'];
    icons?: ReactNode;
    connectButton?: ReactNode;
    onManage?: () => void;
}) {
    if (!wallets.length)
        return (
            connectButton ?? (
                <ConnectButtonView>
                    <WalletHeaderIcon />
                </ConnectButtonView>
            )
        );
    return (
        <button
            type="button"
            onClick={onManage}
            className="p-1.5 max-sm:p-2 justify-self-start text-secondary-text hover:bg-secondary-500 max-sm:bg-secondary-500 hover:text-primary-text focus:outline-hidden inline-flex rounded-lg items-center active:animate-press-down"
        >
            {icons ?? <WalletsIconsView wallets={wallets} />}
        </button>
    );
}
export type WalletsIconsProps = {
    wallets: {
        id: string;
        displayName?: string;
        icon?: string;
        address?: string;
    }[];
    renderIcon?: (props: WalletIconPresentationProps) => ReactNode;
};

const ConnectedWalletIcon = ({
    wallet,
    renderIcon,
}: {
    wallet: WalletsIconsProps['wallets'][number];
    renderIcon?: WalletsIconsProps['renderIcon'];
}) => {
    const props: WalletIconPresentationProps = {
        wallet: wallet as Wallet,
        className: 'h-full w-full',
        size: 24,
    };
    return (
        <span className="rounded-md border-2 border-secondary-600 bg-secondary-700 shrink-0 h-6 w-6 overflow-hidden">
            {renderIcon ? (
                renderIcon(props)
            ) : (
                <WalletIconPresentation {...props} />
            )}
        </span>
    );
};

export const WalletsIconsView = ({
    wallets,
    renderIcon,
}: WalletsIconsProps) => {
    const uniqueWallets = wallets.filter(
        (wallet, index, self) =>
            index === self.findIndex((t) => t.id === wallet.id),
    );

    const firstWallet = uniqueWallets[0];
    const secondWallet = uniqueWallets[1];

    return (
        <div className="-space-x-2 flex" aria-label="Connected wallets">
            {firstWallet?.displayName && (
                <ConnectedWalletIcon
                    wallet={firstWallet}
                    renderIcon={renderIcon}
                />
            )}
            {secondWallet?.displayName && (
                <ConnectedWalletIcon
                    wallet={secondWallet}
                    renderIcon={renderIcon}
                />
            )}
            {uniqueWallets.length > 2 && (
                <div className="h-6 w-6 shrink-0 rounded-md justify-center p-1 bg-secondary-600 text-primary-text overlfow-hidden text-xs">
                    <span>
                        <span>+</span>
                        {uniqueWallets.length - 2}
                    </span>
                </div>
            )}
        </div>
    );
};
