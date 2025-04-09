import { useEffect, useMemo, useRef, useState } from "react"
import { useSWRConfig, preload } from "swr"
import useWallet from "./useWallet"
import { BalanceResolver } from "../lib/balances/balanceResolver"
import { useSettingsState } from "../context/settings"
import { NetworkBalance, TokenBalance } from "../Models/Balance"

const loadingState: { [key: string]: boolean } = {}

const useAllBalances = () => {
    const { mutate } = useSWRConfig()
    const { providers, wallets } = useWallet()
    const balanceResolver = new BalanceResolver()
    const { networks } = useSettingsState()
    const [loading, setLoading] = useState(false)
    const lockFetching = useRef(false)
    const addressesKey = useMemo(() => wallets.map(w => w.addresses).join(","), [wallets])

    useEffect(() => {
        setLoading(true)
        // getAllBalances()
    }, [addressesKey])

    async function getAllBalances() {
        lockFetching.current = true
        for (const provider of providers) {
            const address = provider.activeWallet?.address
            const providerNetworks = provider.withdrawalSupportedNetworks
            if (!address || !providerNetworks) continue
            if (loadingState[address]) continue
            loadingState[address] = true
            for (const network_name of providerNetworks) {
                const network = networks.find(n => n.name === network_name)
                if (!network) continue
                const key = `/balances/${address}/${network.name}`
                try {
                    const data = await balanceResolver.getBalance(network, address)
                    await mutate<NetworkBalance>(key, data)
                }
                catch (e) {
                    console.error(e)
                }
                await sleep(2000)
            }
        }
        setLoading(false)
        lockFetching.current = false
    }

    return { loading }
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default useAllBalances