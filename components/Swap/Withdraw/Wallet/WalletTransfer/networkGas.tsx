import { FC } from "react"
import { Network, Token } from "../../../../../Models/Network"
import { useBalancesState } from "../../../../../context/balances"
import { truncateDecimals } from "../../../../utils/RoundDecimals"
import { Fuel } from "lucide-react"

type NetworkGasProps = {
    network: Network,
    token: Token,
}
const NetworkGas: FC<NetworkGasProps> = ({ token, network }) => {

    const { gases, isGasLoading } = useBalancesState()
    const networkGas = network.name ?
        gases?.[network.name]?.find(g => g?.token === token.symbol)?.gas : null

    if (!networkGas)
        return <></>

    const estimatedGas = (networkGas && token) ?
        truncateDecimals(networkGas, token.precision)
        : truncateDecimals(networkGas, token?.precision)

    return <div className="flex flex-row items-center gap-1 w-full text-sm px-1 mb-2.5 justify-end">
        <Fuel className="h-4 w-4 text-secondary-text" />
        <p className="text-secondary-text">Estimated gas:</p>
        <div className="text-right flex items-center gap-1">
            {isGasLoading ? <div className='h-[10px] w-10 bg-gray-500 rounded-sm animate-pulse' /> : estimatedGas} <span>{token?.symbol}</span>
        </div>
    </div>
}

export default NetworkGas