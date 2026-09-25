import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/shadcn/popover';
import {
    CommandItem,
    CommandList,
    CommandWrapper,
} from '@/components/shadcn/command';
import { ImageWithFallback } from '@layerswap/ui-kit/components';
import type { Network, Token } from '@layerswap/widget-types';
import { ChevronDown } from 'lucide-react';
export function ManualSourceSelectorView({
    network,
    withdrawalNetworks,
    isPopoverOpen = false,
    setIsPopoverOpen,
    onSelect,
}: {
    network: Network;
    withdrawalNetworks?: { network: Network; token: Token }[];
    isPopoverOpen?: boolean;
    setIsPopoverOpen?: (open: boolean) => void;
    onSelect?: (network: Network, token: Token) => void;
}) {
    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 px-1.5 bg-secondary-300 rounded-lg whitespace-nowrap">
                    <ImageWithFallback
                        src={network.logo}
                        alt="Project Logo"
                        height="16"
                        width="16"
                        loading="eager"
                        className="rounded-sm object-contain"
                    />
                    <span>{network.display_name}</span>
                    <span className="pointer-events-none text-shadow-primary-text-tertiary">
                        <ChevronDown
                            className="h-3.5 w-3.5 text-secondary-text"
                            aria-hidden="true"
                        />
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                side="top"
                className="bg-secondary-300! space-y-1 p-1! rounded-lg!"
            >
                <CommandWrapper>
                    <CommandList>
                        {withdrawalNetworks?.map((item) => {
                            return (
                                <CommandItem
                                    className="hover:bg-secondary-100 rounded-md p-1! cursor-pointer"
                                    value={item.network.name}
                                    key={item.network.name}
                                    onSelect={() =>
                                        onSelect?.(item.network, item.token)
                                    }
                                >
                                    <div
                                        className={`flex items-center justify-between w-full overflow-hidden`}
                                    >
                                        <div
                                            className={`gap-2 relative flex items-center w-full space-y-1`}
                                        >
                                            <div
                                                className={`h-6 w-6 shrink-0 mb-0!`}
                                            >
                                                {item.network.logo && (
                                                    <ImageWithFallback
                                                        src={item.network.logo}
                                                        alt="Project Logo"
                                                        height="24"
                                                        width="24"
                                                        loading="eager"
                                                        className="rounded-md object-contain"
                                                    />
                                                )}
                                            </div>
                                            <div className="flex justify-between w-full items-center">
                                                <span className="flex items-center pb-0.5 text-sm font-medium text-primary-text pr-20">
                                                    {item.network.display_name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CommandItem>
                            );
                        })}
                    </CommandList>
                </CommandWrapper>
            </PopoverContent>
        </Popover>
    );
}
