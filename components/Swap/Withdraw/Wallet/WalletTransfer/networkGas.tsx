import { FC } from "react"
import { NetworkCurrency } from "../../../../../Models/CryptoNetwork"
import { Layer } from "../../../../../Models/Layer"
import { useBalancesState } from "../../../../../context/balances"
import { truncateDecimals } from "../../../../utils/RoundDecimals"
import { Fuel } from "lucide-react"

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
        truncateDecimals(networkGas, source_native_currnecy?.precision)
        : truncateDecimals(networkGas, selected_currency?.precision)

    return <div className="flex flex-row items-center gap-1 w-full text-sm px-1 mb-2.5 justify-end">
        <Fuel className="h-4 w-4 text-secondary-text" />
        <p className="text-secondary-text">Estimated gas:</p>
        <div className="text-right flex items-center gap-1">
            {isGasLoading ? <div className='h-[10px] w-10 bg-gray-500 rounded-sm animate-pulse' /> : estimatedGas} <span>{network?.assets.find(a => a.is_native)?.asset ?? selected_currency.asset}</span>
        </div>
    </div>
}

export default NetworkGas