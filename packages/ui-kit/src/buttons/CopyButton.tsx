import {
    useEffect,
    useLayoutEffect,
    useState,
    type FC,
    type ReactNode,
    type RefObject,
} from 'react';
import { CopyButtonView } from './CopyButtonView';
import { useCopyClipboard } from '@layerswap/utils/react';

const useIsomorphicLayoutEffect =
    typeof document !== 'undefined' ? useLayoutEffect : useEffect;

interface CopyButtonProps {
    className?: string;
    toCopy: string | number;
    children?: ReactNode;
    iconSize?: number;
    iconClassName?: string;
    disabled?: boolean;
    portalContainerRef?: RefObject<HTMLElement | null>;
}

const CopyButton: FC<CopyButtonProps> = ({
    className,
    toCopy,
    children,
    iconSize,
    iconClassName,
    disabled = false,
    portalContainerRef,
}) => {
    const [isCopied, setCopied] = useCopyClipboard();
    const [isTooltipOpen, setTooltipOpen] = useState(false);
    const [container, setContainer] = useState<HTMLElement | undefined>(undefined);

    const handleCopyClick = () => {
        if (disabled) return;
        setCopied(toCopy);
        setTooltipOpen(true);
    };

    useIsomorphicLayoutEffect(() => {
        setContainer(portalContainerRef?.current ?? undefined);
    }, [portalContainerRef]);

    return (
        <CopyButtonView
            className={className}
            iconSize={iconSize}
            iconClassName={iconClassName}
            disabled={disabled}
            isCopied={isCopied}
            isTooltipOpen={isTooltipOpen}
            setTooltipOpen={setTooltipOpen}
            container={container}
            handleCopyClick={handleCopyClick}
        >
            {children}
        </CopyButtonView>
    );
};

export default CopyButton;
