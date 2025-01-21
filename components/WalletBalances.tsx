import { useEffect, useRef } from "react"
import { useSWRConfig } from "swr"
import useWallet from "../hooks/useWallet"
import { BalanceResolver } from "../lib/balances/balanceResolver"
import { useSettingsState } from "../context/settings"

const WalletBalances = () => {
    const { mutate } = useSWRConfig()
    const { providers, wallets } = useWallet()
    const balanceResolver = new BalanceResolver()
    const { networks } = useSettingsState()
    const lockFetching = useRef(false)

    useEffect(() => {
        if (!lockFetching.current) {
            getAllBalances()
        }
    }, [wallets])

    async function getAllBalances() {
        for (const provider of providers) {
            const address = provider.activeWallet?.address
            const providerNetworks = provider.withdrawalSupportedNetworks
            if (!address || !providerNetworks) continue
            for (const network_name of providerNetworks) {
                const network = networks.find(n => n.name === network_name)
                if (!network) continue 
                await mutate(`/balances/${address}/${network.name}`, async (data) => {
                    if (data) {
                        //console.log('balance available', address, network.name, data)
                        return data
                    }
                    //console.log('fetching balance', address, network)
                    try {
                        return await balanceResolver.getBalance(address, network)
                    } catch (e) {
                        //console.error('error fetching balance', address, network.name, e)
                        return null
                    }
                }, { revalidate: false })
            }
        }
        lockFetching.current = true
    }

    return <></>
}

export default WalletBalances