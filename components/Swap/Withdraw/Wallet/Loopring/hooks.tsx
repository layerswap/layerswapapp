import useSWR from "swr";
import { LoopringAPI } from "../../../../../lib/loopring/LoopringAPI";
import { AccountInfo, LOOPRING_URLs, OffchainFeeReqType, UserBalanceInfo } from "../../../../../lib/loopring/defs";

const fetcher = (url) => fetch(url).then((res) => res.json());

export const useLoopringAccountBalance = (accountId?: number) => {
    const url = `${LoopringAPI.BaseApi}${LOOPRING_URLs.GET_USER_EXCHANGE_BALANCES}?accountId=${accountId}`
    const { data, isLoading } =
        useSWR<[UserBalanceInfo]>(accountId ? url : null,
            fetcher);

    return { data, isLoading }
}

export const useLoopringAccount = ({ address }: { address?: `0x${string}` }) => {
    const url = `${LoopringAPI.BaseApi}${LOOPRING_URLs.ACCOUNT_ACTION}?owner=${address}`
    const { data: accountData, isLoading, mutate } =
        useSWR<AccountInfo>(address ? url : null,
            fetcher,
            {
                dedupingInterval: 1000,
                refreshInterval: (latestData) => latestData?.frozen ? 3000 : 0
            });
    const noAccount = (accountData as any)?.resultInfo?.code == 101002
    const account = noAccount ? undefined : accountData

    return { account, isLoading, noAccount, mutate }
}

const useAccountActivationFees = (accountId?: number) => {
    const url = `${LoopringAPI.BaseApi}${LOOPRING_URLs.GET_OFFCHAIN_FEE_AMT}?accountId=${accountId}&requestType=${OffchainFeeReqType.UPDATE_ACCOUNT}`
    const { data, isLoading } =
        useSWR<{
            fees: {
                token: string,
                tokenId: number,
                fee: string,
                discount: number
            }[],
            gasPrice: string
        }>(accountId ? url : null,
            fetcher, { dedupingInterval: 1000 });

    return { data, isLoading }
}



export const useActivationData = (accountId?: number) => {
    const { data: loopringBalnce, isLoading: lpBalanceIsLoading } = useLoopringAccountBalance(accountId)
    const { data: feeData, isLoading: feeDataIsLoading } = useAccountActivationFees(accountId)

    const availableBalances = feeData && loopringBalnce?.filter(b => {
        const tfee = feeData?.fees?.find(f => f.tokenId === b.tokenId)?.fee
        return Number(b.total) >= Number(tfee)
    })

    const defaultValue = availableBalances?.[0]

    return {
        availableBalances,
        defaultValue,
        loading: lpBalanceIsLoading || feeDataIsLoading,
        feeData
    }
}

export type FeeData = {
    fees: {
        token: string;
        tokenId: number;
        fee: string;
        discount: number;
    }[];
    gasPrice: string;
}