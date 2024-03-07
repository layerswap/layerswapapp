import { NetworkCurrency } from "../Models/CryptoNetwork"
import { Layer } from "../Models/Layer"
import { useBalancesState } from "../context/balances"

const GasDetails = ({ network, currency }: { network: string, currency: string }) => {

    const { gases } = useBalancesState()
    const networkGas = gases?.[network]?.find(g => g?.token === currency)

    if (!networkGas?.gasDetails) return

    return (
        <div className='grid grid-cols-1 gap-2 px-3 py-2 rounded-lg border-2 border-secondary-500 bg-secondary-800 mt-2 w-[350px] fixed top-0 left-2'>
            <div className="flex flex-row items-baseline justify-between">
                <label className="block text-left text-primary-text-placeholder">
                    Gas limit
                </label>
                <span className="text-right">
                    {
                        networkGas.gasDetails?.gasLimit
                    }
                </span>
            </div>
            <div className="flex flex-row items-baseline justify-between">
                <label className="block text-left text-primary-text-placeholder">
                    Gas price
                </label>
                <span className="text-right">
                    {
                        networkGas.gasDetails?.gasPrice
                    }
                </span>
            </div>
            <div className="flex flex-row items-baseline justify-between">
                <label className="block text-left text-primary-text-placeholder">
                    Max fee per gas
                </label>
                <span className="text-right">
                    {
                        networkGas.gasDetails?.maxFeePerGas
                    }
                </span>
            </div>
            <div className="flex flex-row items-baseline justify-between">
                <label className="block text-left text-primary-text-placeholder">
                    Max priority fee per gas
                </label>
                <span className="text-right">
                    {
                        networkGas.gasDetails?.maxPriorityFeePerGas
                    }
                </span>
            </div>
        </div>
    )
}

export default GasDetails