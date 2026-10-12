import { useEffect, useRef } from 'react';
import { UserRound } from 'lucide-react';
import { cn } from '@/helpers/cn';
import Jazzicon from './jazzicon.mjs';

export type AddressIconViewProps = {
    address: string;
    size?: number;
    className?: string;
    saved?: boolean;
};

/** The shared deterministic identicon, without address-book subscriptions. */
export function AddressIconView({
    address,
    size,
    className,
    saved = false,
}: AddressIconViewProps) {
    const ref = useRef<HTMLDivElement>(null);
    const renderSize = size ?? 24;
    const badgeSize = Math.max(9, Math.round(renderSize * 0.5));
    const badgeOffset = Math.max(1, Math.round(renderSize * 0.08));

    useEffect(() => {
        const container = ref.current;
        if (!container) return;
        container.replaceChildren();
        if (!address) return;
        const iconElement = Jazzicon(
            renderSize,
            parseInt(address.slice(2, 10), 16),
        );
        if (iconElement) {
            iconElement.style.display = 'block';
            iconElement.style.width = '100%';
            iconElement.style.height = '100%';
            iconElement.style.borderRadius = '0';
            container.appendChild(iconElement);
        }
    }, [address, renderSize]);

    return (
        <div
            data-address-icon
            aria-hidden="true"
            className={cn('relative rounded-md', className)}
            style={size ? { width: size, height: size } : undefined}
        >
            <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                <div className="absolute inset-0" ref={ref} />
            </div>
            {saved && (
                <div
                    className="absolute flex items-center justify-center rounded-full bg-secondary-600 border-2 border-secondary-800 text-primary-text"
                    style={{
                        width: badgeSize,
                        height: badgeSize,
                        right: -badgeOffset,
                        bottom: -badgeOffset,
                    }}
                >
                    <UserRound
                        style={{ width: '62%', height: '62%' }}
                        strokeWidth={2.5}
                    />
                </div>
            )}
        </div>
    );
}
