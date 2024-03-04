import { FC } from "react"
import { NetworkCurrency } from "../../../../../Models/CryptoNetwork"
import { Layer } from "../../../../../Models/Layer"
import { useBalancesState } from "../../../../../context/balances"
import { truncateDecimals } from "../../../../utils/RoundDecimals"

type NetworkGasProps = {
    network: Layer,
    selected_currency: NetworkCurrency,
}
const NetworkGas: FC<NetworkGasProps> = ({ selected_currency, network }) => {

    const { gases, isGasLoading } = useBalancesState()
    const networkGas = network.internal_name ?
        gases?.[network.internal_name]?.find(g => g?.token === selected_currency.asset)?.gas : null

    if (!networkGas)
        return <></>

    const source_native_currnecy = network.assets.find(a => a.is_native)

    const estimatedGas = (networkGas && source_native_currnecy) ?
        truncateDecimals(networkGas * source_native_currnecy.usd_price, 2)
        : truncateDecimals(networkGas * selected_currency.usd_price, 2)

    return <div className="flex flex-row items-center justify-between w-full text-sm">
        <p className="text-secondary-text">Network fee</p>
        <div className="text-right flex items-center text-primary-actionButtonText">
            <span>$</span>{!~isGasLoading ? <div className='h-[10px] w-6 bg-gray-500 rounded-sm animate-pulse' /> : estimatedGas}
        </div>
    </div>
}

export default NetworkGas