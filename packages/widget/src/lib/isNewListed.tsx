export const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export const isNewListed = (date: string) => {
    return new Date(date)?.getTime() >= new Date().getTime() - ONE_WEEK;
}

export const NewBadge = () => {
    return (
        <div className="text-primary-text text-xs py-0.5 px-1.5 bg-linear-90 from-primary-800 to-primary-600 rounded-md">
            New
        </div>
    )
}
