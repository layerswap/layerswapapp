import RainbowIcon from "../icons/Wallets/Rainbow";
import TON from "../icons/Wallets/TON";
import MetaMaskIcon from "../icons/Wallets/MetaMask";
import WalletConnectIcon from "../icons/Wallets/WalletConnect";
import Braavos from "../icons/Wallets/Braavos";
import ArgentX from "../icons/Wallets/ArgentX";
import Argent from "../icons/Wallets/Argent";
import TonKeeper from "../icons/Wallets/TonKeeper";
import OpenMask from "../icons/Wallets/OpenMask";
import Phantom from "../icons/Wallets/Phantom";
import CoinbaseIcon from "../icons/Wallets/Coinbase";
import GlowIcon from "../icons/Wallets/Glow";

export const ResolveConnectorIcon = ({
    connector,
    iconClassName,
    className,
    children
}: {
    connector: string;
    iconClassName: string;
    className?: string;
    children?: React.ReactNode;
}) => {
    switch (connector.toLowerCase()) {
        case KnownConnectors.EVM:
            return (
                <div className={className ?? "-space-x-2 flex"}>
                    <RainbowIcon className={iconClassName} />
                    <WalletConnectIcon className={iconClassName} />
                    <MetaMaskIcon className={iconClassName} />
                    {children}
                </div>
            );
        case KnownConnectors.Starknet:
            return (
                <div className={className ?? "-space-x-2 flex"}>
                    <Braavos className={iconClassName} />
                    <Argent className={iconClassName} />
                    <ArgentX className={iconClassName} />
                    {children}
                </div>
            );
        case KnownConnectors.TON:
            return (
                <div className={className ?? "-space-x-2 flex"}>
                    <TonKeeper className={iconClassName} />
                    <OpenMask className={iconClassName} />
                    <TON className={iconClassName} />
                    {children}
                </div>
            );
        case KnownConnectors.Solana:
            return (
                <div className={className ?? "-space-x-2 flex"}>
                    <CoinbaseIcon className={iconClassName} />
                    {/* <GlowIcon className={iconClassName} /> */}
                    <Phantom className={iconClassName} />
                    {children}
                </div>
            );
        default:
            return <></>;
    }
};

const KnownConnectors = {
    Starknet: "starknet",
    EVM: "evm",
    TON: "ton",
    Solana: "solana",
    Glow: "glow"
};