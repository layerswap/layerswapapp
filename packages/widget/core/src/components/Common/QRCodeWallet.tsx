import { FC } from "react"
import StyledQRCode from "./StyledQRCode";
import { classNames } from "../utils/classNames";
import { QrCode } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip";
import { motion } from "framer-motion";

type QRCodeModalProps = {
    qrUrl: string;
    className?: string
    iconSize?: number
    iconClassName?: string
}

const QRCodeModal: FC<QRCodeModalProps> = ({ qrUrl, className, iconSize, iconClassName }) => {
    const qrCode = <StyledQRCode value={qrUrl} size={160} ecLevel="H" />

    return (
        <>
            <Popover>
                <PopoverTrigger>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={classNames(className)}>
                                <div className="flex items-center gap-1 cursor-pointer">
                                    <QrCode className={iconClassName} width={iconSize ? iconSize : 16} height={iconSize ? iconSize : 16} />
                                </div>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Show QR code</p>
                        </TooltipContent>
                    </Tooltip>
                </PopoverTrigger>
                <PopoverContent className="w-full p-4" side="left">
                    <motion.div whileHover={{
                        scale: 1.2,
                        transition: { duration: 0.5 },
                    }}>
                        {qrCode}
                    </motion.div>
                </PopoverContent>
            </Popover>
        </>
    )
}


export default QRCodeModal