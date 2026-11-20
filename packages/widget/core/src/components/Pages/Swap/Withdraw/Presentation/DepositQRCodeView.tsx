import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/shadcn/popover';
import QRIcon from '@/components/Icons/QRIcon';
import { StyledQRCode } from '@layerswap/ui-kit/components';
export function DepositQRCodeView({
    depositAddress,
    showQR = false,
    setShowQR,
}: {
    depositAddress?: string;
    showQR?: boolean;
    setShowQR?: (open: boolean) => void;
}) {
    return (
        <Popover open={showQR} onOpenChange={setShowQR}>
            <PopoverTrigger asChild>
                <div className="relative">
                    <QRIcon className="bg-secondary-300 p-1 rounded-lg cursor-pointer hover:opacity-80 fill-primary-text text-primary-text" />
                </div>
            </PopoverTrigger>
            <PopoverContent
                side="left"
                align="start"
                className="bg-secondary-300 p-2 rounded-xl z-50"
            >
                <div className="bg-secondary-500 p-2 rounded-xl shadow-lg">
                    <StyledQRCode
                        value={depositAddress || ''}
                        size={160}
                        ecLevel="H"
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}
