import { getKnownConnectorIconBase64 } from "@layerswap/wallet-core";

type KnownWalletIconProps = {
    id: string;
    className?: string;
};
export const KnownWalletIcon = ({ id, className }: KnownWalletIconProps) => {
    const src = getKnownConnectorIconBase64(id);
    if (!src) return null;

    return <img src={src} alt="" aria-hidden="true" className={`object-contain ${className ?? ""}`} />;
};
