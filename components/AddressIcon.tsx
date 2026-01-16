import Jazzicon from "@metamask/jazzicon";
import { FC, useEffect, useRef } from "react";
import { Address } from "@/lib/address";

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
            const addr = new Address(address);
            const iconElement = Jazzicon(size, addr.toIconSeed())
            if (iconElement) {
                iconElement.style.display = 'block'
                iconElement.style.width = "100%"
                iconElement.style.height = "100%"
                iconElement.style.borderRadius = rounded || "3px"
                ref.current.appendChild(iconElement);
            }
        }
    }, [address, size]);

    return <div className={className} ref={ref as any} />
}
export default AddressIcon
