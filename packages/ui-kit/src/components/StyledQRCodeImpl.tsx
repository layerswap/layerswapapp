import { useState, type FC } from "react"
import { QRCode } from "react-qrcode-logo"
import { useOptionalWalletUi } from "./internal/WalletUiContext"

export type StyledQRCodeProps = {
    value: string
    size?: number
    logo?: string
    ecLevel?: "L" | "M" | "Q" | "H"
}

const FALLBACK_FG = "#E1E3E6"

const resolveForeground = (): string => {
    if (typeof window === "undefined") return FALLBACK_FG
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--ls-colors-primary-text")
        .trim()
    return raw ? `rgb(${raw})` : FALLBACK_FG
}

const StyledQRCodeImpl: FC<StyledQRCodeProps> = ({ value, size = 140, logo, ecLevel = "M" }) => {
    const walletUi = useOptionalWalletUi()
    const [documentColor] = useState(resolveForeground)
    const themedColor = walletUi?.theme?.primary?.text
    const foreground = themedColor ? `rgb(${themedColor})` : documentColor

    const logoSize = Math.round(size * 0.25)

    return (
        <QRCode
            value={value}
            size={size}
            ecLevel={ecLevel}
            quietZone={0}
            bgColor="transparent"
            fgColor={foreground}
            qrStyle="dots"
            eyeRadius={8}
            logoImage={logo}
            logoWidth={logoSize}
            logoHeight={logoSize}
            removeQrCodeBehindLogo
            logoPadding={3}
            logoPaddingStyle="square"
        />
    )
}

export default StyledQRCodeImpl
