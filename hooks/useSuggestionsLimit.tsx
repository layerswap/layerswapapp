import { useMemo } from 'react';
import useWindowDimensions from './useWindowDimensions';

const SUGGESTION_ROW_HEIGHT = 60;
const MIN_SUGGESTIONS = 4;
const MAX_SUGGESTIONS = 15;

type WindowSize = {
    width: number | undefined;
    height: number | undefined;
};

function calculateFromViewport(windowSize: WindowSize, hasWallet: boolean): number {
    if (!windowSize?.height) return MIN_SUGGESTIONS;

    const CONNECT_WALLET_BUTTON = hasWallet ? 0 : 128;
    const COLLAPSED_ROW_HEIGHT = 60;
    const SEARCH_HEIGHT = 40;
    const SUGGESTIONS_TITLE_HEIGHT = 28;
    const ALL_NETWORKS_TITLE_HEIGHT = 44;
    const ALL_NETWORKS_VISIBLE_ROWS = 2.5 * COLLAPSED_ROW_HEIGHT;
    const HEADER_HEIGHT = 52;
    const PADDING = 12;

    const isDesktop = windowSize.width && windowSize.width >= 640;
    const maxModalHeight = isDesktop
        ? windowSize.height * 0.79
        : windowSize.height * 0.90;

    const fixedHeight = SEARCH_HEIGHT + SUGGESTIONS_TITLE_HEIGHT + CONNECT_WALLET_BUTTON +
        ALL_NETWORKS_TITLE_HEIGHT + ALL_NETWORKS_VISIBLE_ROWS +
        HEADER_HEIGHT + PADDING;

    const availableForSuggestions = maxModalHeight - fixedHeight;
    const calculatedCount = Math.floor(availableForSuggestions / SUGGESTION_ROW_HEIGHT);

    return Math.max(MIN_SUGGESTIONS, Math.min(MAX_SUGGESTIONS, calculatedCount));
}

type Options = {
    hasWallet: boolean;
    showsWalletButton: boolean;
};

export default function useSuggestionsLimit({ hasWallet }: Options) {
    const { windowSize } = useWindowDimensions();

    const limit = useMemo(() => {
        return calculateFromViewport(windowSize, hasWallet);
    }, [windowSize, hasWallet]);

    return { suggestionsLimit: limit };
}
