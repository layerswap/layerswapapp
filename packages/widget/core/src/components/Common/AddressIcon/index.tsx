'use client'
import Jazzicon from "./jazzicon.mjs";
import { FC, useEffect, useRef } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/helpers/cn";
import { useAddressName } from "@/stores/addressBookStore";

type Props = {
    address: string;
    size?: number;
    className?: string;
    network?: { name: string } | null;
    providerName?: string;
}

const AddressIcon: FC<Props> = ({ address, size, className, network, providerName }) => {
    const ref = useRef<HTMLDivElement>(null)
    const savedName = useAddressName(address, network, providerName)
    const saved = !!savedName
    const renderSize = size ?? 24
    // Mirror the connected-wallet network badge (≈0.5 of the icon, poking out the corner).
    const badgeSize = Math.max(9, Math.round(renderSize * 0.5))
    const badgeOffset = Math.max(1, Math.round(renderSize * 0.08))

    useEffect(() => {
        if (address && ref.current) {
            ref.current.innerHTML = "";
            const iconElement = Jazzicon(renderSize, parseInt(address.slice(2, 10), 16))
            if (iconElement) {
                iconElement.style.display = 'block'
                iconElement.style.width = "100%"
                iconElement.style.height = "100%"
                iconElement.style.borderRadius = "0"
                ref.current.appendChild(iconElement);
            }
        }
    }, [address, renderSize]);

    return (
        <div className={cn("relative rounded-md", className)} style={size ? { width: size, height: size } : undefined}>
            <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                <div className="absolute inset-0" ref={ref as any} />
            </div>
            {/* Saved/address-book addresses get a small "contact" badge to set them apart. */}
            {saved && (
                <div
                    className="absolute flex items-center justify-center rounded-full bg-secondary-600 border-2 border-secondary-800 text-primary-text"
                    style={{ width: badgeSize, height: badgeSize, right: -badgeOffset, bottom: -badgeOffset }}
                >
                    <UserRound style={{ width: '62%', height: '62%' }} strokeWidth={2.5} />
                </div>
            )}
        </div>
    )
}

export default AddressIcon
