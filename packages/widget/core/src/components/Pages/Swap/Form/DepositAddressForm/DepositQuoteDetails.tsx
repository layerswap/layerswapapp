import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useDetailedQuote } from '@/hooks/useDetailedQuote';
import { Network, Token } from '@layerswap/widget-types';
import { formatFee } from './helpers';
import { formatTokenAmount } from '@/components/utils/formatTokenAmount';
import { formatVerboseHms, msToParts } from '@/components/utils/formatTime';
import FeeCalculator from './FeeCalculator';
import { DepositQuoteDetailsView } from './DepositQuoteDetailsView';

type DepositQuoteDetailsProps = {
    sourceNetwork: Network | undefined;
    sourceToken: Token | undefined;
    destinationNetwork: Network | undefined;
    destinationToken: Token | undefined;
    destinationAddress: string | undefined;
    refuel: boolean;
    isCreatingSwap: boolean;
};

const DepositQuoteDetails: FC<DepositQuoteDetailsProps> = ({
    sourceNetwork,
    sourceToken,
    destinationNetwork,
    destinationToken,
    destinationAddress,
    refuel,
    isCreatingSwap,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);

    // Reset the expansion state when either leg of the route changes so a fresh
    // collapsed preview is shown instead of a stale open calculator. Address
    // changes are intentionally excluded so typing doesn't collapse the drawer.
    useEffect(() => {
        setIsOpen(false);
        setShowCalculator(false);
    }, [
        sourceNetwork?.name,
        sourceToken?.symbol,
        destinationNetwork?.name,
        destinationToken?.symbol,
    ]);

    // Stable handler so the Accordion subtree doesn't re-render on every SWR poll.
    const handleAccordionChange = useCallback((v: string) => {
        const open = v === 'quote';
        setIsOpen(open);
        if (!open) setShowCalculator(false);
    }, []);

    const { detailedQuotes, isLoading: isQuoteLoading } = useDetailedQuote({
        sourceNetwork: sourceNetwork?.name,
        sourceToken: sourceToken?.symbol,
        destinationNetwork: destinationNetwork?.name,
        destinationToken: destinationToken?.symbol,
        destinationAddress,
        refuel,
        useDepositAddress: true,
    });

    const sortedTiers = useMemo(() => {
        if (!detailedQuotes) return [];
        return [...detailedQuotes].sort((a, b) => a.min_amount - b.min_amount);
    }, [detailedQuotes]);

    // Derive from the sorted tiers so the ETA matches the same tier the
    // Min/Fees displays read from (sortedTiers[0]), regardless of API order.
    const bestQuote = sortedTiers[0];

    const minDepositDisplay = useMemo(() => {
        const min = sortedTiers[0]?.min_amount;
        if (!min || !sourceToken) return null;
        return `${formatTokenAmount(min)} ${sourceToken.asset}`;
    }, [sortedTiers, sourceToken]);

    const maxDepositDisplay = useMemo(() => {
        const max = sortedTiers[sortedTiers.length - 1]?.max_amount;
        if (!max || !Number.isFinite(max) || !sourceToken) return null;
        return `${formatTokenAmount(max)} ${sourceToken.asset}`;
    }, [sortedTiers, sourceToken]);

    const feeDisplay = sortedTiers[0]
        ? formatFee(
              sortedTiers[0].total_percentage_fee,
              sortedTiers[0].total_fixed_fee_in_usd,
          )
        : null;

    const estTime = bestQuote
        ? formatVerboseHms(msToParts(bestQuote.avg_completion_milliseconds))
        : null;

    const showQuoteSkeleton = (isCreatingSwap || isQuoteLoading) && !bestQuote;

    return (
        <DepositQuoteDetailsView
            showQuoteSkeleton={showQuoteSkeleton}
            hasQuotes={sortedTiers.length > 0}
            isOpen={isOpen}
            onOpenChange={(open) => handleAccordionChange(open ? 'quote' : '')}
            minDepositDisplay={minDepositDisplay}
            maxDepositDisplay={maxDepositDisplay}
            feeDisplay={feeDisplay}
            estTime={estTime}
            onOpenCalculator={() => setShowCalculator(true)}
            calculator={
                <FeeCalculator
                    show={showCalculator}
                    setShow={setShowCalculator}
                    sourceNetwork={sourceNetwork}
                    sourceToken={sourceToken}
                    destinationNetwork={destinationNetwork}
                    destinationToken={destinationToken}
                    destinationAddress={destinationAddress}
                    refuel={refuel}
                />
            }
        />
    );
};

export default DepositQuoteDetails;
