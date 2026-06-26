import { FC, useState } from "react";
import { QRCode } from "react-qrcode-logo";

type StyledQRCodeProps = {
    value: string;
    size?: number;
    logo?: string;
};

const FALLBACK_FG = "#E1E3E6";

// The canvas needs a concrete color (not a CSS `var()`), so resolve the themed
// `--ls-colors-primary-text` (format "r, g, b") that ColorSchema injects. Read
// once via a lazy state initializer — runs on the first client render, SSR-safe.
const resolveForeground = (): string => {
    if (typeof window === "undefined") return FALLBACK_FG;
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--ls-colors-primary-text")
        .trim();
    return raw ? `rgb(${raw})` : FALLBACK_FG;
};

/**
 * Dotted/rounded QR with a center logo, matching the deposit-screen design.
 *
 * Declarative wrapper over react-qrcode-logo: it draws to a canvas within its
 * own lifecycle (SSR-safe, no effect needed here), and a failed or slow logo
 * never blanks the code — the QR is drawn first and the logo overlaid on load.
 */
const StyledQRCode: FC<StyledQRCodeProps> = ({ value, size = 140, logo }) => {
    const [fgColor] = useState(resolveForeground);
    const logoSize = Math.round(size * 0.25);

    return (
        <QRCode
            value={value}
            size={size}
            ecLevel="H"
            quietZone={0}
            bgColor="transparent"
            fgColor={fgColor}
            qrStyle="dots"
            eyeRadius={8}
            logoImage={logo}
            logoWidth={logoSize}
            logoHeight={logoSize}
            removeQrCodeBehindLogo
            logoPadding={3}
            logoPaddingStyle="circle"
        />
    );
};

export default StyledQRCode;
