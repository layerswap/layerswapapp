import type { ReactNode } from 'react';
import { ArrowLeft, MenuIcon } from 'lucide-react';
import { WalletIcon } from '@layerswap/ui-kit/components';
import IconButton from '../Buttons/iconButton';
export function WidgetBackButton({ onClick }: { onClick?: () => void }) {
    return (
        <div className="ml-0">
            <IconButton
                onClick={onClick}
                aria-label="Go back"
                icon={<ArrowLeft strokeWidth={2} />}
            />
        </div>
    );
}
export function WidgetMenuButton({ onClick }: { onClick?: () => void }) {
    return (
        <div className="sm:-mr-2 mr-0">
            <IconButton
                aria-label="Menu"
                className="inline-flex active:animate-press-down"
                onClick={onClick}
                icon={<MenuIcon strokeWidth={2} />}
            />
        </div>
    );
}
export function ConnectButtonView({
    children,
    className,
    disabled,
    onClick,
}: {
    children?: ReactNode;
    className?: string;
    disabled?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            data-attr="connect-wallet"
            type="button"
            aria-label="Connect wallet"
            disabled={disabled}
            className={`${className} disabled:opacity-50 disabled:cursor-not-allowed enabled:active:animate-press-down`}
        >
            {children}
        </button>
    );
}
export function WalletHeaderIcon() {
    return (
        <div className="p-1.5 max-sm:p-2 active:animate-press-down justify-self-start text-secondary-text hover:bg-secondary-500 max-sm:bg-secondary-500 hover:text-primary-text focus:outline-hidden inline-flex rounded-lg items-center">
            <WalletIcon className="h-6 w-6 mx-0.5" strokeWidth="2" />
        </div>
    );
}
