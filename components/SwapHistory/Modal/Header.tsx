import LayerSwapApiClient from "../../../lib/layerSwapApiClient"
import IconButton from "../../buttons/iconButton"
import { RefreshCcw } from 'lucide-react'
import { useCallback, useMemo } from "react"
import { useSWRConfig } from "swr"
import { unstable_serialize } from "swr/infinite"
import useWallet from "../../../hooks/useWallet"
import toast from "react-hot-toast"

type Props = {
    statuses: string | number;
    title: string;
    loadExplorerSwaps: boolean;
    setRefreshing: (value: boolean) => void
}

const getSwapsKey = (statuses: string | number) => (index) =>
    `/swaps?page=${index + 1}&status=${statuses}&version=${LayerSwapApiClient.apiVersion}`

const getExplorerKey = (addresses: string[]) => (index) => {
    if (!addresses?.[index])
        return null;
    return `/explorer/${addresses[index]}?version=${LayerSwapApiClient.apiVersion}`
}

const Header = ({ statuses, title, loadExplorerSwaps, setRefreshing }: Props) => {
    const { wallets } = useWallet()
    const addresses = wallets.map(w => w.address)
    const { mutate } = useSWRConfig()

    const getKey = useMemo(() => getSwapsKey(statuses), [statuses])
    const getFromExplorerKey = useMemo(() => getExplorerKey(addresses), [addresses])

    const handleRefresh = useCallback(async () => {
        setRefreshing(true)
        try {
            await mutate(unstable_serialize(getKey))
            if (loadExplorerSwaps)
                await mutate(unstable_serialize(getFromExplorerKey))
        }
        catch (e) {
            toast.error(e.message)
        }
        finally {
            setRefreshing(false)
        }
    }, [getKey, loadExplorerSwaps])

    return <div className="flex space-x-2 text-center">
        <h2 className="font-normal text-center tracking-tight mt-1">
            {title}
        </h2>
        <IconButton onClick={handleRefresh} icon={
            <RefreshCcw className="h-6 w-6" />
        }>
        </IconButton>
    </div>
}

export default Header