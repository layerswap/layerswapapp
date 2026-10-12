import {
    DepositPreview,
    Page2Preview,
    type Page2PreviewMode,
} from '@layerswap/widget/internal';
import type { TimelineSnapshot } from './model';

export function withQuoteExpanded(
    snapshot: TimelineSnapshot,
    expanded?: boolean,
): TimelineSnapshot {
    if (expanded === undefined) return snapshot;
    if (snapshot.kind === 'swap') {
        return {
            ...snapshot,
            quoteState: { ...snapshot.quoteState, expanded },
        };
    }
    if (snapshot.kind === 'deposit') {
        if (snapshot.step === 'address') {
            return { ...snapshot, quote: { ...snapshot.quote, expanded } };
        }
        if ('transfer' in snapshot) {
            return {
                ...snapshot,
                transfer: {
                    ...snapshot.transfer,
                    quoteState: { ...snapshot.transfer.quoteState, expanded },
                },
            };
        }
    }
    return snapshot;
}

export function TimelinePreview({
    snapshot,
    ...props
}: {
    snapshot: TimelineSnapshot;
    now: number;
    mode: Page2PreviewMode;
    onQuoteExpandedChange?: (expanded: boolean) => void;
}) {
    return snapshot.kind === 'deposit' ? (
        <DepositPreview snapshot={snapshot} {...props} />
    ) : (
        <Page2Preview snapshot={snapshot} {...props} />
    );
}
