'use client'
import Jazzicon from "./jazzicon.mjs";
import { FC, useEffect, useRef } from "react";
import { UserRound } from "lucide-react";

type Props = {
    address: string;
    size: number;
    className?: string;
    rounded?: string;
}

const AddressIcon: FC<Props> = ({ address, size, className, rounded }) => {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (address && ref.current) {
            ref.current.innerHTML = "";
            const iconElement = Jazzicon(size, parseInt(address.slice(2, 10), 16))
            if (iconElement) {
                iconElement.style.display = 'block'
                iconElement.style.width = "100%"
                iconElement.style.height = "100%"
                iconElement.style.borderRadius = rounded || "6px"
                iconElement.style.filter = `blur(${Math.max(1, size * 0.035)}px)`
                iconElement.style.transform = 'scale(1.2)'
                iconElement.style.transformOrigin = 'center'
                ref.current.appendChild(iconElement);
            }
        }
    }, [address, size]);

    return (
        <div className={`relative overflow-hidden ${className ?? ""}`} style={{ width: size, height: size, borderRadius: rounded || "6px" }}>
            <div className="absolute inset-0" ref={ref as any} />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center justify-center rounded-full text-white backdrop-blur-[2px]" style={{ width: '70%', height: '70%', background: 'rgba(17,18,24,0.42)' }}>
                    <UserRound style={{ width: '68%', height: '68%' }} strokeWidth={2.25} />
                </div>
            </div>
        </div>
    )
}

export default AddressIcon
