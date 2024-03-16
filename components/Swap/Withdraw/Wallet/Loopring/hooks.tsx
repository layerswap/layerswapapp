import useSWR from "swr";
import * as lp from "@loopring-web/loopring-sdk";
import { LoopringAPI } from "../../../../../lib/loopring/LoopringAPI";

const fetcher = (url) => fetch(url).then((res) => res.json());

export const useLoopringAccountBalance = (accountId?: number) => {
    const url = `${LoopringAPI.BaseApi}${lp.LOOPRING_URLs.GET_USER_EXCHANGE_BALANCES}?accountId=${accountId}`
    const { data, isLoading } =
        useSWR<[lp.UserBalanceInfo]>(accountId ? url : null,
            fetcher);

    return { data, isLoading }
}

export const useLoopringAccount = ({ address }: { address?: `0x${string}` }) => {
    const url = `${LoopringAPI.BaseApi}${lp.LOOPRING_URLs.ACCOUNT_ACTION}?owner=${address}`
    const { data: accountData, isLoading, mutate } =
        useSWR<lp.AccountInfo>(address ? url : null,
            fetcher,
            {
                refreshInterval: (latestData) => latestData?.frozen ? 3000 : 0
            });
    const noAccount = (accountData as any)?.resultInfo?.code == 101002
    const account = noAccount ? undefined : accountData

    return { account, isLoading, noAccount, mutate }
}

export const useLoopringFees = (accountId?: number) => {
    const url = `${LoopringAPI.BaseApi}${lp.LOOPRING_URLs.GET_OFFCHAIN_FEE_AMT}?accountId=${accountId}&requestType=${lp.OffchainFeeReqType.UPDATE_ACCOUNT}`
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
            fetcher);

    return { data, isLoading }
}



export const useActivationData = (accountId?: number) => {
    const { data: loopringBalnce, isLoading: lpBalanceIsLoading } = useLoopringAccountBalance(accountId)
    const { data: feeData, isLoading: feeDataIsLoading } = useLoopringFees(accountId)

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