import useSWR from 'swr'
import type { ApiResponse } from '@layerswap/widget-types'
import LayerSwapApiClient, { TransactionStatus } from '@/lib/apiClients/layerSwapApiClient'

const apiClient = new LayerSwapApiClient()

// Hashes identify receipts to read; only backend receipt statuses establish progress.
// Share the key and aggregation between the active swap and its history row.
export function useInputTransactionStatus(
    network: string | undefined,
    transactionHashes: readonly (string | undefined)[],
    enabled = true,
) {
    const hashes = [...new Set(transactionHashes.filter((hash): hash is string => !!hash))].sort()
    const { data, error } = useSWR<ApiResponse<{ status: TransactionStatus }>>(
        enabled && network && hashes.length ? [network, ...hashes] : null,
        async ([sourceNetwork, ...inputHashes]: string[]) => {
            const statuses = await Promise.all(inputHashes.map(async hash => {
                const response = await apiClient.GetTransactionStatus(sourceNetwork, hash)
                if (response.error) throw response.error
                const status = response.data?.status?.toLowerCase() as TransactionStatus | undefined
                if (!status || !Object.values(TransactionStatus).includes(status)) {
                    throw new Error('Could not check the transaction status.')
                }
                return status
            }))
            return { data: { status: statuses.includes(TransactionStatus.Pending) ? TransactionStatus.Pending
                : statuses.includes(TransactionStatus.Completed) ? TransactionStatus.Completed : TransactionStatus.Failed } }
        },
        {
            refreshInterval: latest => latest?.data?.status === TransactionStatus.Pending ? 2000 : 0,
            dedupingInterval: 1000,
            keepPreviousData: false,
            shouldRetryOnError: true,
            errorRetryInterval: 2000,
        },
    )
    return { hashes, status: error ? undefined : data?.data?.status }
}
