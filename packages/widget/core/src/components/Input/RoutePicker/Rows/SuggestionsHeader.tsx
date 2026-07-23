import { useBalanceStore } from "@/stores/balanceStore"

const SuggestionsHeader = () => {
    const isLoading = useBalanceStore(s => s.sortingDataIsLoading)

    if (isLoading) {
        return (
            <div className="text-base font-normal leading-5 pl-1 sticky top-0 z-50 flex items-baseline text-transparent bg-[linear-gradient(120deg,var(--color-primary-text-tertiary)_40%,var(--color-primary-text),var(--color-primary-text-tertiary)_60%)] bg-size-[200%_100%] bg-clip-text animate-shine">
                Suggestions
            </div>
        )
    }

    return (
        <div className="text-primary-text-tertiary text-base font-normal leading-5 pl-1 sticky top-0 z-50 flex items-baseline">
            Suggestions
        </div>
    )
}

export default SuggestionsHeader;
