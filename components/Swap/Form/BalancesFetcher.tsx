import { useEffect, useState } from "react"
import { useBalancesState } from "../../../context/balances"
import { useSettingsState } from "../../../context/settings"
import useWallet from "../../../hooks/useWallet"
import useBalance from "../../../hooks/useBalance"

const Comp = () => {
    const { connectedWalletProviders } = useWallet()
    const { networks } = useSettingsState()
    const [fetching, setFetching] = useState<{ [address: string]: boolean }>({})
    const { fetchAllBalances } = useBalance()

    useEffect(() => {
        if (connectedWalletProviders.length > 0) {

            connectedWalletProviders.forEach(p => {
                const providerNetworks = networks.filter(n => p.autofillSupportedNetworks?.some(sn => sn.toLowerCase() === n.name.toLowerCase()))
                const address = p.getConnectedWallet()?.address
                if (address && !fetching[address]) {
                    setFetching(d => ({ ...d, [address]: true }))
                    fetchAllBalances(providerNetworks);
                }
            })
        }
    }, [connectedWalletProviders, fetching])

    return <></>
}

export default Comp;