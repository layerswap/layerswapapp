import { Suspense, lazy } from "react";
import MetaMaskIcon from "./Wallets/MetaMask";
import WalletConnectIcon from "./Wallets/WalletConnect";
import RainbowIcon from "./Wallets/Rainbow";
import Phantom from "./Wallets/Phantom";

// All chain-specific icon sets (Starknet, TON, Solana, Fuel, Tron, Bitcoin)
// live in a lazy chunk. They are only displayed when the user is looking
// at a non-EVM connector in the connect modal or source-wallet picker —
// rarely on first paint of `/`, where the default/EVM case is the common
// one. Keeping the default 4 icons (MetaMask, WalletConnect, Rainbow,
// Phantom) inline ensures no flicker on the typical home-page render.
const LazyChainConnectorIcons = lazy(() =>
    import(/* webpackChunkName: "connector-icons-chains" */ "./ConnectorIconsAllChains")
        .then(m => ({ default: m.ResolveConnectorIcon }))
);

const IconsWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return <div className={className ?? "-space-x-2 flex"} aria-label="Wallet type">{children}</div>;
};

const DefaultEvmIcons = ({ iconClassName, className }: { iconClassName: string; className?: string }) => (
    <IconsWrapper className={className}>
        <MetaMaskIcon className={iconClassName} />
        <WalletConnectIcon className={iconClassName} />
        <RainbowIcon className={iconClassName} />
        <Phantom className={iconClassName} />
    </IconsWrapper>
);

export const ResolveConnectorIcon = ({
    connector,
    iconClassName,
    className,
}: {
    connector?: string;
    iconClassName: string;
    className?: string;
}) => {
    const lower = connector?.toLowerCase();
    // EVM and unknown/default → render inline (eager). This is the common
    // case shown on the home page swap form and the EVM tile in the modal.
    if (!lower || lower === "evm") {
        return <DefaultEvmIcons iconClassName={iconClassName} className={className} />;
    }
    // Everything else → lazy chunk with the same default icons as fallback
    // so layout doesn't shift while the chain-specific set downloads.
    return (
        <Suspense fallback={<DefaultEvmIcons iconClassName={iconClassName} className={className} />}>
            <LazyChainConnectorIcons connector={connector} iconClassName={iconClassName} className={className} />
        </Suspense>
    );
};
