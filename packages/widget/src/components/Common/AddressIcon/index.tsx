'use client'
import Jazzicon from "./jazzicon.mjs";
import { FC, ReactNode, SVGProps, useEffect, useRef } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/helpers/cn";
import { useAddressName } from "@/stores/addressBookStore";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";

type Props = {
    address: string;
    size: number;
    className?: string;
    network?: { name: string } | null;
    providerName?: string;
}

const AddressIcon: FC<Props> = ({ address, size, className, network, providerName }) => {
    const ref = useRef<HTMLDivElement>(null)
    const saved = !!useAddressName(address, network, providerName)

    useEffect(() => {
        if (address && ref.current) {
            ref.current.innerHTML = "";
            const iconElement = Jazzicon(size, parseInt(address.slice(2, 10), 16))
            if (iconElement) {
                iconElement.style.display = 'block'
                iconElement.style.width = "100%"
                iconElement.style.height = "100%"
                iconElement.style.borderRadius = "0"
                if (saved) {
                    iconElement.style.filter = `blur(${Math.max(1, size * 0.035)}px)`
                    iconElement.style.transform = 'scale(1.2)'
                    iconElement.style.transformOrigin = 'center'
                }
                ref.current.appendChild(iconElement);
            }
        }
    }, [address, size, saved]);

    return (
        <div className={cn("relative overflow-hidden rounded-md", className)} style={{ width: size, height: size }}>
            <div className="absolute inset-0" ref={ref as any} />
            {saved && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center justify-center rounded-full text-white backdrop-blur-[2px]" style={{ width: '70%', height: '70%', background: 'rgba(17,18,24,0.42)' }}>
                        <UserRound style={{ width: '68%', height: '68%' }} strokeWidth={2.25} />
                    </div>
                </div>
            )}
        </div>
    )
}

export default AddressIcon

type ResolvedAddressIconProps = {
    address: string;
    size: number;
    className?: string;
    network?: { name: string } | null;
    providerName?: string;
    walletIcon?: (props: SVGProps<SVGSVGElement>) => ReactNode;
    walletIconClassName?: string;
    partnerLogo?: string;
    partnerLogoClassName?: string;
}

export const ResolvedAddressIcon: FC<ResolvedAddressIconProps> = ({ address, size, className, network, providerName, walletIcon: WalletIcon, walletIconClassName, partnerLogo, partnerLogoClassName, }) => {
    if (WalletIcon) return <WalletIcon width={size} height={size} className={walletIconClassName} />
    if (partnerLogo) return (
        <ImageWithFallback alt="Partner logo" src={partnerLogo} width={size} height={size} className={partnerLogoClassName} />
    )
    return <AddressIcon address={address} size={size} className={className} network={network} providerName={providerName} />
}
