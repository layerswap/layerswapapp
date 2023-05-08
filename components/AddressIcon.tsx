import Jazzicon from "@metamask/jazzicon";
import { FC, useEffect, useRef } from "react";

type Props = {
    address: string;
    size: number;
}
const AddressIcon: FC<Props> = ({ address, size }) => {
    const ref = useRef(null)
    useEffect(() => {
        if (address && ref.current) {
            ref.current.innerHTML = "";
            const iconElement = Jazzicon(size, parseInt(address.slice(2, 10), 16)) as HTMLElement
            if(iconElement){
                iconElement.style.display = 'block'
                ref.current.appendChild(iconElement);
            }
        }
    }, [address]);

    return <div ref={ref as any} />
}
export default AddressIcon
