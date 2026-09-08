const TABLE_ROWS = [0, 1, 2, 3, 4, 5];

interface LoadingBlocksProps {
    variant?: "table" | "swap";
}

function StatusSkeleton() {
    return (
        <div className="flex flex-col gap-2">
            <div className="h-7 w-28 rounded-lg bg-secondary-300" />
            <div className="h-3 w-32 rounded-md bg-secondary-300" />
        </div>
    );
}

function RouteSkeleton() {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className="h-5 w-5 shrink-0 rounded-md bg-secondary-300" />
                <div className="h-4 w-24 rounded-md bg-secondary-300" />
            </div>
            <div className="flex items-center gap-2">
                <div className="h-5 w-5 shrink-0 rounded-md bg-secondary-300" />
                <div className="h-4 w-32 rounded-md bg-secondary-300" />
            </div>
        </div>
    );
}

function TableSkeleton() {
    return (
        <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full pb-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden rounded-3xl bg-secondary-700 p-1">
                            <table className="min-w-[720px] divide-y divide-secondary-300 sm:min-w-full">
                                <thead className="bg-secondary-500">
                                    <tr>
                                        <th scope="col" className="w-[24%] px-3 py-3.5 text-left">
                                            <div className="h-4 w-16 rounded-md bg-secondary-300" />
                                        </th>
                                        <th scope="col" className="w-[34%] px-3 py-3.5 text-left">
                                            <div className="h-4 w-16 rounded-md bg-secondary-300" />
                                        </th>
                                        <th scope="col" className="w-[34%] px-3 py-3.5 text-left">
                                            <div className="h-4 w-24 rounded-md bg-secondary-300" />
                                        </th>
                                        <th scope="col" className="w-[8%] px-4 py-3.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-500 bg-secondary-700">
                                    {TABLE_ROWS.map((row) => (
                                        <tr key={row}>
                                            <td className="px-3 py-3">
                                                <StatusSkeleton />
                                            </td>
                                            <td className="px-3 py-3">
                                                <RouteSkeleton />
                                            </td>
                                            <td className="px-3 py-3">
                                                <RouteSkeleton />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="ml-auto h-5 w-5 rounded-md bg-secondary-300" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CardValueSkeleton({ width = "w-32" }: { width?: string }) {
    return (
        <div className="mt-2 flex items-center gap-2">
            <div className="h-5 w-5 shrink-0 rounded-md bg-secondary-300" />
            <div className={`h-4 rounded-md bg-secondary-300 ${width}`} />
        </div>
    );
}

function SwapCardSkeleton({ destination = false }: { destination?: boolean }) {
    return (
        <div
            className={`grid w-full gap-3 rounded-3xl bg-secondary-700 p-4 ${destination ? "" : "lg:max-w-[50%]"}`}
        >
            <div className={`h-8 rounded-lg bg-secondary-300 ${destination ? "w-10" : "w-16"}`} />
            <div className="divide-y divide-secondary-300 overflow-hidden rounded-2xl bg-secondary-500">
                <div className="flex">
                    <div className="min-w-0 flex-1 p-4">
                        <div className="h-4 w-12 rounded-md bg-secondary-300" />
                        <CardValueSkeleton width="w-28" />
                    </div>
                    <div className="min-w-0 flex-1 border-l border-secondary-300 p-4">
                        <div className="h-4 w-16 rounded-md bg-secondary-300" />
                        <CardValueSkeleton width="w-32" />
                    </div>
                </div>
                <div className="p-4">
                    <div className="h-4 w-24 rounded-md bg-secondary-300" />
                    <div className="mt-2 h-4 w-4/5 rounded-md bg-secondary-300" />
                </div>
                <div className="p-4">
                    <div className="h-4 w-24 rounded-md bg-secondary-300" />
                    <div className="mt-2 h-4 w-3/5 rounded-md bg-secondary-300" />
                </div>
                {!destination ? (
                    <div className="px-4 py-3">
                        <div className="h-4 w-36 rounded-md bg-secondary-300" />
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function SwapCardsSkeleton() {
    return (
        <div className="w-full pb-2 pt-3 sm:px-6 lg:px-8 lg:pb-10">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="h-7 w-28 rounded-lg bg-secondary-300" />
                <div className="h-4 w-52 rounded-md bg-secondary-300" />
            </div>
            <div className="flex flex-col items-start gap-2 lg:flex-row">
                <SwapCardSkeleton />
                <div className="self-center p-1">
                    <div className="h-6 w-6 rounded-full bg-secondary-300" />
                </div>
                <SwapCardSkeleton destination />
            </div>
        </div>
    );
}

export default function LoadingBlocks({ variant = "table" }: LoadingBlocksProps) {
    return (
        <div
            className="w-full animate-pulse motion-reduce:animate-none"
            role="status"
            aria-label={variant === "table" ? "Loading transfers" : "Loading swap details"}
        >
            {variant === "table" ? <TableSkeleton /> : <SwapCardsSkeleton />}
        </div>
    );
}
