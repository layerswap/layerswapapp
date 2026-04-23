export const filterChipClasses = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors shrink-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
        active ? 'bg-secondary-400 text-primary-text' : 'bg-secondary-500 hover:bg-secondary-400 text-primary-text'
    }`
