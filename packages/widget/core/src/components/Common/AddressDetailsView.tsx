import {
    type MouseEventHandler,
    type ReactNode,
    type SVGProps,
    useMemo,
    useState,
    type FC,
} from 'react';
import type { Network } from '@layerswap/widget-types';
import {
    Copy,
    Check,
    SquareArrowOutUpRight,
    BookmarkPlus,
    Unplug,
    Trash2,
    Info,
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/shadcn/popover';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/shadcn/tooltip';
import { ImageWithFallback } from '@layerswap/ui-kit/components';
import { Address } from '@/lib/address/Address';
import { getExplorerUrl } from '@/lib/address/explorerUrl';
import clsx from 'clsx';
import { AddressLabelView } from './AddressLabelView';
export function AddressDetailsView({
    address,
    network,
    providerName,
    isForCurrency,
    children,
    shouldShowChevron = true,
    showDetails,
    title,
    description,
    logo: Logo,
    displayName,
    label,
    isCopied = false,
    isPopoverOpen = false,
    saving = false,
    savingForm,
    canSave = false,
    readOnly,
    container,
    onPopoverOpenChange,
    onTooltipOpenChange,
    onCopy,
    onSave,
    onDisconnect,
    onRemove,
}: {
    address: string;
    network?: Network;
    providerName?: string;
    isForCurrency?: boolean;
    children?: ReactNode;
    shouldShowChevron?: boolean;
    showDetails?: boolean;
    title?: string;
    description?: string;
    logo?: string;
    displayName?: string;
    label?: string;
    isCopied?: boolean;
    isPopoverOpen?: boolean;
    saving?: boolean;
    savingForm?: ReactNode;
    canSave?: boolean;
    readOnly?: boolean;
    container?: HTMLElement | null;
    onPopoverOpenChange?: (open: boolean) => void;
    onTooltipOpenChange?: (open: boolean) => void;
    onCopy?: () => void;
    onSave?: () => void;
    onDisconnect?: () => void;
    onRemove?: () => void;
}) {
    const addr = useMemo(
        () => new Address(address, network ?? null, providerName!),
        [address, network, providerName],
    );
    const isAddressValid = network && Address.isValid(addr.full, network);
    const labeledAddress =
        label ??
        (displayName
            ? `${displayName} (${addr.toShortString()})`
            : addr.toShortString());
    // Resolver for action buttons
    const getActionButtons = () => {
        const buttons: ActionButtonProps[] = [
            {
                title: 'Copy',
                Icon: isCopied ? Check : Copy,
                onClick: (e: React.MouseEvent<HTMLDivElement>) => {
                    e.stopPropagation();
                    onCopy?.();
                },
            },
            ...(network && isAddressValid
                ? [
                      {
                          title: 'View',
                          Icon: SquareArrowOutUpRight,
                          href: readOnly
                              ? undefined
                              : getExplorerUrl(
                                    network.account_explorer_template,
                                    addr.full,
                                ),
                      },
                  ]
                : []),
            ...(canSave && !saving
                ? [
                      {
                          title: 'Save',
                          Icon: BookmarkPlus,
                          onClick: (e: React.MouseEvent<HTMLDivElement>) => {
                              e.stopPropagation();
                              onSave?.();
                          },
                      },
                  ]
                : []),
            ...(onDisconnect
                ? [
                      {
                          title: 'Disconnect',
                          Icon: Unplug,
                          iconClassNames: 'text-red-400',
                          onClick: (e: React.MouseEvent<HTMLDivElement>) => {
                              e.stopPropagation();
                              onDisconnect();
                          },
                      },
                  ]
                : []),
            ...(onRemove
                ? [
                      {
                          title: 'Remove',
                          Icon: Trash2,
                          iconClassNames: 'text-red-400',
                          onClick: (e: React.MouseEvent<HTMLDivElement>) => {
                              e.stopPropagation();
                              onRemove();
                          },
                      },
                  ]
                : []),
        ];

        const showTitles = buttons.length <= 2;

        return { buttons, showTitles };
    };

    const { buttons, showTitles } = getActionButtons();
    const { start, middle, end } = useMemo(
        () => addr.toEmphasizedParts(),
        [addr],
    );

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Popover open={isPopoverOpen} onOpenChange={onPopoverOpenChange}>
                <PopoverTrigger asChild>
                    <div>
                        <Tooltip onOpenChange={onTooltipOpenChange}>
                            <TooltipTrigger asChild>
                                <span
                                    className={
                                        isForCurrency
                                            ? 'block w-full min-w-0'
                                            : undefined
                                    }
                                >
                                    {children ?? (
                                        <AddressLabelView
                                            label={labeledAddress}
                                            saved={!!displayName}
                                            isForCurrency={isForCurrency}
                                            shouldShowChevron={
                                                shouldShowChevron
                                            }
                                        />
                                    )}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent
                                side="bottom"
                                className="pointer-events-none"
                            >
                                <p>
                                    {isForCurrency
                                        ? 'View token details'
                                        : 'View address details'}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    container={container}
                    className="w-auto p-3 min-w-72 flex flex-col gap-3 items-stretch rounded-2xl! bg-secondary-500!"
                    side="top"
                    avoidCollisions={true}
                    collisionPadding={8}
                    sticky="always"
                    onInteractOutside={(e) => {
                        e.detail.originalEvent.stopPropagation();
                    }}
                    onPointerDownOutside={(e) => {
                        e.detail.originalEvent.stopPropagation();
                    }}
                >
                    {showDetails && (title || description) && (
                        <div>
                            <div className="flex items-center gap-3">
                                {Logo ? (
                                    <ImageWithFallback
                                        src={Logo}
                                        alt={title || 'Token logo'}
                                        height="40"
                                        width="40"
                                        loading="eager"
                                        fetchPriority="high"
                                        className="rounded-full object-contain shrink-0 h-10 w-10"
                                    />
                                ) : (
                                    <Info className="w-10 h-10 text-secondary-text shrink-0" />
                                )}
                                <div className="flex-1 font-medium">
                                    {title && (
                                        <h3 className="text-base leading-5 text-primary-text">
                                            {title}
                                        </h3>
                                    )}
                                    {description && (
                                        <p className="text-sm leading-4.5 text-secondary-text">
                                            {description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <hr className="border rounded-full border-secondary-400 mt-2" />
                        </div>
                    )}
                    {displayName && displayName !== title && (
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-left">
                            <span className="text-xs text-secondary-text shrink-0">
                                Saved as:
                            </span>
                            <span className="text-primary-text text-sm font-medium break-words min-w-0">
                                {displayName}
                            </span>
                        </div>
                    )}
                    <p className="text-secondary-text text-sm leading-5 break-all text-left font-mono">
                        <>
                            <span className="text-primary-text font-medium">
                                {start}
                            </span>
                            <span>{middle}</span>
                            <span className="text-primary-text font-medium">
                                {end}
                            </span>
                        </>
                    </p>
                    <div className="space-y-1.5">
                        <div className="flex gap-3">
                            {buttons.map((button) => (
                                <ActionButton
                                    key={button.title}
                                    showTitle={showTitles}
                                    {...button}
                                />
                            ))}
                        </div>
                        {saving && savingForm}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
type ActionButtonProps = {
    title: string;
    Icon: (props: SVGProps<SVGSVGElement>) => ReactNode;
    iconClassNames?: string;
    onClick?: MouseEventHandler<HTMLDivElement> | undefined;
    href?: string;
    showTitle?: boolean;
};

const ActionButton: FC<ActionButtonProps> = ({
    title,
    Icon,
    onClick,
    href,
    iconClassNames,
    showTitle = true,
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const children = (
        <>
            <Icon className={clsx('h-3 w-3', iconClassNames)} />
            {showTitle && <p className="text-xs whitespace-nowrap">{title}</p>}
        </>
    );

    const buttonClasses =
        'cursor-pointer text-secondary-text hover:text-primary-text px-2.5 py-2 bg-secondary-300 hover:bg-secondary-400 rounded-lg transition-all duration-200 flex items-center gap-1 flex-1 justify-center';

    const renderButton = () => {
        if (href) {
            return (
                <a
                    href={href}
                    target="_blank"
                    className={buttonClasses}
                    rel="noopener noreferrer"
                >
                    {children}
                </a>
            );
        }

        return (
            <div onClick={onClick} className={buttonClasses}>
                {children}
            </div>
        );
    };

    if (showTitle) {
        return renderButton();
    }

    return (
        <Tooltip
            disableHoverableContent
            key={title}
            open={showTooltip}
            onOpenChange={setShowTooltip}
        >
            <TooltipTrigger asChild>{renderButton()}</TooltipTrigger>
            <TooltipContent key={title} side="top">
                <p>{title}</p>
            </TooltipContent>
        </Tooltip>
    );
};
